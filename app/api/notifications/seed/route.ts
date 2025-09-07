import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    // Create sample notifications
    const sampleNotifications = [
      {
        user_id: user.id,
        task_id: 'task-001',
        agent_id: 'agent-001',
        agent_name: 'Web Scraper Agent',
        notification_type: 'task_completed' as const,
        title: 'Web scraping task completed successfully',
        message: 'Your web scraping task for product prices has been completed. Found 150 products with updated pricing information.',
        priority: 'medium' as const,
        read: false,
        action_buttons: [
          {
            id: 'view-results',
            label: 'View Results',
            action_type: 'view_result',
            style: 'primary'
          },
          {
            id: 'open-chat',
            label: 'Discuss',
            action_type: 'open_chat',
            style: 'secondary'
          }
        ],
        metadata: {
          products_found: 150,
          execution_time: '2.5 minutes'
        }
      },
      {
        user_id: user.id,
        task_id: 'task-002',
        agent_id: 'agent-002',
        agent_name: 'Email Assistant',
        notification_type: 'task_failed' as const,
        title: 'Email automation task failed',
        message: 'Failed to send automated emails due to authentication error. Please check your email configuration.',
        priority: 'high' as const,
        read: false,
        error_details: 'SMTP authentication failed - invalid credentials',
        action_buttons: [
          {
            id: 'retry-task',
            label: 'Retry Task',
            action_type: 'retry_task',
            style: 'primary'
          },
          {
            id: 'view-error',
            label: 'View Details',
            action_type: 'view_result',
            style: 'secondary'
          }
        ]
      },
      {
        user_id: user.id,
        task_id: 'task-003',
        agent_id: 'agent-003',
        agent_name: 'Data Analyst',
        notification_type: 'task_completed' as const,
        title: 'Monthly report generated',
        message: 'Your monthly analytics report has been generated and is ready for review.',
        priority: 'low' as const,
        read: true,
        read_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        task_result: {
          report_type: 'monthly_analytics',
          period: '2025-08',
          total_users: 1250,
          growth_rate: '12.5%'
        },
        action_buttons: [
          {
            id: 'download-report',
            label: 'Download Report',
            action_type: 'view_result',
            style: 'primary'
          }
        ]
      }
    ];

    // Insert notifications
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('task_notifications')
      .insert(sampleNotifications)
      .select('*');

    if (insertError) {
      console.error('❌ Error creating sample notifications:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedNotifications?.length || 0} sample notifications`,
      notifications: insertedNotifications
    });

  } catch (error) {
    console.error('❌ Error in notifications seed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
