import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgentTask } from '@/lib/agent-tasks/task-executor'
import { updateAgentTaskAdmin, createTaskExecutionAdmin, updateTaskExecutionAdmin, getAgentTask } from '@/lib/agent-tasks/tasks-db'
import { withRequestContext } from '@/lib/server/request-context'

/**
 * POST /api/agent-tasks/[taskId]/execute
 * Execute a task immediately (Run Now / Retry functionality)
 */
export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const startTime = Date.now()
  
  try {
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

    // Get task from database using context-aware function
    const taskResult = await withRequestContext(
      { userId: user.id },
      () => getAgentTask(params.taskId)
    )

    if (!taskResult.success || !taskResult.task) {
      return NextResponse.json(
        { success: false, error: 'Task not found or unauthorized' },
        { status: 404 }
      )
    }

    const task = taskResult.task
    console.log(`🚀 Manual execution requested for task: ${task.title}`)

    // Update task status to running
    await updateAgentTaskAdmin(task.task_id, {
      status: 'running',
      started_at: new Date().toISOString(),
      last_run_at: new Date().toISOString(),
      error_message: null,
      result_data: null
    })

    // Create execution record
    const executionResult = await createTaskExecutionAdmin(task.task_id)
    if (!executionResult.success || !executionResult.execution) {
      throw new Error('Failed to create execution record')
    }

    const execution = executionResult.execution

    try {
      // Execute the task
      const result = await executeAgentTask(task)
      const executionTime = Date.now() - startTime
      const completedAt = result.execution_metadata?.end_time || new Date().toISOString()

      // Normalize result
      const normalizedResult = result.result || {}
      if (result.execution_metadata) {
        normalizedResult.execution_metadata = result.execution_metadata
      }

      const toolCalls = Array.isArray(result.tool_calls) ? result.tool_calls : []
      const agentMessages = Array.isArray(result.agent_messages) ? result.agent_messages : []

      if (result.success) {
        // Update task as completed
        await updateAgentTaskAdmin(task.task_id, {
          status: 'completed',
          result_data: normalizedResult,
          execution_time_ms: executionTime,
          completed_at: completedAt,
          last_run_at: completedAt,
          retry_count: 0,
          error_message: null
        })

        // Update execution record
        await updateTaskExecutionAdmin(execution.id, {
          status: 'completed',
          result_data: normalizedResult,
          execution_time_ms: executionTime,
          tool_calls: toolCalls,
          agent_messages: agentMessages,
          completed_at: completedAt
        })

        console.log(`✅ Task executed successfully: ${task.title} in ${executionTime}ms`)

        return NextResponse.json({
          success: true,
          result: normalizedResult,
          execution_time_ms: executionTime,
          message: 'Task executed successfully'
        })

      } else {
        // Task failed
        const errorMessage = result.error || 'Task execution failed'
        
        await updateAgentTaskAdmin(task.task_id, {
          status: 'failed',
          error_message: errorMessage,
          execution_time_ms: executionTime,
          completed_at: completedAt
        })

        await updateTaskExecutionAdmin(execution.id, {
          status: 'failed',
          error_message: errorMessage,
          execution_time_ms: executionTime,
          completed_at: completedAt
        })

        console.error(`❌ Task execution failed: ${task.title} - ${errorMessage}`)

        return NextResponse.json({
          success: false,
          error: errorMessage,
          execution_time_ms: executionTime
        }, { status: 500 })
      }

    } catch (executionError) {
      const executionTime = Date.now() - startTime
      const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown execution error'
      
      await updateAgentTaskAdmin(task.task_id, {
        status: 'failed',
        error_message: errorMessage,
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString()
      })

      await updateTaskExecutionAdmin(execution.id, {
        status: 'failed',
        error_message: errorMessage,
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString()
      })

      console.error(`❌ Task execution error: ${task.title}`, executionError)

      return NextResponse.json({
        success: false,
        error: errorMessage,
        execution_time_ms: executionTime
      }, { status: 500 })
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Error in POST /api/agent-tasks/[taskId]/execute:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}
