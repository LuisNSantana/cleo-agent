import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get the task to verify ownership and current status
    const { data: taskData, error: taskError } = await supabase
      .from('agent_tasks' as any)
      .select('*')
      .eq('task_id', task_id)
      .eq('user_id', user.id)
      .single();

    if (taskError || !taskData) {
      console.error('Error fetching task for retry:', taskError);
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const task = taskData as any;

    // Only allow retry for failed or cancelled tasks
    if (!['failed', 'cancelled'].includes(task.status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Can only retry failed or cancelled tasks' 
      }, { status: 400 });
    }

    // Reset task status to pending for retry
    const { data: updateData, error: updateError } = await supabase
      .from('agent_tasks' as any)
      .update({
        status: 'pending',
        error_message: null,
        result_data: null,
        execution_time_ms: null,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', task_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating task for retry:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to retry task' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task has been reset to pending status and will be retried',
      task_id: task_id
    });

  } catch (error) {
    console.error('Error in retry task endpoint:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
