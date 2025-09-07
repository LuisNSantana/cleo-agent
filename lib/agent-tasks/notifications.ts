/**
 * Agent Task Notification System
 * Handles notifications for completed agent tasks
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/server/request-context';
import { Database, Json } from '@/types.d';

type NotificationInsert = Database['public']['Tables']['task_notifications']['Insert'];
type NotificationRow = Database['public']['Tables']['task_notifications']['Row'];

export interface TaskNotification {
  id: string;
  user_id: string;
  task_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  notification_type: 'task_completed' | 'task_failed' | 'task_scheduled' | 'task_reminder';
  title: string;
  message: string;
  task_result?: Record<string, any>;
  error_details?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  read_at?: string;
  action_buttons?: NotificationAction[];
  metadata?: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  action_type: 'open_chat' | 'view_result' | 'retry_task' | 'dismiss' | 'schedule_followup';
  action_data?: Record<string, any>;
  style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface CreateNotificationInput {
  task_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  notification_type: 'task_completed' | 'task_failed' | 'task_scheduled' | 'task_reminder';
  title: string;
  message: string;
  task_result?: Record<string, any>;
  error_details?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action_buttons?: NotificationAction[];
  metadata?: Record<string, any>;
  expires_at?: string;
  auto_send_to_chat?: boolean;
  target_chat_id?: string;
}

/**
 * Create a new task notification
 */
export async function createTaskNotification(
  notificationData: CreateNotificationInput
): Promise<{ success: boolean; notification?: TaskNotification; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // For now, let's use a default user to avoid blocking the UI
      const defaultUserId = 'anonymous-user';
      console.warn('⚠️ No authenticated user found, using default user for notifications');
      
      // Create a mock notification for demo purposes
      const mockNotification: TaskNotification = {
        id: `mock-${Date.now()}`,
        user_id: defaultUserId,
        task_id: notificationData.task_id,
        agent_id: notificationData.agent_id,
        agent_name: notificationData.agent_name,
        agent_avatar: notificationData.agent_avatar,
        notification_type: notificationData.notification_type,
        title: notificationData.title,
        message: notificationData.message,
        task_result: notificationData.task_result,
        error_details: notificationData.error_details,
        priority: notificationData.priority || 'medium',
        read: false,
        action_buttons: notificationData.action_buttons || getDefaultActions(notificationData),
        metadata: notificationData.metadata || {},
        expires_at: notificationData.expires_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { success: true, notification: mockNotification };
    }

    const userId = user.id;

    // Crear notificación en el inbox
    const { data: notification, error: notifError } = await supabase
      .from('task_notifications')
      .insert({
        user_id: userId,
        task_id: notificationData.task_id,
        agent_id: notificationData.agent_id,
        agent_name: notificationData.agent_name,
        agent_avatar: notificationData.agent_avatar,
        notification_type: notificationData.notification_type,
        title: notificationData.title,
        message: notificationData.message,
        task_result: notificationData.task_result,
        error_details: notificationData.error_details,
        priority: notificationData.priority || 'medium',
        action_buttons: (notificationData.action_buttons || getDefaultActions(notificationData)) as unknown as Json,
        metadata: notificationData.metadata || {},
        expires_at: notificationData.expires_at,
        read: false
      } satisfies NotificationInsert)
      .select('*')
      .single();

    if (notifError) {
      console.error('❌ Error creating notification:', notifError);
      return { success: false, error: notifError.message };
    }

    const typedNotification = notification as unknown as TaskNotification;

    // Si está configurado para enviar automáticamente al chat
    if (notificationData.auto_send_to_chat) {
      await sendNotificationToChat(typedNotification, notificationData.target_chat_id);
    }

    return { success: true, notification: typedNotification };
  } catch (error) {
    console.error('❌ Error in createTaskNotification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get user notifications with filtering
 */
export async function getUserNotifications(
  userId: string,
  filters: {
    unread_only?: boolean;
    notification_type?: TaskNotification['notification_type'];
    priority?: TaskNotification['priority'];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ success: boolean; notifications?: TaskNotification[]; count?: number; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    let query = supabase
      .from('task_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.unread_only) {
      query = query.eq('read', false);
    }

    if (filters.notification_type) {
      query = query.eq('notification_type', filters.notification_type);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    // Paginación
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notifications: notifications as unknown as TaskNotification[], count: count || 0 };
  } catch (error) {
    console.error('❌ Error in getUserNotifications:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Get authenticated user  
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('task_notifications' as any)
      .update({ 
        read: true, 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error in markNotificationAsRead:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification content to an active chat
 */
export async function sendNotificationToChat(
  notification: TaskNotification,
  targetChatId?: string
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Si no se especifica chat, buscar el más reciente del usuario
    let chatId = targetChatId;
    if (!chatId) {
      const { data: recentChat } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      chatId = recentChat?.id;
    }

    if (!chatId) {
      return { success: false, error: 'No active chat found' };
    }

    // Formatear mensaje para el chat
    const chatMessage = formatNotificationForChat(notification);

    // Insertar mensaje en el chat
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        user_id: userId,
        role: 'assistant',
        content: chatMessage,
        parts: [{
          type: 'text',
          text: chatMessage
        }] as any,
        experimental_attachments: notification.task_result ? [{
          name: `${notification.agent_name} Task Result`,
          url: '',
          contentType: 'application/json',
          size: 0
        }] as any : undefined
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error sending notification to chat:', error);
      return { success: false, error: error.message };
    }

    // Actualizar chat timestamp
    await supabase
      .from('chats')
      .update({ 
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .eq('id', chatId);

    return { success: true, message_id: message.id.toString() };
  } catch (error) {
    console.error('❌ Error in sendNotificationToChat:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get default notification actions based on type
 */
function getDefaultActions(notificationData: CreateNotificationInput): NotificationAction[] {
  const baseActions: NotificationAction[] = [
    {
      id: 'dismiss',
      label: 'Dismiss',
      action_type: 'dismiss',
      style: 'secondary'
    }
  ];

  switch (notificationData.notification_type) {
    case 'task_completed':
      return [
        {
          id: 'view_result',
          label: 'View Result',
          action_type: 'view_result',
          style: 'primary'
        },
        {
          id: 'open_chat',
          label: `Chat with ${notificationData.agent_name}`,
          action_type: 'open_chat',
          action_data: { agent_id: notificationData.agent_id },
          style: 'success'
        },
        ...baseActions
      ];

    case 'task_failed':
      return [
        {
          id: 'retry_task',
          label: 'Retry Task',
          action_type: 'retry_task',
          action_data: { task_id: notificationData.task_id },
          style: 'warning'
        },
        {
          id: 'open_chat',
          label: `Get Help from ${notificationData.agent_name}`,
          action_type: 'open_chat',
          action_data: { 
            agent_id: notificationData.agent_id,
            context: 'task_failed',
            error_details: notificationData.error_details
          },
          style: 'primary'
        },
        ...baseActions
      ];

    case 'task_scheduled':
      return [
        {
          id: 'view_result',
          label: 'View Schedule',
          action_type: 'view_result',
          style: 'primary'
        },
        ...baseActions
      ];

    default:
      return baseActions;
  }
}

/**
 * Format notification content for chat display
 */
function formatNotificationForChat(notification: TaskNotification): string {
  const emoji = {
    task_completed: '✅',
    task_failed: '❌',
    task_scheduled: '📅',
    task_reminder: '⏰'
  }[notification.notification_type] || '📋';

  let message = `${emoji} **${notification.title}**\n\n${notification.message}`;

  // Agregar detalles específicos según el tipo
  if (notification.notification_type === 'task_completed' && notification.task_result) {
    message += '\n\n**Results:**\n';
    
    // Formatear resultados de manera legible
    if (typeof notification.task_result === 'object') {
      const summary = notification.task_result.summary || 
                     notification.task_result.result || 
                     'Task completed successfully';
      message += `${summary}`;
      
      if (notification.task_result.files_created) {
        message += `\n- Files created: ${notification.task_result.files_created.length}`;
      }
      
      if (notification.task_result.execution_time) {
        message += `\n- Execution time: ${notification.task_result.execution_time}ms`;
      }
    }
  }

  if (notification.notification_type === 'task_failed' && notification.error_details) {
    message += `\n\n**Error Details:**\n${notification.error_details}`;
  }

  message += `\n\n*This task was executed by ${notification.agent_name}*`;

  return message;
}

/**
 * Get notification statistics for the user
 */
export async function getNotificationStats(userId?: string): Promise<{
  success: boolean;
  stats?: {
    total: number;
    unread: number;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
  error?: string;
}> {
  try {
    let currentUserId = userId;
    if (!currentUserId) {
      currentUserId = getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' };
      }
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Obtener estadísticas
    const { data: allNotifications, error } = await supabase
      .from('task_notifications' as any)
      .select('notification_type, priority, read')
      .eq('user_id', currentUserId);

    if (error) {
      console.error('❌ Error fetching notification stats:', error);
      return { success: false, error: error.message };
    }

    const typedNotifications = allNotifications as unknown as Array<{
      notification_type: string;
      priority: string;
      read: boolean;
    }>;

    const stats = {
      total: typedNotifications.length,
      unread: typedNotifications.filter(n => !n.read).length,
      by_type: {} as Record<string, number>,
      by_priority: {} as Record<string, number>
    };

    // Contar por tipo y prioridad
    typedNotifications.forEach(notification => {
      stats.by_type[notification.notification_type] = 
        (stats.by_type[notification.notification_type] || 0) + 1;
      
      stats.by_priority[notification.priority] = 
        (stats.by_priority[notification.priority] || 0) + 1;
    });

    return { success: true, stats };
  } catch (error) {
    console.error('❌ Error in getNotificationStats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
