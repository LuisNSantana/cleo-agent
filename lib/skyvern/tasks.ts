/**
 * Skyvern Tasks Management
 * Functions for tracking, monitoring, and managing Skyvern automation tasks
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/server/request-context';

export interface SkyvernTask {
  id: string;
  user_id: string;
  credential_id: string;
  skyvern_task_id: string; // Skyvern's task ID (like "run_123")
  task_type: string; // 'task' or 'workflow'
  prompt: string;
  target_url?: string;
  status: string; // created, queued, running, completed, failed, canceled
  output?: any; // JSONB
  error_message?: string;
  screenshots?: any; // JSONB - Array of screenshot URLs
  recording_url?: string;
  step_count: number;
  execution_time_seconds?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SkyvernTaskNotification {
  id: string;
  user_id: string;
  task_id: string;
  notification_type: string;
  message: string;
  sent_at: string;
}

/**
 * Create a new Skyvern task record
 */
export async function createSkyvernTaskRecord(taskData: {
  skyvern_task_id: string;
  credential_id: string;
  task_type: string;
  prompt: string;
  target_url?: string;
  recording_url?: string;
}): Promise<{ success: boolean; task?: SkyvernTask; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('skyvern_task_history')
      .insert({
        user_id: userId,
        credential_id: taskData.credential_id,
        skyvern_task_id: taskData.skyvern_task_id,
        task_type: taskData.task_type,
        prompt: taskData.prompt,
        target_url: taskData.target_url,
        recording_url: taskData.recording_url,
        status: 'created',
        step_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating Skyvern task record:', error);
      return { success: false, error: error.message };
    }

    return { success: true, task: data };
  } catch (error) {
    console.error('❌ Error in createSkyvernTaskRecord:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update Skyvern task status and data
 */
export async function updateSkyvernTaskRecord(
  taskId: string, 
  updates: {
    status?: string;
    result_data?: any;
    steps_count?: number;
    error_message?: string;
  }
): Promise<{ success: boolean; task?: SkyvernTask; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('skyvern_task_history')
      .update(updates)
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating Skyvern task record:', error);
      return { success: false, error: error.message };
    }

    return { success: true, task: data };
  } catch (error) {
    console.error('❌ Error in updateSkyvernTaskRecord:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get all Skyvern tasks for current user
 */
export async function getUserSkyvernTasks(
  options: {
    limit?: number;
    status?: string;
    includeCompleted?: boolean;
  } = {}
): Promise<{ success: boolean; tasks?: SkyvernTask[]; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    let query = supabase
      .from('skyvern_task_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (!options.includeCompleted) {
      query = query.not('status', 'in', '(completed,failed,terminated)');
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching Skyvern tasks:', error);
      return { success: false, error: error.message };
    }

    return { success: true, tasks: data || [] };
  } catch (error) {
    console.error('❌ Error in getUserSkyvernTasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get a specific Skyvern task
 */
export async function getSkyvernTaskRecord(
  taskId: string
): Promise<{ success: boolean; task?: SkyvernTask; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('skyvern_task_history')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching Skyvern task:', error);
      return { success: false, error: error.message };
    }

    return { success: true, task: data };
  } catch (error) {
    console.error('❌ Error in getSkyvernTaskRecord:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get pending notifications for current user
 */
export async function getPendingNotifications(): Promise<{ 
  success: boolean; 
  notifications?: SkyvernTaskNotification[]; 
  error?: string 
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // TODO: Implement notifications table in schema
    console.log('📋 Getting pending notifications for user:', userId);
    return { success: true, notifications: [] };
  } catch (error) {
    console.error('❌ Error in getPendingNotifications:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Mark notifications as read/processed
 */
export async function markNotificationsAsRead(
  notificationIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // For now, we'll just log this - in the future we can add a "read" field
    console.log('📬 Marking notifications as read:', notificationIds);

    return { success: true };
  } catch (error) {
    console.error('❌ Error in markNotificationsAsRead:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete old completed tasks (cleanup)
 */
export async function cleanupOldTasks(daysOld: number = 30): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('skyvern_task_history')
      .delete()
      .eq('user_id', userId)
      .in('status', ['completed', 'failed', 'terminated'])
      .lt('completed_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('❌ Error cleaning up old tasks:', error);
      return { success: false, error: error.message };
    }

    return { success: true, deletedCount: data?.length || 0 };
  } catch (error) {
    console.error('❌ Error in cleanupOldTasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
