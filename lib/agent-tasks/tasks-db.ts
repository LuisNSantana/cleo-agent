/**
 * Multi-Agent Task Management System
 * Universal task creation, scheduling, and execution for all agents
 */

import { createClient } from '@/lib/supabase/server';
import { createGuestServerClient } from '@/lib/supabase/server-guest';
import { getCurrentUserId } from '@/lib/server/request-context';
import { createTaskNotification } from './notifications';

// Base task interface - updated to match current DB schema
export interface AgentTask {
  task_id: string; // Primary key in DB
  user_id: string;
  title: string;
  description: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  task_type: string;
  priority?: number; // New field
  task_config: Record<string, any>;
  context_data: Record<string, any>;
  // Note: schedule_config was removed from DB; keep runtime-only if needed elsewhere
  schedule_config?: Record<string, any>;
  scheduled_for?: string; // Existing field in DB (renamed from scheduled_at)
  scheduled_at?: string; // New field
  cron_expression?: string;
  timezone?: string;
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  result_data?: Record<string, any>;
  error_message?: string;
  execution_time_ms?: number;
  retry_count: number;
  max_retries?: number;
  last_retry_at?: string;
  notify_on_completion?: boolean;
  notify_on_failure?: boolean;
  notification_sent?: boolean;
  notification_sent_at?: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  next_run_at?: string;
  tags?: string[];
  id?: string; // Secondary UUID field
}

// Task execution history
export interface AgentTaskExecution {
  id: string;
  task_id: string;
  execution_number: number;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  agent_messages: Array<Record<string, any>>;
  tool_calls: Array<Record<string, any>>;
  result_data?: Record<string, any>;
  error_message?: string;
  error_stack?: string;
  execution_time_ms?: number;
  memory_usage_mb?: number;
}

export interface CreateAgentTaskInput {
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  title: string;
  description: string;
  task_type?: string;
  priority?: number;
  task_config?: Record<string, any>;
  context_data?: Record<string, any>;
  scheduled_at?: string;
  scheduled_for?: string; // Support both naming conventions
  cron_expression?: string;
  timezone?: string;
  max_retries?: number;
  notify_on_completion?: boolean;
  notify_on_failure?: boolean;
  tags?: string[];
}

// Task update input
export interface UpdateAgentTaskInput {
  status?: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  result_data?: Record<string, any>;
  error_message?: string;
  execution_time_ms?: number;
  retry_count?: number;
  notification_sent?: boolean;
}

// Filter options for listing tasks
export interface AgentTaskFilters {
  agent_id?: string;
  status?: string;
  task_type?: string;
  tags?: string[];
  priority_min?: number;
  priority_max?: number;
  created_after?: string;
  created_before?: string;
  include_completed?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create a new agent task
 */
export async function createAgentTask(
  taskData: CreateAgentTaskInput
): Promise<{ success: boolean; task?: AgentTask; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Handle scheduled date - ensure proper timezone conversion
    let scheduledDate = null;
    if (taskData.scheduled_at) {
      scheduledDate = taskData.scheduled_at;
      console.log('📅 Creating scheduled task:', {
        inputDate: taskData.scheduled_at,
        timezone: taskData.timezone,
        processedDate: scheduledDate
      });
    }

    const resolveAgentAvatar = (name?: string, avatar?: string) => {
      if (avatar && /\.(png|jpg|jpeg|gif|webp)$/i.test(avatar)) return avatar
      if (avatar && avatar.startsWith('/img/agents/')) return avatar
      const map: Record<string, string> = {
        'emma': '/img/agents/emma4.png',
        'wex': '/img/agents/wex4.png',
        'toby': '/img/agents/toby4.png',
        'peter': '/img/agents/peter4.png',
        'apu': '/img/agents/apu4.png',
        'ami': '/img/agents/ami4.png',
        'cleo': '/img/agents/logocleo4.png'
      }
      const key = (name || '').toLowerCase().trim()
      return map[key] || '/img/agents/logocleo4.png'
    }

    const avatarUrl = resolveAgentAvatar(taskData.agent_name, taskData.agent_avatar)

    // Normalize agent_id to built-in IDs when applicable (avoids UUID vs static id mismatch)
    const builtinIdByName: Record<string, string> = {
      'cleo': 'cleo-supervisor',
      'emma': 'emma-ecommerce',
      'ami': 'ami-creative',  // Keep consistent with existing tasks in DB
      'peter': 'peter-financial',
      'toby': 'toby-technical',
      'apu': 'apu-support',
  'wex': 'wex-intelligence'
    }
    const normalizeAgentId = (id: string, name?: string) => {
      // If already a known built-in id, keep it
      const knownIds = new Set(Object.values(builtinIdByName))
      if (knownIds.has(id)) return id
      // If name maps to a built-in id, use it
      const key = (name || '').toLowerCase().trim()
      if (key && builtinIdByName[key]) return builtinIdByName[key]
      // Otherwise, return the original id (custom agents etc.)
      return id
    }
    const normalizedAgentId = normalizeAgentId(taskData.agent_id, taskData.agent_name)

    const { data, error } = await supabase
      .from('agent_tasks' as any)
      .insert({
        user_id: userId,
        agent_id: normalizedAgentId,
        agent_name: taskData.agent_name,
        agent_avatar: avatarUrl,
        title: taskData.title,
        description: taskData.description,
        task_type: taskData.task_type || 'manual',
        priority: taskData.priority || 5,
        task_config: taskData.task_config || {},
        context_data: taskData.context_data || {},
        scheduled_at: scheduledDate, // Use consistent field name
        cron_expression: taskData.cron_expression,
        timezone: taskData.timezone || 'UTC',
        max_retries: taskData.max_retries || 0,
        notify_on_completion: taskData.notify_on_completion !== false,
        notify_on_failure: taskData.notify_on_failure !== false,
        tags: taskData.tags || [],
        status: scheduledDate ? 'scheduled' : 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating agent task:', error);
      return { success: false, error: error.message };
    }

    const createdTask = data as unknown as AgentTask;

    // Create notification for scheduled tasks
    if (createdTask.status === 'scheduled' && taskData.scheduled_at) {
      const scheduledDate = new Date(taskData.scheduled_at);
      const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: createdTask.timezone || 'UTC'
      })
      const formattedDate = formatter.format(scheduledDate)
      
      await createTaskNotification({
        user_id: createdTask.user_id,
        task_id: createdTask.task_id,
        agent_id: createdTask.agent_id,
        agent_name: createdTask.agent_name,
        agent_avatar: avatarUrl,
        notification_type: 'task_scheduled',
        title: `📅 Task Scheduled: ${createdTask.title}`,
        message: `Your task "${createdTask.title}" has been scheduled for ${formattedDate} and will be executed by ${createdTask.agent_name}.`,
        priority: 'low',
        metadata: {
          scheduled_for: taskData.scheduled_at,
          task_type: createdTask.task_type,
          timezone: createdTask.timezone || 'UTC'
        }
      }).catch(err => console.error('Failed to create scheduling notification:', err));
    }

    return { success: true, task: createdTask };
  } catch (error) {
    console.error('❌ Error in createAgentTask:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update an existing agent task
 */
export async function updateAgentTask(
  taskId: string,
  updates: UpdateAgentTaskInput
): Promise<{ success: boolean; task?: AgentTask; error?: string }> {
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
      .from('agent_tasks' as any)
      .update(updates)
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating agent task:', error);
      return { success: false, error: error.message };
    }

    return { success: true, task: data as unknown as AgentTask };
  } catch (error) {
    console.error('❌ Error in updateAgentTask:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get agent tasks with filtering
 */
export async function getAgentTasks(
  filters: AgentTaskFilters = {}
): Promise<{ success: boolean; tasks?: AgentTask[]; total?: number; error?: string }> {
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
      .from('agent_tasks' as any)
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.task_type) {
      query = query.eq('task_type', filters.task_type);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.priority_min) {
      query = query.gte('priority', filters.priority_min);
    }

    if (filters.priority_max) {
      query = query.lte('priority', filters.priority_max);
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    if (!filters.include_completed) {
      query = query.not('status', 'in', '(completed,failed,cancelled)');
    }

    // Order by priority and creation date
    query = query.order('priority', { ascending: false })
                 .order('created_at', { ascending: false });

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching agent tasks:', error);
      return { success: false, error: error.message };
    }

    return { success: true, tasks: (data || []) as unknown as AgentTask[], total: count || 0 };
  } catch (error) {
    console.error('❌ Error in getAgentTasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get a specific agent task
 */
export async function getAgentTask(
  taskId: string
): Promise<{ success: boolean; task?: AgentTask; error?: string }> {
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
      .from('agent_tasks' as any)
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching agent task:', error);
      return { success: false, error: error.message };
    }

    return { success: true, task: data as unknown as AgentTask };
  } catch (error) {
    console.error('❌ Error in getAgentTask:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete an agent task
 */
export async function deleteAgentTask(
  taskId: string
): Promise<{ success: boolean; deleted_count?: number; error?: string }> {
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
      .from('agent_tasks' as any)
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('❌ Error deleting agent task:', error);
      return { success: false, error: error.message };
    }

    const deleted_count = Array.isArray(data) ? data.length : 0;
    return { success: true, deleted_count };
  } catch (error) {
    console.error('❌ Error in deleteAgentTask:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get ready scheduled tasks (for the task scheduler)
 */
export async function getReadyScheduledTasks(): Promise<{ 
  success: boolean; 
  tasks?: AgentTask[]; 
  error?: string 
}> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // For now, use a simple query instead of the stored procedure
    const { data, error } = await supabase
      .from('agent_tasks' as any)
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching ready scheduled tasks:', error);
      return { success: false, error: error.message };
    }

    return { success: true, tasks: (data || []) as unknown as AgentTask[] };
  } catch (error) {
    console.error('❌ Error in getReadyScheduledTasks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Admin: Get ready scheduled tasks using service role (bypasses RLS)
 * SECURITY: This function now groups tasks by user_id to prevent cross-user execution
 */
export async function getReadyScheduledTasksAdmin(): Promise<{
  success: boolean;
  tasksByUser?: Record<string, AgentTask[]>;
  error?: string;
}> {
  try {
    const supabase = await createGuestServerClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('agent_tasks' as any)
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ [ADMIN] Error fetching ready scheduled tasks:', error);
      return { success: false, error: error.message };
    }

    // Group tasks by user_id to prevent cross-user execution
    const tasksByUser: Record<string, AgentTask[]> = {};
    (data || []).forEach((task: any) => {
      const agentTask = task as AgentTask;
      if (!tasksByUser[agentTask.user_id]) {
        tasksByUser[agentTask.user_id] = [];
      }
      tasksByUser[agentTask.user_id].push(agentTask);
    });

    return { success: true, tasksByUser };
  } catch (error) {
    console.error('❌ [ADMIN] Error in getReadyScheduledTasksAdmin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/** Admin: Update task status/data (service role) */
export async function updateAgentTaskAdmin(
  taskId: string,
  updates: UpdateAgentTaskInput
): Promise<{ success: boolean; task?: AgentTask; error?: string }> {
  try {
    const supabase = await createGuestServerClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('agent_tasks' as any)
      .update(updates)
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Error updating agent task:', error);
      return { success: false, error: error.message };
    }

    return { success: true, task: data as unknown as AgentTask };
  } catch (error) {
    console.error('❌ [ADMIN] Error in updateAgentTaskAdmin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/** Admin: Create task execution (service role) */
export async function createTaskExecutionAdmin(
  taskId: string,
  executionNumber: number
): Promise<{ success: boolean; execution?: AgentTaskExecution; error?: string }> {
  try {
    const supabase = await createGuestServerClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('agent_task_executions' as any)
      .insert({ task_id: taskId, status: 'running' })
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Error creating task execution:', error);
      return { success: false, error: error.message };
    }

    return { success: true, execution: data as unknown as AgentTaskExecution };
  } catch (error) {
    console.error('❌ [ADMIN] Error in createTaskExecutionAdmin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/** Admin: Update task execution (service role) */
export async function updateTaskExecutionAdmin(
  executionId: string,
  updates: Partial<AgentTaskExecution>
): Promise<{ success: boolean; execution?: AgentTaskExecution; error?: string }> {
  try {
    const supabase = await createGuestServerClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('agent_task_executions' as any)
      .update(updates)
      .eq('id', executionId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Error updating task execution:', error);
      return { success: false, error: error.message };
    }

    return { success: true, execution: data as unknown as AgentTaskExecution };
  } catch (error) {
    console.error('❌ [ADMIN] Error in updateTaskExecutionAdmin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create task execution record
 */
export async function createTaskExecution(
  taskId: string,
  executionNumber: number
): Promise<{ success: boolean; execution?: AgentTaskExecution; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('agent_task_executions' as any)
      .insert({ task_id: taskId, status: 'running' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating task execution:', error);
      return { success: false, error: error.message };
    }

    return { success: true, execution: data as unknown as AgentTaskExecution };
  } catch (error) {
    console.error('❌ Error in createTaskExecution:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update task execution record
 */
export async function updateTaskExecution(
  executionId: string,
  updates: Partial<AgentTaskExecution>
): Promise<{ success: boolean; execution?: AgentTaskExecution; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const { data, error } = await supabase
      .from('agent_task_executions' as any)
      .update(updates)
      .eq('id', executionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating task execution:', error);
      return { success: false, error: error.message };
    }

    return { success: true, execution: data as unknown as AgentTaskExecution };
  } catch (error) {
    console.error('❌ Error in updateTaskExecution:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
