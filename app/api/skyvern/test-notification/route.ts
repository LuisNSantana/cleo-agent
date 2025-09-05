import { NextRequest, NextResponse } from 'next/server'
import { createSkyvernTaskNotification } from '@/lib/skyvern/tasks-db'
import { getCurrentUserId } from '@/lib/server/request-context'

export async function POST(request: NextRequest) {
  try {
    const userId = getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Create a test notification
    const result = await createSkyvernTaskNotification({
      task_id: `test-task-${Date.now()}`,
      notification_type: 'task_completed',
      message: '🎉 Test automation completed successfully! Your task has been finished.'
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully',
      notification: result.notification
    })
  } catch (error) {
    console.error('❌ Error creating test notification:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
