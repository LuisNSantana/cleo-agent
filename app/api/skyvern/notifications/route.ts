import { NextRequest, NextResponse } from 'next/server';
import { getPendingNotifications } from '@/lib/skyvern/tasks-db';

export async function GET(request: NextRequest) {
  try {
    // Get notifications using the existing function that handles auth correctly
    const notificationsResult = await getPendingNotifications();
    
    if (!notificationsResult.success) {
      return NextResponse.json(
        { success: false, error: notificationsResult.error },
        { status: notificationsResult.error?.includes('not authenticated') ? 401 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: notificationsResult.notifications || [],
      count: notificationsResult.notifications?.length || 0
    });
  } catch (error) {
    console.error('❌ Error in notifications API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
