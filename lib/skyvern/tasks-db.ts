/**
 * Skyvern Tasks Management
 * Functions for tracking, monitoring, and managing Skyvern automation tasks
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/server/request-context';

export interface SkyvernTask {
  id: string;
  user_id: string;
  task_id: string;
  title?: string;
  url: string;
  instructions: string;
  task_type: string;
  status: string;
  max_steps: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  live_url?: string;
  recording_url?: string;
  dashboard_url?: string;
  result_data?: any;
  steps_count: number;
  error_message?: string;
  notification_sent: boolean;
  notification_sent_at?: string;
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
  task_id: string;
  title?: string;
  url: string;
  instructions: string;
  task_type: string;
  max_steps: number;
  live_url?: string;
  recording_url?: string;
  dashboard_url?: string;
}): Promise<{ success: boolean; task?: any; error?: string }> {
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
      .from('skyvern_tasks' as any)
      .insert({
        user_id: userId,
        task_id: taskData.task_id,
        title: taskData.title || `Automation: ${new URL(taskData.url).hostname}`,
        url: taskData.url,
        instructions: taskData.instructions,
        task_type: taskData.task_type,
        max_steps: taskData.max_steps,
        live_url: taskData.live_url,
        recording_url: taskData.recording_url,
        dashboard_url: taskData.dashboard_url,
        status: 'queued'
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
): Promise<{ success: boolean; task?: any; error?: string }> {
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
      .from('skyvern_tasks' as any)
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
): Promise<{ success: boolean; tasks?: any[]; error?: string }> {
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
      .from('skyvern_tasks' as any)
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
): Promise<{ success: boolean; task?: any; error?: string }> {
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
      .from('skyvern_tasks' as any)
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
  notifications?: any[]; 
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

    const { data, error } = await supabase
      .from('skyvern_task_notifications' as any)
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notifications: data || [] };
  } catch (error) {
    console.error('❌ Error in getPendingNotifications:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a notification for a Skyvern task
 */
export async function createSkyvernTaskNotification(notificationData: {
  task_id: string;
  notification_type: 'task_completed' | 'task_failed' | 'task_started' | 'task_progress';
  message: string;
}): Promise<{ success: boolean; notification?: any; error?: string }> {
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
      .from('skyvern_task_notifications' as any)
      .insert({
        user_id: userId,
        task_id: notificationData.task_id,
        notification_type: notificationData.notification_type,
        message: notificationData.message,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating Skyvern task notification:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Skyvern task notification created successfully');
    return { success: true, notification: data };
  } catch (error) {
    console.error('❌ Error in createSkyvernTaskNotification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
