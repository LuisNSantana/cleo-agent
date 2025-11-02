/**
 * Stream modes for flexible graph execution output
 * Inspired by LangGraph's streaming capabilities
 */

export type StreamMode = 
  | 'values'      // Full state after each step
  | 'updates'     // Only node updates
  | 'messages'    // LLM token streaming
  | 'custom'      // Custom data from nodes
  | 'checkpoints' // Checkpoint events
  | 'tasks'       // Task lifecycle events
  | 'debug';      // Detailed debug info

export interface StreamEvent<T = any> {
  event: string;
  data: T;
  name?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StreamWriter {
  write(data: unknown, metadata?: Record<string, any>): void;
}

export class StreamManager {
  private modes: Set<StreamMode>;
  private listeners: Map<StreamMode, Array<(event: StreamEvent) => void>> = new Map();

  constructor(modes: StreamMode | StreamMode[] = ['updates']) {
    this.modes = new Set(Array.isArray(modes) ? modes : [modes]);
  }

  /**
   * Emit an event to all listeners for enabled modes
   */
  emit(mode: StreamMode, event: string, data: any, metadata?: Record<string, any>): void {
    if (!this.modes.has(mode)) return;

    const streamEvent: StreamEvent = {
      event,
      data,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const modeListeners = this.listeners.get(mode) || [];
    for (const listener of modeListeners) {
      try {
        listener(streamEvent);
      } catch (error) {
        console.error(`Error in stream listener for mode ${mode}:`, error);
      }
    }
  }

  /**
   * Subscribe to events for a specific mode
   */
  on(mode: StreamMode, listener: (event: StreamEvent) => void): () => void {
    if (!this.listeners.has(mode)) {
      this.listeners.set(mode, []);
    }
    
    this.listeners.get(mode)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(mode);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Check if a mode is enabled
   */
  isEnabled(mode: StreamMode): boolean {
    return this.modes.has(mode);
  }

  /**
   * Create a StreamWriter for custom mode
   */
  createWriter(): StreamWriter {
    return {
      write: (data: unknown, metadata?: Record<string, any>) => {
        this.emit('custom', 'custom_data', data, metadata);
      },
    };
  }

  /**
   * Emit state value update
   */
  emitStateValue(state: any, nodeName?: string): void {
    this.emit('values', 'state_value', state, { node: nodeName });
  }

  /**
   * Emit node update
   */
  emitNodeUpdate(nodeName: string, update: any): void {
    this.emit('updates', 'node_update', update, { node: nodeName });
  }

  /**
   * Emit checkpoint event
   */
  emitCheckpoint(checkpoint: any, metadata?: any): void {
    this.emit('checkpoints', 'checkpoint_saved', checkpoint, metadata);
  }

  /**
   * Emit task start event
   */
  emitTaskStart(taskId: string, taskName: string, input: any): void {
    this.emit('tasks', 'task_start', { taskId, taskName, input });
  }

  /**
   * Emit task completion event
   */
  emitTaskComplete(taskId: string, taskName: string, output: any, duration: number): void {
    this.emit('tasks', 'task_complete', { taskId, taskName, output, duration });
  }

  /**
   * Emit task error event
   */
  emitTaskError(taskId: string, taskName: string, error: Error): void {
    this.emit('tasks', 'task_error', { 
      taskId, 
      taskName, 
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    });
  }

  /**
   * Emit debug information
   */
  emitDebug(category: string, data: any): void {
    this.emit('debug', `debug_${category}`, data);
  }

  /**
   * Emit LLM token (for messages mode)
   */
  emitToken(token: string, metadata?: Record<string, any>): void {
    this.emit('messages', 'llm_token', { token }, metadata);
  }

  /**
   * Get all enabled modes
   */
  getEnabledModes(): StreamMode[] {
    return Array.from(this.modes);
  }
}

/**
 * Create a stream manager with common mode configurations
 */
export function createStreamManager(
  modes?: StreamMode | StreamMode[]
): StreamManager {
  return new StreamManager(modes);
}

/**
 * Common stream mode presets
 */
export const StreamModePresets = {
  DEFAULT: ['updates'] as StreamMode[],
  VERBOSE: ['values', 'updates', 'tasks', 'checkpoints'] as StreamMode[],
  DEBUG: ['values', 'updates', 'tasks', 'checkpoints', 'debug'] as StreamMode[],
  PRODUCTION: ['updates', 'checkpoints'] as StreamMode[],
  TOKENS: ['messages'] as StreamMode[],
} as const;
