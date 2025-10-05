import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateAgentTaskAdmin, deleteAgentTask } from '@/lib/agent-tasks/tasks-db'
import { withRequestContext } from '@/lib/server/request-context'

/**
 * PATCH /api/agent-tasks/[taskId]
 * Update an existing task (for Save Changes functionality)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      )
    }
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, task_config, scheduled_for, priority, tags } = body

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (task_config !== undefined) updates.task_config = task_config
    if (scheduled_for !== undefined) updates.scheduled_for = scheduled_for
    if (priority !== undefined) updates.priority = priority
    if (tags !== undefined) updates.tags = tags

    // Update task using admin function
    const result = await updateAgentTaskAdmin(taskId, updates)

    if (!result.success || !result.task) {
      return NextResponse.json(
        { success: false, error: result.error || 'Task not found or update failed' },
        { status: 404 }
      )
    }

    console.log(`✅ Task updated: ${title || result.task.title} (${taskId})`)

    return NextResponse.json({
      success: true,
      task: result.task,
      message: 'Task updated successfully'
    })

  } catch (error) {
    console.error('Error in PATCH /api/agent-tasks/[taskId]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agent-tasks/[taskId]
 * Delete a task
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      )
    }
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete task using context-aware function
    const result = await withRequestContext(
      { userId: user.id },
      () => deleteAgentTask(taskId)
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete task' },
        { status: 500 }
      )
    }

    console.log(`🗑️ Task deleted: ${taskId}`)

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/agent-tasks/[taskId]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
