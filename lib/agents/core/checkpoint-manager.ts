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
 */
export class SupabaseCheckpointSaver implements CheckpointSaver {
  constructor(private supabase: SupabaseClient) {}

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

    // Get current user from request context for RLS
    const userId = getCurrentUserId();
    if (!userId) {
      console.warn('⚠️ No userId in request context, checkpoint save may fail due to RLS');
    }

    const row = {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpoint.id,
      parent_checkpoint_id: parentCheckpointId || null,
      type: 'checkpoint',
      checkpoint: checkpoint,
      metadata: metadata,
      user_id: userId, // Required for RLS policy
      created_at: new Date().toISOString(),
    };

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
