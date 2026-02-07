import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAgentTask } from '@/lib/agent-tasks/task-executor';
import { updateAgentTaskAdmin } from '@/lib/agent-tasks/tasks-db';

/**
 * POST - Execute a task immediately (manual execution)
 * 
 * This endpoint triggers immediate execution of a task using the real agent executor.
 * Unlike scheduled tasks, this runs synchronously and returns the result.
 */
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

    const { task_id } = await request.json();
    if (!task_id) {
      return NextResponse.json({ success: false, error: 'task_id is required' }, { status: 400 });
    }

    // Get the task details
    const { data: taskData, error: taskError } = await supabase
      .from('agent_tasks' as any)
      .select('*')
      .eq('task_id', task_id)
      .eq('user_id', user.id)
      .single();

    if (taskError || !taskData) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const task = taskData as any;

    // Check if task is already running
    if (task.status === 'running') {
      return NextResponse.json({ 
        success: false, 
        error: 'Task is already running' 
      }, { status: 409 });
    }

    console.log(`🚀 Manual execution requested for task: ${task.title} (${task_id})`);

    // Update task status to 'pending' to indicate it's queued for execution
    await updateAgentTaskAdmin(task_id, { 
      status: 'pending',
      error_message: null 
    });

    // Execute the task using the real agent executor
    // This uses Super Ankie (or configured agent) to process the task
    const executionResult = await executeAgentTask(task);

    console.log(`✅ Task execution completed:`, {
      task_id,
      success: executionResult.success,
      duration_ms: executionResult.execution_metadata?.duration_ms
    });

    // Return the result
    return NextResponse.json({
      success: executionResult.success,
      message: executionResult.success 
        ? 'Task executed successfully' 
        : 'Task execution failed',
      result: executionResult.result,
      error: executionResult.error,
      execution_metadata: executionResult.execution_metadata
    });

  } catch (error) {
    console.error('❌ Error executing task:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
