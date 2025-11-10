import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUserId } from '@/lib/server/request-context';

export interface RunnableConfig {
  configurable: {
    thread_id: string;
    checkpoint_ns?: string;
    checkpoint_id?: string;
  };
  [key: string]: any;
}

export interface Checkpoint {
  v: number; // Version
  id: string;
  ts: string; // ISO timestamp
  channel_values: Record<string, any>; // Graph state
  channel_versions: Record<string, number>;
  versions_seen: Record<string, Record<string, number>>;
  pending_sends?: Array<[string, any]>;
}

export interface CheckpointMetadata {
  source: 'input' | 'loop' | 'update';
  step: number;
  writes: Record<string, any> | null;
  parents: Record<string, string>;
}

export interface CheckpointTuple {
  config: RunnableConfig;
  checkpoint: Checkpoint;
  metadata: CheckpointMetadata;
  parent_config?: RunnableConfig;
  pending_writes?: Array<[string, string, any]>;
}

export interface StateSnapshot<T = any> {
  values: T; // Current state values
  next: string[]; // Next nodes to execute
  config: RunnableConfig;
  metadata: CheckpointMetadata | null;
  created_at: string | null;
  parent_config: RunnableConfig | null;
  tasks: PregelTask[];
}

export interface PregelTask {
  id: string;
  name: string;
  error?: string | null;
  interrupts: Array<{ value: any; when: string }>;
}

export interface CheckpointFilter {
  before?: RunnableConfig;
  limit?: number;
  filter?: Record<string, any>;
}

/**
 * Base interface for checkpoint persistence
 */
export interface CheckpointSaver {
  getTuple(config: RunnableConfig): Promise<CheckpointTuple | null>;
  putTuple(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig>;
  list(
    config: RunnableConfig,
    filter?: CheckpointFilter
  ): AsyncIterableIterator<CheckpointTuple>;
}

/**
 * Supabase implementation of CheckpointSaver
 * Uses admin client to bypass RLS (checkpoints are system data, not user data)
 */
export class SupabaseCheckpointSaver implements CheckpointSaver {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Derive user_id from thread_id for auditing
   * Thread IDs follow patterns:
   * - Direct mode: {agentId}_direct
   * - Supervised: cleo-supervisor_supervised  
   * - Delegations: delegation_{timestamp}_{random}
   * - Regular: UUID from agent_threads table
   */
  private async deriveUserIdFromThread(threadId: string): Promise<string | null> {
    try {
      // First, try to find in agent_threads table
      const { data, error } = await this.supabase
        .from('agent_threads')
        .select('user_id')
        .eq('id', threadId)
        .single();

      if (!error && data?.user_id) {
        return data.user_id;
      }

      // Fallback: check if we have userId in AsyncLocalStorage
      const contextUserId = getCurrentUserId();
      if (contextUserId) {
        return contextUserId;
      }

      // If all fails, return null (will be logged as system-initiated)
      console.warn(`⚠️ Could not derive user_id for thread: ${threadId}`);
      return null;
    } catch (error) {
      console.error('Error deriving user_id from thread:', error);
      return null;
    }
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | null> {
    const threadId = config.configurable.thread_id;
    const checkpointNs = config.configurable.checkpoint_ns || '';
    const checkpointId = config.configurable.checkpoint_id;

    let query = this.supabase
      .from('checkpoints')
      .select('*')
      .eq('thread_id', threadId)
      .eq('checkpoint_ns', checkpointNs);

    if (checkpointId) {
      query = query.eq('checkpoint_id', checkpointId);
    } else {
      query = query.order('checkpoint_id', { ascending: false }).limit(1);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return this._rowToTuple(row);
  }

  async putTuple(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable.thread_id;
    const checkpointNs = config.configurable.checkpoint_ns || '';
    const parentCheckpointId = config.configurable.checkpoint_id;

    // ✅ ROBUST: Derive user_id from thread for auditing
    // Admin client bypasses RLS, but we still want proper user attribution
    const userId = await this.deriveUserIdFromThread(threadId);

    const row = {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpoint.id,
      parent_checkpoint_id: parentCheckpointId || null,
      type: 'checkpoint',
      checkpoint: checkpoint,
      metadata: metadata,
      user_id: userId, // Derived from thread or context, can be null for system operations
      created_at: new Date().toISOString(),
    };

    // ✅ ADMIN CLIENT: Bypasses RLS, no policy violations
    const { error } = await this.supabase.from('checkpoints').upsert(row);

    if (error) {
      console.error('❌ Failed to save checkpoint:', error);
      throw error;
    }

    return {
      ...config,
      configurable: {
        ...config.configurable,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async *list(
    config: RunnableConfig,
    filter?: CheckpointFilter
  ): AsyncIterableIterator<CheckpointTuple> {
    const threadId = config.configurable.thread_id;
    const checkpointNs = config.configurable.checkpoint_ns || '';

    let query = this.supabase
      .from('checkpoints')
      .select('*')
      .eq('thread_id', threadId)
      .eq('checkpoint_ns', checkpointNs)
      .order('checkpoint_id', { ascending: false });

    if (filter?.before) {
      const beforeId = filter.before.configurable.checkpoint_id;
      if (beforeId) {
        query = query.lt('checkpoint_id', beforeId);
      }
    }

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to list checkpoints:', error);
      return;
    }

    if (data) {
      for (const row of data) {
        yield this._rowToTuple(row);
      }
    }
  }

  private _rowToTuple(row: any): CheckpointTuple {
    return {
      config: {
        configurable: {
          thread_id: row.thread_id,
          checkpoint_ns: row.checkpoint_ns,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint: row.checkpoint,
      metadata: row.metadata,
      parent_config: row.parent_checkpoint_id
        ? {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_ns: row.checkpoint_ns,
              checkpoint_id: row.parent_checkpoint_id,
            },
          }
        : undefined,
    };
  }
}

/**
 * In-memory checkpoint saver for development/testing
 */
export class InMemoryCheckpointSaver implements CheckpointSaver {
  private storage: Map<string, CheckpointTuple> = new Map();

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | null> {
    const key = this._makeKey(config);
    return this.storage.get(key) || null;
  }

  async putTuple(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const newConfig = {
      ...config,
      configurable: {
        ...config.configurable,
        checkpoint_id: checkpoint.id,
      },
    };

    const key = this._makeKey(newConfig);
    this.storage.set(key, {
      config: newConfig,
      checkpoint,
      metadata,
      parent_config: config.configurable.checkpoint_id ? config : undefined,
    });

    return newConfig;
  }

  async *list(
    config: RunnableConfig,
    filter?: CheckpointFilter
  ): AsyncIterableIterator<CheckpointTuple> {
    const threadId = config.configurable.thread_id;
    const checkpointNs = config.configurable.checkpoint_ns || '';
    
    const tuples = Array.from(this.storage.values())
      .filter(t => 
        t.config.configurable.thread_id === threadId &&
        (t.config.configurable.checkpoint_ns || '') === checkpointNs
      )
      .sort((a, b) => b.checkpoint.id.localeCompare(a.checkpoint.id));

    let count = 0;
    for (const tuple of tuples) {
      if (filter?.limit && count >= filter.limit) break;
      
      if (filter?.before) {
        const beforeId = filter.before.configurable.checkpoint_id;
        if (beforeId && tuple.checkpoint.id >= beforeId) continue;
      }

      yield tuple;
      count++;
    }
  }

  private _makeKey(config: RunnableConfig): string {
    const { thread_id, checkpoint_ns = '', checkpoint_id = 'latest' } = config.configurable;
    return `${thread_id}:${checkpoint_ns}:${checkpoint_id}`;
  }
}
