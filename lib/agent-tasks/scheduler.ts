/**
 * Agent Task Scheduler
 * Background service that processes scheduled tasks and executes them
 */

import { getReadyScheduledTasksAdmin, updateAgentTaskAdmin, createTaskExecutionAdmin, updateTaskExecutionAdmin } from './tasks-db';
import { executeAgentTask } from './task-executor';
import type { AgentTask } from './tasks-db';

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
      if (!result.success || !result.tasksByUser) {
        console.error('❌ Failed to fetch scheduled tasks:', result.error);
        return;
      }

      const tasksByUser = result.tasksByUser;
      const totalTasks = Object.values(tasksByUser).reduce((sum, tasks) => sum + tasks.length, 0);
      console.log(`📋 Found ${totalTasks} ready tasks for ${Object.keys(tasksByUser).length} users`);

      if (totalTasks === 0) {
        return;
      }

      // Process tasks grouped by user to maintain user context isolation
      for (const [userId, userTasks] of Object.entries(tasksByUser)) {
        console.log(`👤 Processing ${userTasks.length} tasks for user ${userId}`);
        await this.processUserTasks(userId, userTasks);
      }

      console.log(`✅ Processed ${totalTasks} scheduled tasks`);
    } catch (error) {
      console.error('❌ Error in task scheduler:', error);
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
    }
  }

  /**
   * Process tasks for a specific user
   */
  private async processUserTasks(userId: string, userTasks: AgentTask[]): Promise<void> {
    // Process tasks sequentially for this user to maintain proper context
    for (const task of userTasks) {
      await this.processTask(task);
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: AgentTask): Promise<void> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    
    try {
      console.log(`🔄 Processing task: ${task.title} (${task.agent_name})`);
      this.stats.tasksProcessed++;

      // Update task status to running
	await updateAgentTaskAdmin(task.task_id, {
        status: 'running',
        started_at: startedAt,
        last_run_at: startedAt,
        error_message: null,
        result_data: null
      });

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
            retry_count: task.retry_count || 0,
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
          console.log(`✅ Task completed: ${task.title}`);
        } else {
          throw new Error(result.error || 'Task execution failed');
        }

      } catch (executionError) {
        const executionTime = Date.now() - startTime;
        const finishedAt = new Date().toISOString();
        const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown error';
        
        // Update task as failed
	await updateAgentTaskAdmin(task.task_id, {
          status: 'failed',
          retry_count: (task.retry_count || 0) + 1,
          execution_time_ms: executionTime,
          error_message: errorMessage,
          last_retry_at: finishedAt,
          completed_at: finishedAt
        });

        // Update execution record
	await updateTaskExecutionAdmin(execution.id, {
          status: 'failed',
          error_message: errorMessage,
          execution_time_ms: executionTime,
          completed_at: finishedAt
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
