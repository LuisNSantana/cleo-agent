/**
 * Skyvern Task Polling Service
 * Automatically checks task status every 5 minutes and sends notifications
 */

import { createClient } from '@/lib/supabase/server';
import { getSkyvernCredentials, getDecryptedSkyvernApiKey } from './credentials';
import { updateSkyvernTaskRecord, createSkyvernTaskNotification, SkyvernTask } from './tasks-db';
import { SkyvernClient } from './tools';

// Store polling intervals to prevent duplicates
const activePolling = new Map<string, NodeJS.Timeout>();

/**
 * Start polling for a specific task
 */
export async function startTaskPolling(taskId: string, userId: string): Promise<void> {
  // Prevent multiple polling for same task
  if (activePolling.has(taskId)) {
    console.log(`🔄 Task ${taskId} already being polled`);
    return;
  }

  console.log(`🚀 Starting polling for task ${taskId}`);

  // Poll every 5 minutes (300,000 ms)
  const interval = setInterval(async () => {
    await checkTaskStatus(taskId, userId);
  }, 5 * 60 * 1000);

  activePolling.set(taskId, interval);

  // Also check immediately
  await checkTaskStatus(taskId, userId);
}

/**
 * Stop polling for a specific task
 */
export function stopTaskPolling(taskId: string): void {
  const interval = activePolling.get(taskId);
  if (interval) {
    clearInterval(interval);
    activePolling.delete(taskId);
    console.log(`⏹️ Stopped polling for task ${taskId}`);
  }
}

/**
 * Check the status of a single task
 */
async function checkTaskStatus(taskId: string, userId: string): Promise<void> {
  try {
    console.log(`🔍 Checking status for task ${taskId}`);

    // Get user credentials
    const credentialsResult = await getSkyvernCredentials(userId);
    if (!credentialsResult.success || !credentialsResult.credentials?.length) {
      console.error(`❌ No credentials found for user ${userId}`);
      stopTaskPolling(taskId);
      return;
    }

    const credential = credentialsResult.credentials[0];
    const keyResult = await getDecryptedSkyvernApiKey(userId, credential.id);
    if (!keyResult.success || !keyResult.apiKey) {
      console.error(`❌ Failed to get API key for user ${userId}`);
      stopTaskPolling(taskId);
      return;
    }

    // Create Skyvern client and check task status
    const client = new SkyvernClient(keyResult.apiKey, keyResult.baseUrl!, keyResult.organizationId);
    const taskResult = await client.getTask(taskId);

    if (!taskResult.success) {
      console.error(`❌ Failed to get task ${taskId}: ${taskResult.error}`);
      return;
    }

    const currentStatus = taskResult.data?.request?.status;
    const stepsCount = taskResult.data?.steps?.length || 0;

    if (!currentStatus) {
      console.warn(`⚠️ No status found for task ${taskId}`);
      return;
    }

    console.log(`📊 Task ${taskId} status: ${currentStatus} (${stepsCount} steps)`);

    // Update task in database
    await updateSkyvernTaskRecord(taskId, {
      status: currentStatus,
      result_data: taskResult.data,
      steps_count: stepsCount
    });

    // Check if task is completed and send notification
    if (['completed', 'failed', 'terminated'].includes(currentStatus)) {
      await handleTaskCompletion(taskId, currentStatus);
      stopTaskPolling(taskId); // Stop polling for completed tasks
    }

  } catch (error) {
    console.error(`❌ Error checking task ${taskId}:`, error);
  }
}

/**
 * Handle task completion - send notification
 */
async function handleTaskCompletion(taskId: string, status: string): Promise<void> {
  try {
    console.log(`✅ Task ${taskId} completed with status: ${status}`);

    // Create appropriate notification
    const isSuccess = status === 'completed';
    const emoji = isSuccess ? '✅' : '❌';
    const action = isSuccess ? 'completed successfully' : `ended with status: ${status}`;
    
    const message = `${emoji} Skyvern automation ${action}!

📋 Task ID: ${taskId}
📹 Recording: https://app.skyvern.com/tasks/${taskId}/recording
📊 Dashboard: https://app.skyvern.com/tasks/${taskId}

${isSuccess ? 'Your automation completed successfully and results are ready for review.' : 'Please check the recording to see what happened.'}

Time: ${new Date().toLocaleString()}`;

    // Create notification
    await createSkyvernTaskNotification({
      task_id: taskId,
      notification_type: isSuccess ? 'task_completed' : 'task_failed',
      message: message
    });

    // Mark notification as sent in the tasks table
    const supabase = await createClient();
    if (supabase) {
      await supabase
        .from('skyvern_tasks' as any)
        .update({ 
          notification_sent: true, 
          notification_sent_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('task_id', taskId);
    }

    console.log(`📬 Notification sent for task ${taskId}`);

  } catch (error) {
    console.error(`❌ Error handling completion for task ${taskId}:`, error);
  }
}

/**
 * Start polling for all active tasks for a user
 */
export async function startPollingUserTasks(userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    // Get all active tasks (not completed) for the user
    const { data: activeTasks } = await supabase
      .from('skyvern_tasks' as any)
      .select('task_id, status')
      .eq('user_id', userId)
      .not('status', 'in', '(completed,failed,terminated)')
      .eq('notification_sent', false);

    if (activeTasks && activeTasks.length > 0) {
      console.log(`🔄 Starting polling for ${activeTasks.length} active tasks for user ${userId}`);
      
      for (const task of activeTasks as any[]) {
        await startTaskPolling(task.task_id, userId);
      }
    }

  } catch (error) {
    console.error(`❌ Error starting polling for user ${userId}:`, error);
  }
}

/**
 * Stop all polling for a user
 */
export function stopPollingUserTasks(userId: string): void {
  // This is a simplified version - in a real implementation you'd track tasks by user
  console.log(`⏹️ Stopping all polling for user ${userId}`);
}

/**
 * Check status of all active tasks (can be called periodically)
 */
export async function checkAllActiveTasks(): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    // Get all active tasks across all users
    const { data: activeTasks } = await supabase
      .from('skyvern_tasks' as any)
      .select('task_id, user_id, status')
      .not('status', 'in', '(completed,failed,terminated)')
      .eq('notification_sent', false);

    if (activeTasks && activeTasks.length > 0) {
      console.log(`🔍 Checking ${activeTasks.length} active tasks`);
      
      for (const task of activeTasks as any[]) {
        // Check if not already polling
        if (!activePolling.has(task.task_id)) {
          await startTaskPolling(task.task_id, task.user_id);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking all active tasks:', error);
  }
}

/**
 * Initialize polling system
 */
export function initializeTaskPolling(): void {
  console.log('🚀 Initializing Skyvern task polling system');
  
  // Check all active tasks immediately
  checkAllActiveTasks();
  
  // Set up periodic check for new tasks every 2 minutes
  setInterval(() => {
    checkAllActiveTasks();
  }, 2 * 60 * 1000);
  
  console.log('✅ Task polling system initialized');
}

/**
 * Get polling status
 */
export function getPollingStatus(): { 
  activePollingCount: number; 
  pollingTasks: string[] 
} {
  return {
    activePollingCount: activePolling.size,
    pollingTasks: Array.from(activePolling.keys())
  };
}
