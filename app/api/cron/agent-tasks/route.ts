import { NextResponse } from 'next/server';
import { getScheduler } from '@/lib/agent-tasks/scheduler';

export const dynamic = 'force-dynamic'; // Ensure this runs dynamically
export const maxDuration = 60; // Set max duration for Vercel Hobby (10s) vs Pro (300s). 60s is safe average.

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Optional: Verify Vercel Cron secret if present in environment
    // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('⏰ [CRON] Starting updated task processing cycle...');
    const scheduler = getScheduler();
    
    // Explicitly run one cycle
    const result = await scheduler.runScheduledTasksCycle();
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [CRON] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
