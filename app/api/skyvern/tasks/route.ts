import { NextRequest, NextResponse } from 'next/server';
import { getUserSkyvernTasks, getPendingNotifications, deleteSkyvernTaskRecord } from '@/lib/skyvern/tasks-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    
    // Get tasks
    const tasksResult = await getUserSkyvernTasks({
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      includeCompleted
    });
    
    if (!tasksResult.success) {
      return NextResponse.json(
        { success: false, error: tasksResult.error },
        { status: 400 }
      );
    }

    // Get notifications
    const notificationsResult = await getPendingNotifications();
    
    return NextResponse.json({
      success: true,
      tasks: tasksResult.tasks || [],
      notifications: notificationsResult.notifications || []
    });
  } catch (error) {
    console.error('❌ Error in Skyvern tasks API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const deleteNotifications = searchParams.get('deleteNotifications') === 'true';

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Missing task_id' }, { status: 400 });
    }

    const result = await deleteSkyvernTaskRecord(taskId, { deleteNotifications });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      deleted_count: result.deleted_count || 0,
      notifications_deleted: result.notifications_deleted || 0
    });
  } catch (error) {
    console.error('❌ Error in Skyvern tasks DELETE API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
