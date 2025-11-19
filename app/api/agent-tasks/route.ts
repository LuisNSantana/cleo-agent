import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRequestContext } from '@/lib/server/request-context';
import {
  createAgentTask,
  getAgentTasks,
  getAgentTask,
  updateAgentTask,
  deleteAgentTask,
  type CreateAgentTaskInput,
  type UpdateAgentTaskInput,
  type AgentTaskFilters
} from '@/lib/agent-tasks/tasks-db';
import type { AgentTaskStatus } from '@/lib/agent-tasks/types';
import { getScheduler } from '@/lib/agent-tasks/scheduler';
import { executeAgentTask } from '@/lib/agent-tasks/task-executor';
import { resolveAgentCanonicalKey } from '@/lib/agents/alias-resolver';
import { getAgentDisplayName } from '@/lib/agents/id-canonicalization';

// GET - List agent tasks with filtering
export async function GET(request: NextRequest) {
  try {
    // Ensure authenticated user and propagate context
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Helper to validate status
    const validateStatus = (status: string | null): AgentTaskStatus | undefined => {
      if (!status) return undefined;
      const validStatuses: AgentTaskStatus[] = ['pending', 'scheduled', 'running', 'completed', 'failed', 'cancelled'];
      return validStatuses.includes(status as AgentTaskStatus) ? (status as AgentTaskStatus) : undefined;
    };

    const filters: AgentTaskFilters = {
      agent_id: searchParams.get('agent_id') || undefined,
      status: validateStatus(searchParams.get('status')),
      task_type: searchParams.get('task_type') || undefined,
      priority_min: searchParams.get('priority_min') ? parseInt(searchParams.get('priority_min')!) : undefined,
      priority_max: searchParams.get('priority_max') ? parseInt(searchParams.get('priority_max')!) : undefined,
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
      include_completed: searchParams.get('include_completed') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Handle tags array
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filters.tags = tagsParam.split(',').map(tag => tag.trim());
    }

    // If task_id is provided, get specific task
    const taskId = searchParams.get('task_id');
    if (taskId) {
      const result = await withRequestContext({ userId: user.id }, async () => getAgentTask(taskId));
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        task: result.task
      });
    }

    // Otherwise, list tasks with filters
    const result = await withRequestContext({ userId: user.id }, async () => getAgentTasks(filters));
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      tasks: result.tasks || [],
      total: result.total || 0,
      filters
    });
  } catch (error) {
    console.error('❌ Error in agent tasks GET API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Create new agent task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, description' },
        { status: 400 }
      );
    }

    const rawAgentId = typeof body.agent_id === 'string' ? body.agent_id.trim() : '';
    const rawAgentName = typeof body.agent_name === 'string' ? body.agent_name.trim() : '';

    let resolvedAgentId = rawAgentId;
    if (!resolvedAgentId && rawAgentName) {
      // Allow passing only the agent name/alias
      resolvedAgentId = rawAgentName;
    }

    if (resolvedAgentId) {
      resolvedAgentId = await resolveAgentCanonicalKey(resolvedAgentId);
    }

    if (!resolvedAgentId) {
      resolvedAgentId = 'cleo-supervisor';
    }

    const resolvedAgentName = rawAgentName || getAgentDisplayName(resolvedAgentId) || 'Ankie';

    const taskData: CreateAgentTaskInput = {
      agent_id: resolvedAgentId,
      agent_name: resolvedAgentName,
      agent_avatar: body.agent_avatar,
      title: body.title,
      description: body.description,
      task_type: body.task_type || 'manual',
      priority: body.priority || 5,
      task_config: body.task_config || {},
      context_data: body.context_data || {},
      scheduled_at: body.scheduled_at,
      cron_expression: body.cron_expression,
      timezone: body.timezone || 'UTC',
      max_retries: body.max_retries || 0,
      notify_on_completion: body.notify_on_completion !== false,
      notify_on_failure: body.notify_on_failure !== false,
      tags: body.tags || []
    };

  const result = await withRequestContext({ userId: user.id }, async () => createAgentTask(taskData));
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // ✅ NEW: Execute manual tasks immediately (fire-and-forget)
    if (result.task?.task_type === 'manual' && result.task?.status === 'pending') {
      console.log(`⚡ Auto-executing manual task ${result.task.task_id} for user ${user.id}`);
      
      // Execute in background without blocking response
      withRequestContext({ userId: user.id }, async () => {
        try {
          await executeAgentTask(result.task!);
        } catch (error) {
          console.error(`❌ Failed to execute manual task ${result.task!.task_id}:`, error);
        }
      }).catch((err: unknown) => {
        console.error(`❌ Failed to set context for manual task ${result.task!.task_id}:`, err);
      });
    }

    // Auto-start scheduler in dev/runtime when creating a scheduled task
    try {
      if (result.task?.status === 'scheduled') {
        const scheduler = getScheduler();
        scheduler.start();
      }
    } catch (e) {
      console.warn('Scheduler auto-start skipped:', e);
    }

    return NextResponse.json({
      success: true,
      task: result.task,
      message: 'Agent task created successfully'
    });
  } catch (error) {
    console.error('❌ Error in agent tasks POST API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing agent task
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Missing task_id parameter' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: UpdateAgentTaskInput = {
      status: body.status,
      result_data: body.result_data,
      error_message: body.error_message,
      execution_time_ms: body.execution_time_ms,
      retry_count: body.retry_count,
      notification_sent: body.notification_sent
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof UpdateAgentTaskInput] === undefined) {
        delete updates[key as keyof UpdateAgentTaskInput];
      }
    });

  const result = await withRequestContext({ userId: user.id }, async () => updateAgentTask(taskId, updates));
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      task: result.task,
      message: 'Agent task updated successfully'
    });
  } catch (error) {
    console.error('❌ Error in agent tasks PUT API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete agent task
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Missing task_id parameter' },
        { status: 400 }
      );
    }

  const result = await withRequestContext({ userId: user.id }, async () => deleteAgentTask(taskId));
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: result.deleted_count || 0,
      message: 'Agent task deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in agent tasks DELETE API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
