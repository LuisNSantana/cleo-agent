import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createTaskNotification,
  getUserNotifications,
  markNotificationAsRead,
  sendNotificationToChat,
  getNotificationStats,
  type CreateNotificationInput
} from '@/lib/agent-tasks/notifications';

// GET - List user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Check if requesting stats
    if (searchParams.get('stats') === 'true') {
      const result = await getNotificationStats(user.id);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        stats: result.stats
      });
    }

    // Parse filters
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unread_only = searchParams.get('unread_only') === 'true';
    const nt = searchParams.get('notification_type') as
      | 'task_completed'
      | 'task_failed' 
      | 'task_scheduled'
      | 'task_reminder'
      | undefined;

    const filters = {
      limit,
      offset,
      unread_only,
      notification_type: nt ?? undefined,
      priority: searchParams.get('priority') as 'low' | 'medium' | 'high' | 'urgent' | undefined
    };

    const result = await getUserNotifications(user.id, filters);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      total: result.count || 0,
      filters
    });
  } catch (error) {
    console.error('❌ Error in GET /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new notification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }
    const body = await request.json();
    
    const notificationData: CreateNotificationInput = {
      user_id: user.id,
      task_id: body.task_id,
      agent_id: body.agent_id,
      agent_name: body.agent_name,
      agent_avatar: body.agent_avatar,
      notification_type: body.notification_type,
      title: body.title,
      message: body.message,
      task_result: body.task_result,
      error_details: body.error_details,
      priority: body.priority || 'medium',
      action_buttons: body.action_buttons,
      metadata: body.metadata,
      expires_at: body.expires_at,
      auto_send_to_chat: body.auto_send_to_chat,
      target_chat_id: body.target_chat_id
    };

    const result = await createTaskNotification(notificationData);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: result.notification
    });
  } catch (error) {
    console.error('❌ Error in POST /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update notification (mark as read, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id, action, target_chat_id } = body;

    if (!notification_id) {
      return NextResponse.json(
        { success: false, error: 'notification_id is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'mark_read':
        const readResult = await markNotificationAsRead(notification_id);
        if (!readResult.success) {
          return NextResponse.json(
            { success: false, error: readResult.error },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true });

      case 'send_to_chat':
        // Necesitamos obtener la notificación primero: fetch for this user
        {
          const supabase = await createClient();
          if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
          }
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
          }

          const notifResult = await getUserNotifications(user.id, { limit: 1000 });
        if (!notifResult.success) {
          return NextResponse.json(
            { success: false, error: notifResult.error },
            { status: 400 }
          );
        }

          const notification = notifResult.notifications?.find(n => n.id === notification_id);
          if (!notification) {
            return NextResponse.json(
              { success: false, error: 'Notification not found' },
              { status: 404 }
            );
          }

          const chatResult = await sendNotificationToChat(notification, target_chat_id, user.id);
          if (!chatResult.success) {
            return NextResponse.json(
              { success: false, error: chatResult.error },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            message_id: chatResult.message_id
          });
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Error in PATCH /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
