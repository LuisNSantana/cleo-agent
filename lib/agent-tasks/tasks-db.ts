/**
 * Multi-Agent Task Management System
 * Universal task creation, scheduling, and execution for all agents
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createGuestServerClient } from '@/lib/supabase/server-guest';
import { getCurrentUserId } from '@/lib/server/request-context';
import { getAgentDisplayName } from '@/lib/agents/id-canonicalization';
import { createTaskNotification } from './notifications';
import type { Database } from '@/types.d';
import type {
  AgentTask,
  AgentTaskExecution,
  AgentTaskExecutionInsert,
  AgentTaskExecutionUpdate,
  AgentTaskInsert,
  AgentTaskUpdate,
  AgentTaskStatus
} from './types';
import type { JsonObject, JsonValue } from '@/types/json';

export type { AgentTask, AgentTaskExecution } from './types';

type TasksTables = Database['public']['Tables'] & {
  agent_tasks: {
    Row: AgentTask;
    Insert: AgentTaskInsert;
    Update: AgentTaskUpdate;
  };
  agent_task_executions: {
    Row: AgentTaskExecution;
    Insert: AgentTaskExecutionInsert;
    Update: AgentTaskExecutionUpdate;
  };
};

type TasksDatabase = Database & {
  public: Database['public'] & {
    Tables: TasksTables;
  };
};

type TasksSupabaseClient = SupabaseClient<TasksDatabase>;

export interface CreateAgentTaskInput {
  agent_id?: string;
  agent_name?: string;
  agent_avatar?: string;
  title: string;
  description: string;
  task_type?: string;
  priority?: number;
  task_config?: JsonObject | null;
  context_data?: JsonObject | null;
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
  status?: AgentTaskStatus;
  result_data?: JsonValue | null;
  error_message?: string | null;
  execution_time_ms?: number | null;
  retry_count?: number;
  notification_sent?: boolean;
  notification_sent_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_run_at?: string | null;
  last_retry_at?: string | null;
  next_run_at?: string | null;
}

// Filter options for listing tasks
export interface AgentTaskFilters {
  agent_id?: string;
  status?: AgentTaskStatus;
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

    const client = supabase as unknown as TasksSupabaseClient;

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
        'ankie': '/img/agents/ankie4.png',
        'cleo': '/img/agents/ankie4.png'  // Cleo was renamed to Ankie
      }
      const key = (name || '').toLowerCase().trim()
      return map[key] || '/img/agents/ankie4.png'  // Default to Ankie avatar
    }

    const DEFAULT_AGENT_ID = 'cleo-supervisor'
    const rawAgentId = (taskData.agent_id || '').trim()
    const fallbackAgentId = rawAgentId || DEFAULT_AGENT_ID

    const builtinIdByName: Record<string, string> = {
      'cleo': 'cleo-supervisor',
      'ankie': 'cleo-supervisor',       // ✅ Explicit map for Ankie
      'super ankie': 'cleo-supervisor', // ✅ Explicit map for "Super Ankie"
      'emma': 'emma-ecommerce',
      'ami': 'ami-creative',  // Keep consistent with existing tasks in DB
      'peter': 'peter-financial',
      'toby': 'toby-technical',
      'apu': 'apu-support',
      'wex': 'wex-intelligence'
    }
    const normalizeAgentId = (id: string, name?: string) => {
      const knownIds = new Set(Object.values(builtinIdByName))
      if (knownIds.has(id)) return id
      const idKey = id.toLowerCase().trim()
      if (idKey && builtinIdByName[idKey]) return builtinIdByName[idKey]
      const key = (name || '').toLowerCase().trim()
      if (key && builtinIdByName[key]) return builtinIdByName[key]
      return id
    }

    const rawAgentName = (taskData.agent_name || '').trim()
    const normalizedAgentId = normalizeAgentId(fallbackAgentId, rawAgentName || undefined)
    const agentName = rawAgentName || getAgentDisplayName(normalizedAgentId) || 'Ankie'
    const avatarUrl = resolveAgentAvatar(agentName, taskData.agent_avatar)

    const insertPayload = {
      user_id: userId,
      agent_id: normalizedAgentId,
      agent_name: agentName,
      agent_avatar: avatarUrl,
      title: taskData.title,
      description: taskData.description,
      task_type: taskData.task_type || 'manual',
      priority: taskData.priority ?? 5,
      task_config: taskData.task_config ?? {},
      context_data: taskData.context_data ?? {},
  scheduled_at: scheduledDate,
      cron_expression: taskData.cron_expression,
      timezone: taskData.timezone || 'UTC',
      max_retries: taskData.max_retries ?? 0,
      notify_on_completion: taskData.notify_on_completion !== false,
      notify_on_failure: taskData.notify_on_failure !== false,
      tags: taskData.tags ?? [],
      status: (scheduledDate ? 'scheduled' : 'pending') as AgentTaskStatus,
      retry_count: 0,
      notification_sent: false
    } satisfies AgentTaskInsert;

    const { data, error } = await client
      .from('agent_tasks')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error creating agent task:', error);
      return { success: false, error: error.message };
    }

  const createdTask = data;

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

    const client = supabase as unknown as TasksSupabaseClient;
    const { data, error } = await client
      .from('agent_tasks')
      .update(updates as AgentTaskUpdate)
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating agent task:', error);
      return { success: false, error: error.message };
    }

  return { success: true, task: data };
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

    const client = supabase as unknown as TasksSupabaseClient;

    let query = client
      .from('agent_tasks')
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

    if (typeof filters.priority_min === 'number') {
      query = query.gte('priority', filters.priority_min);
    }

    if (typeof filters.priority_max === 'number') {
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
    if (typeof filters.limit === 'number') {
      query = query.limit(filters.limit);
    }

    if (typeof filters.offset === 'number') {
      const limit = typeof filters.limit === 'number' ? filters.limit : 50;
      query = query.range(filters.offset, filters.offset + limit - 1);
    }

  const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching agent tasks:', error);
      return { success: false, error: error.message };
    }

  return { success: true, tasks: data ?? [], total: count ?? 0 };
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

    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_tasks')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching agent task:', error);
      return { success: false, error: error.message };
    }

  return { success: true, task: data };
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

    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_tasks')
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
    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_tasks')
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

  return { success: true, tasks: data ?? [] };
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

    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_tasks')
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
    for (const task of data ?? []) {
      if (!tasksByUser[task.user_id]) {
        tasksByUser[task.user_id] = [];
      }
      tasksByUser[task.user_id].push(task);
    }

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

    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_tasks')
      .update(updates as AgentTaskUpdate)
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Error updating agent task:', error);
      return { success: false, error: error.message };
    }

  return { success: true, task: data };
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
  taskId: string
): Promise<{ success: boolean; execution?: AgentTaskExecution; error?: string }> {
  try {
    const supabase = await createGuestServerClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const client = supabase as unknown as TasksSupabaseClient;
    const executionPayload = {
      task_id: taskId,
      status: 'running',
      started_at: new Date().toISOString()
    } satisfies AgentTaskExecutionInsert;

    const { data, error } = await client
      .from('agent_task_executions')
      .insert(executionPayload)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [ADMIN] Error creating task execution:', error);
      return { success: false, error: error.message };
    }

  return { success: true, execution: data };
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

    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_task_executions')
      .update(updates as AgentTaskExecutionUpdate)
      .eq('id', executionId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN] Error updating task execution:', error);
      return { success: false, error: error.message };
    }

  return { success: true, execution: data };
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
  taskId: string
): Promise<{ success: boolean; execution?: AgentTaskExecution; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    const client = supabase as unknown as TasksSupabaseClient;
    const executionPayload = {
      task_id: taskId,
      status: 'running',
      started_at: new Date().toISOString()
    } satisfies AgentTaskExecutionInsert;

    const { data, error } = await client
      .from('agent_task_executions')
      .insert(executionPayload)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error creating task execution:', error);
      return { success: false, error: error.message };
    }

  return { success: true, execution: data };
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

    const client = supabase as unknown as TasksSupabaseClient;

    const { data, error } = await client
      .from('agent_task_executions')
      .update(updates as AgentTaskExecutionUpdate)
      .eq('id', executionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating task execution:', error);
      return { success: false, error: error.message };
    }

  return { success: true, execution: data };
  } catch (error) {
    console.error('❌ Error in updateTaskExecution:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
