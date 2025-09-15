import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAgentTask } from '@/lib/agent-tasks/tasks-db';
import { createTaskNotification } from '@/lib/agent-tasks/notifications';

// POST - Execute a specific task (for testing/manual execution)
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

    const task = taskData as any; // Type assertion for now

    // Update task status to running
    await updateAgentTask(task_id, { status: 'running' });

    // Simulate task execution (replace with actual agent logic)
    const executionResult = await simulateTaskExecution(task);

    // Update task with result
    const updateData = {
      status: executionResult.success ? 'completed' : 'failed',
      result_data: executionResult.result,
      error_message: executionResult.error,
      execution_time_ms: executionResult.executionTime
    };

    await updateAgentTask(task_id, updateData as any);

    // Create completion notification
    await createTaskNotification({
      user_id: user.id,
      task_id: task.task_id,
      agent_id: task.agent_id,
      agent_name: task.agent_name,
      agent_avatar: task.agent_avatar,
      notification_type: executionResult.success ? 'task_completed' : 'task_failed',
      title: executionResult.success ? 
        `✅ Task Completed: ${task.title}` : 
        `❌ Task Failed: ${task.title}`,
      message: executionResult.success ?
        `Your task "${task.title}" has been completed successfully by ${task.agent_name}. ${executionResult.summary || ''}` :
        `Your task "${task.title}" failed during execution. Error: ${executionResult.error}`,
      priority: executionResult.success ? 'medium' : 'high',
      task_result: executionResult.result,
      error_details: executionResult.error,
      metadata: {
        execution_time_ms: executionResult.executionTime,
        task_type: task.task_type,
        agent_id: task.agent_id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Task executed successfully',
      result: executionResult
    });

  } catch (error) {
    console.error('❌ Error executing task:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Simulate task execution (replace with actual agent logic)
async function simulateTaskExecution(task: any): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  summary?: string;
}> {
  const startTime = Date.now();
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const executionTime = Date.now() - startTime;
  
  // 80% success rate for demo
  const success = Math.random() > 0.2;
  
  if (success) {
    return {
      success: true,
      result: {
        status: 'completed',
        output: `Task "${task.title}" executed successfully`,
        data: {
          processed_items: Math.floor(Math.random() * 100) + 1,
          agent_used: task.agent_name,
          timestamp: new Date().toISOString(),
          task_type: task.task_type
        }
      },
      executionTime,
      summary: `Processed ${Math.floor(Math.random() * 100) + 1} items successfully.`
    };
  } else {
    const errors = [
      'Network timeout while connecting to external service',
      'Invalid configuration parameters provided',
      'Rate limit exceeded on external API',
      'Authentication failed for external resource',
      'Data validation error in input parameters'
    ];
    
    return {
      success: false,
      error: errors[Math.floor(Math.random() * errors.length)],
      executionTime
    };
  }
}
