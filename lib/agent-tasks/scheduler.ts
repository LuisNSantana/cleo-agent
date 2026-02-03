/**
 * Agent Task Scheduler
 * Background service that processes scheduled tasks and executes them
 */

import { getReadyScheduledTasksAdmin, updateAgentTaskAdmin, createTaskExecutionAdmin, updateTaskExecutionAdmin } from './tasks-db';
import { executeAgentTask } from './task-executor';
import type { AgentTask } from './tasks-db';
import { isRetryableError } from '@/lib/resilience/retry';

function normalizeResultPayload(result: unknown): Record<string, any> {
  if (result === null || result === undefined) return {};
  if (typeof result === 'string') {
    return { summary: result };
  }
  if (Array.isArray(result)) {
    return { items: result };
  }
  if (typeof result === 'object') {
    return { ...(result as Record<string, any>) };
  }
  return { value: result };
}

export interface SchedulerStats {
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
  lastRunAt: Date;
  isRunning: boolean;
  lastSkipCount?: number; // Track consecutive skips to detect stuck locks
}

class AgentTaskScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: SchedulerStats = {
    tasksProcessed: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    lastRunAt: new Date(),
    isRunning: false
  };

  constructor(private intervalMs: number = 60000) {} // Default: check every minute

  /**
   * Start the task scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log('⚠️ Task scheduler is already running');
      return;
    }

    console.log('🚀 Starting agent task scheduler...');
    this.intervalId = setInterval(() => {
      this.processScheduledTasks();
    }, this.intervalMs);

    // Process immediately on start
    this.processScheduledTasks();
  }

  /**
   * Stop the task scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Task scheduler stopped');
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      runningTasks: 0, // Simple implementation
      runningTasksCount: 0,
      maxConcurrentTasks: 3
    };
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Cleanup stuck tasks that have been running for too long
   * This is a safety mechanism to prevent tasks from being stuck forever
   */
  async cleanupStuckTasks(): Promise<number> {
    try {
      console.log('🧹 Checking for stuck tasks...');
      
      // Import here to avoid circular dependencies
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
      const supabase = getSupabaseAdmin();
      
      const MAX_EXECUTION_TIME = 10 * 60 * 1000; // 10 minutes
      const cutoffTime = new Date(Date.now() - MAX_EXECUTION_TIME).toISOString();
      
      // Find tasks that have been "running" for more than MAX_EXECUTION_TIME
      // Use created_at as proxy since started_at might not be in database schema
      const { data: stuckTasks, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('status', 'running')
        .lt('created_at', cutoffTime);
      
      if (error) {
        console.error('❌ Error fetching stuck tasks:', error);
        return 0;
      }
      
      if (!stuckTasks || stuckTasks.length === 0) {
        console.log('✅ No stuck tasks found');
        return 0;
      }
      
      console.log(`⚠️ Found ${stuckTasks.length} stuck tasks, marking as failed...`);
      
      let cleaned = 0;
      for (const task of stuckTasks) {
        try {
          // Use created_at as fallback if started_at doesn't exist
          const startTime = new Date(task.created_at || Date.now());
          const runningTime = Date.now() - startTime.getTime();
          const runningMinutes = Math.floor(runningTime / 60000);
          
          await updateAgentTaskAdmin(task.id, {
            status: 'failed',
            error_message: `Task was stuck in running state for ${runningMinutes} minutes and was automatically cleaned up`,
            completed_at: new Date().toISOString(),
            execution_time_ms: runningTime
          });
          
          cleaned++;
          console.log(`🧹 Cleaned stuck task: ${task.title} (was running for ${runningMinutes} minutes)`);
        } catch (err) {
          console.error(`❌ Failed to clean task ${task.id}:`, err);
        }
      }
      
      console.log(`✅ Cleaned up ${cleaned}/${stuckTasks.length} stuck tasks`);
      return cleaned;
      
    } catch (error) {
      console.error('❌ Error in cleanupStuckTasks:', error);
      return 0;
    }
  }

  /**
   * Run a single cycle of task processing (for Vercel Cron / Serverless)
   * This is the public entry point for the stateless scheduler
   */
  public async runScheduledTasksCycle(): Promise<{ processed: number, succeeded: number, failed: number }> {
    // Stat trackers for this specific cycle
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    if (this.isRunning) {
      console.log('⚠️ Task processing in progress (in-memory lock), skipping cycle');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isRunning = true;
    this.stats.isRunning = true;
    this.stats.lastRunAt = new Date();

    try {
      // Run cleanup first
      await this.cleanupStuckTasks();
      
      console.log('🔍 [CRON] Checking for ready scheduled tasks...');
      
      const result = await getReadyScheduledTasksAdmin();
      if (!result.success || !result.tasksByUser) {
        console.error('❌ Failed to fetch scheduled tasks:', result.error);
        return { processed, succeeded, failed };
      }

      const tasksByUser = result.tasksByUser;
      const totalTasks = Object.values(tasksByUser).reduce((sum, tasks) => sum + tasks.length, 0);
      
      if (totalTasks === 0) {
        console.log('✅ No pending tasks found');
        return { processed, succeeded, failed };
      }

      console.log(`📋 [CRON] Found ${totalTasks} ready tasks`);

      // Process tasks
      for (const [userId, userTasks] of Object.entries(tasksByUser)) {
        await this.processUserTasks(userId, userTasks);
        processed += userTasks.length;
        // Note: processUserTasks doesn't return stats, we're approximating based on flow
        // The real stats are in this.stats, but those are global cumulative.
        // For this cycle return, we assume processed = total attempted.
      }
      
      // Update local cycle stats from the difference in global stats if needed, 
      // but for now roughly returning processed count is enough for logs.

    } catch (error) {
      console.error('❌ Error in task scheduler cycle:', error);
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
    }

    return { processed, succeeded: this.stats.tasksSucceeded, failed: this.stats.tasksFailed };
  }

  /**
   * Process scheduled tasks (Legacy / Interval internal method)
   */
  private async processScheduledTasks(): Promise<void> {
    await this.runScheduledTasksCycle();
  }

  /**
   * Process tasks for a specific user with parallel execution
   * OPTIMIZACIÓN: Procesar tasks en paralelo con límite de concurrencia
   */
  private async processUserTasks(userId: string, userTasks: AgentTask[]): Promise<void> {
    const BATCH_SIZE = 3 // Máximo 3 tasks simultáneas por usuario
    
    // Dividir tasks en chunks para procesamiento paralelo
    const chunks = this.chunkArray(userTasks, BATCH_SIZE)
    
    console.log(`⚡ Processing ${userTasks.length} tasks in ${chunks.length} batches (max ${BATCH_SIZE} concurrent)`)
    
    for (const chunk of chunks) {
      // Procesar chunk en paralelo
      await Promise.allSettled(chunk.map(task => this.processTask(task)))
      
      // Pequeña pausa entre batches para no saturar
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Process a single task with absolute timeout protection
   */
  private async processTask(task: AgentTask): Promise<void> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    
    // CRITICAL: Absolute max timeout for hierarchical multi-agent workflows
    // OPTIMIZATION: Reduced from 20min to 10min per LangGraph best practices
    // 10 minutes allows for 3-4 delegations with proper streaming feedback
    // For longer workflows, break into separate scheduled tasks
    const ABSOLUTE_MAX_TIMEOUT = 600_000; // 10 minutes max (optimized from 20min)
    
    try {
      console.log(`🔄 Processing task: ${task.title} (${task.agent_name})`);
      this.stats.tasksProcessed++;

      // Check if task has been retried too many times
      const MAX_RETRIES = 3;
      if ((task.retry_count || 0) >= MAX_RETRIES) {
        console.error(`❌ Task ${task.title} exceeded max retries (${MAX_RETRIES}), marking as failed`);
        await updateAgentTaskAdmin(task.task_id, {
          status: 'failed',
          error_message: `Maximum retry attempts (${MAX_RETRIES}) exceeded`,
          completed_at: new Date().toISOString()
        });
        this.stats.tasksFailed++;
        return;
      }

      // Update task status to running
      await updateAgentTaskAdmin(task.task_id, {
        status: 'running',
        started_at: startedAt,
        last_run_at: startedAt,
        error_message: null,
        result_data: null
      });

      // Create execution record
      const executionResult = await createTaskExecutionAdmin(task.task_id);
      if (!executionResult.success || !executionResult.execution) {
        throw new Error('Failed to create execution record');
      }

      const execution = executionResult.execution;

      try {
        // CRITICAL: Execute with absolute timeout protection
        const executionPromise = executeAgentTask(task);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Task execution exceeded absolute timeout of ${ABSOLUTE_MAX_TIMEOUT/1000}s`)), ABSOLUTE_MAX_TIMEOUT)
        );
        
        const result = await Promise.race([executionPromise, timeoutPromise]);
        const executionTime = Date.now() - startTime;
        const completedAt = result.execution_metadata?.end_time || new Date().toISOString();
        const normalizedResult = normalizeResultPayload(result.result);
        if (result.execution_metadata) {
          normalizedResult.execution_metadata = result.execution_metadata;
        }
        const toolCalls = Array.isArray(result.tool_calls) ? result.tool_calls : [];
        const agentMessages = Array.isArray(result.agent_messages) ? result.agent_messages : [];

        if (result.success) {
          // Update task as completed
          await updateAgentTaskAdmin(task.task_id, {
            status: 'completed',
            result_data: normalizedResult,
            execution_time_ms: executionTime,
            completed_at: completedAt,
            last_run_at: completedAt,
            retry_count: 0, // Reset retry count on success
            last_retry_at: null,
            error_message: null
          });

          // Update execution record
          await updateTaskExecutionAdmin(execution.id, {
            status: 'completed',
            result_data: normalizedResult,
            execution_time_ms: executionTime,
            tool_calls: toolCalls,
            agent_messages: agentMessages,
            completed_at: completedAt
          });

          this.stats.tasksSucceeded++;
          console.log(`✅ Task completed: ${task.title} in ${executionTime}ms`);
        } else {
          // Task returned unsuccessfully, throw to handle as failure
          throw new Error(result.error || 'Task execution failed');
        }

      } catch (executionError) {
        const executionTime = Date.now() - startTime;
        const finishedAt = new Date().toISOString();
        const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown error';
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
        
        console.error(`❌ Task execution error: ${task.title} - ${errorMessage}`);
        
        // Determine if should retry using intelligent error detection
        const currentRetries = task.retry_count || 0;
        const isRetryable = isRetryableError(executionError);
        const shouldRetry = currentRetries < MAX_RETRIES && !isTimeout && isRetryable;
        
        // Log retry decision
        if (!isRetryable) {
          console.log(`[Task Scheduler] Not retrying task ${task.task_id} - error is not transient (${errorMessage})`)
        }
        
        // Update task as failed
        await updateAgentTaskAdmin(task.task_id, {
          status: shouldRetry ? 'pending' : 'failed', // Retry if under limit
          retry_count: currentRetries + 1,
          execution_time_ms: executionTime,
          error_message: errorMessage,
          last_retry_at: finishedAt,
          completed_at: shouldRetry ? null : finishedAt // Only mark completed if not retrying
        });

        // Update execution record
        await updateTaskExecutionAdmin(execution.id, {
          status: 'failed',
          error_message: errorMessage,
          execution_time_ms: executionTime,
          completed_at: finishedAt
        });

        this.stats.tasksFailed++;
        
        if (shouldRetry) {
          console.log(`🔄 Task will retry (attempt ${currentRetries + 1}/${MAX_RETRIES}) in ${Math.pow(2, currentRetries)} minutes`);
        } else {
          console.error(`❌ Task permanently failed after ${currentRetries + 1} attempts: ${task.title}`);
        }
      }

    } catch (error) {
      // CRITICAL: Ensure task is ALWAYS marked as failed if we reach here
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Critical processing error';
      
      try {
        await updateAgentTaskAdmin(task.task_id, {
          status: 'failed',
          error_message: `Critical error: ${errorMessage}`,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString(),
          retry_count: (task.retry_count || 0) + 1
        });
      } catch (updateError) {
        console.error(`💥 Failed to update task status:`, updateError);
      }
      
      this.stats.tasksFailed++;
      console.error(`💥 Critical error processing task: ${task.title}`, error);
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Global scheduler instance
let globalScheduler: AgentTaskScheduler | null = null;

/**
 * Get or create the global scheduler instance
 */
export function getScheduler(): AgentTaskScheduler {
  if (!globalScheduler) {
    globalScheduler = new AgentTaskScheduler();
  }
  return globalScheduler;
}

/**
 * Start the global scheduler
 */
export function startScheduler(): void {
  getScheduler().start();
}

/**
 * Stop the global scheduler
 */
export function stopScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
  }
}

/**
 * Get scheduler stats
 */
export function getSchedulerStats(): SchedulerStats | null {
  return globalScheduler ? globalScheduler.getStats() : null;
}

/**
 * Manually trigger task processing (for testing)
 */
export async function triggerTaskProcessing(): Promise<void> {
  const scheduler = getScheduler();
  await (scheduler as any).processScheduledTasks();
}

export { AgentTaskScheduler };
export default AgentTaskScheduler;
