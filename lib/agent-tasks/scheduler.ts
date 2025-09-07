/**
 * Agent Task Scheduler
 * Background service that processes scheduled tasks and executes them
 */

import { getReadyScheduledTasksAdmin, updateAgentTaskAdmin, createTaskExecutionAdmin, updateTaskExecutionAdmin } from './tasks-db';
import { executeAgentTask } from './task-executor';
import { createTaskNotification } from './notifications';
import type { AgentTask } from './tasks-db';

export interface SchedulerStats {
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
  lastRunAt: Date;
  isRunning: boolean;
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
   * Process scheduled tasks
   */
  private async processScheduledTasks(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Task processing already in progress, skipping');
      return;
    }

    this.isRunning = true;
    this.stats.isRunning = true;
    this.stats.lastRunAt = new Date();

    try {
      console.log('🔍 Checking for ready scheduled tasks...');
      
  const result = await getReadyScheduledTasksAdmin();
      if (!result.success || !result.tasks) {
        console.error('❌ Failed to fetch scheduled tasks:', result.error);
        return;
      }

      const readyTasks = result.tasks;
      console.log(`📋 Found ${readyTasks.length} ready tasks`);

      if (readyTasks.length === 0) {
        return;
      }

      // Process tasks in parallel (with concurrency limit)
      const concurrencyLimit = 3;
      const chunks = this.chunkArray(readyTasks, concurrencyLimit);

      for (const chunk of chunks) {
        await Promise.all(chunk.map(task => this.processTask(task)));
      }

      console.log(`✅ Processed ${readyTasks.length} scheduled tasks`);
    } catch (error) {
      console.error('❌ Error in task scheduler:', error);
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: AgentTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing task: ${task.title} (${task.agent_name})`);
      this.stats.tasksProcessed++;

      // Update task status to running
  await updateAgentTaskAdmin(task.task_id, { status: 'running' });

      // Create execution record
  const executionResult = await createTaskExecutionAdmin(task.task_id, (task.retry_count || 0) + 1);
      if (!executionResult.success || !executionResult.execution) {
        throw new Error('Failed to create execution record');
      }

      const execution = executionResult.execution;

      try {
        // Execute the task using the agent
        const result = await executeAgentTask(task);
        const executionTime = Date.now() - startTime;

        if (result.success) {
          // Update task as completed
          await updateAgentTaskAdmin(task.task_id, {
            status: 'completed',
            result_data: result.result,
            execution_time_ms: executionTime
          });

          // Update execution record
          await updateTaskExecutionAdmin(execution.id, {
            status: 'completed',
            result_data: result.result,
            execution_time_ms: executionTime,
            tool_calls: result.tool_calls,
            agent_messages: result.agent_messages
          });

          this.stats.tasksSucceeded++;
          console.log(`✅ Task completed: ${task.title}`);
        } else {
          throw new Error(result.error || 'Task execution failed');
        }

      } catch (executionError) {
        const executionTime = Date.now() - startTime;
        
        // Update task as failed
  await updateAgentTaskAdmin(task.task_id, {
          status: 'failed',
          retry_count: (task.retry_count || 0) + 1,
          execution_time_ms: executionTime
        });

        // Update execution record
  await updateTaskExecutionAdmin(execution.id, {
          status: 'failed',
          error_message: executionError instanceof Error ? executionError.message : 'Unknown error',
          execution_time_ms: executionTime
        });

        this.stats.tasksFailed++;
        console.error(`❌ Task failed: ${task.title}`, executionError);
      }

    } catch (error) {
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
  if (globalScheduler) {
    await (globalScheduler as any).processScheduledTasks();
  }
}

export { AgentTaskScheduler };
export default AgentTaskScheduler;
