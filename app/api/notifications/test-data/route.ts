import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    // Create test notifications
    const testNotifications = [
      {
        user_id: user.id,
        task_id: 'task_' + Math.random().toString(36).substr(2, 9),
        agent_id: 'agent_' + Math.random().toString(36).substr(2, 9),
        agent_name: 'Emma AI Assistant',
        notification_type: 'task_completed',
        title: 'Task Completed Successfully',
        message: 'Your data analysis task has been completed. The report shows significant insights about customer behavior patterns.',
        priority: 'high',
        read: false,
        action_buttons: [
          { label: 'View Report', action: 'open_chat', variant: 'default' },
          { label: 'Download', action: 'view_result', variant: 'outline' }
        ],
        metadata: { 
          execution_time: '2.5 minutes',
          data_points: 1250,
          insights_found: 8
        }
      },
      {
        user_id: user.id,
        task_id: 'task_' + Math.random().toString(36).substr(2, 9),
        agent_id: 'agent_' + Math.random().toString(36).substr(2, 9),
        agent_name: 'Cleo Automation Bot',
        notification_type: 'task_scheduled',
        title: 'Daily Report Scheduled',
        message: 'Your daily analytics report has been scheduled for 9:00 AM tomorrow. You will receive an email notification when it\'s ready.',
        priority: 'medium',
        read: false,
        action_buttons: [
          { label: 'View Schedule', action: 'open_chat', variant: 'outline' },
          { label: 'Modify', action: 'schedule_followup', variant: 'default' }
        ],
        metadata: { 
          scheduled_time: '2024-03-15T09:00:00Z',
          report_type: 'daily_analytics'
        }
      },
      {
        user_id: user.id,
        task_id: 'task_' + Math.random().toString(36).substr(2, 9),
        agent_id: 'agent_' + Math.random().toString(36).substr(2, 9),
        agent_name: 'Shopify Integration Agent',
        notification_type: 'task_failed',
        title: 'Order Sync Failed',
        message: 'Failed to sync recent orders from Shopify. API rate limit exceeded. Will retry automatically in 15 minutes.',
        priority: 'urgent',
        read: false,
        action_buttons: [
          { label: 'Retry Now', action: 'retry_task', variant: 'default' },
          { label: 'View Logs', action: 'view_result', variant: 'outline' },
          { label: 'Dismiss', action: 'dismiss', variant: 'destructive' }
        ],
        metadata: { 
          error_code: 'RATE_LIMIT_EXCEEDED',
          retry_count: 2,
          next_retry: '2024-03-15T10:30:00Z'
        }
      }
    ];

    // Insert test notifications
    const { data: notifications, error } = await supabase
      .from('task_notifications' as any)
      .insert(testNotifications)
      .select('*');

    if (error) {
      console.error('❌ Error creating test notifications:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test notifications created successfully',
      count: notifications?.length || 0,
      notifications
    });

  } catch (error) {
    console.error('❌ Error in test data creation:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
