import { NextResponse } from 'next/server';
import { getScheduler } from '@/lib/agent-tasks/scheduler';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Manual cleanup endpoint for stuck tasks
 * GET /api/tasks/cleanup
 */
export async function GET() {
  try {
    console.log('🧹 Manual cleanup triggered via API');
    
    const scheduler = getScheduler();
    const cleanedCount = await scheduler.cleanupStuckTasks();
    
    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      message: `Successfully cleaned ${cleanedCount} stuck task(s)`
    });
    
  } catch (error) {
    console.error('❌ Error in manual cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Force fail all running tasks (emergency use only)
 * POST /api/tasks/cleanup
 */
export async function POST() {
  try {
    console.log('🚨 EMERGENCY: Force failing all running tasks');
    
    const supabase = getSupabaseAdmin();
    
    // Get all running tasks
    const { data: runningTasks, error: fetchError } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('status', 'running');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!runningTasks || runningTasks.length === 0) {
      return NextResponse.json({
        success: true,
        failed: 0,
        message: 'No running tasks found'
      });
    }
    
    console.log(`⚠️ Force failing ${runningTasks.length} running tasks...`);
    
    // Update all to failed
    const { error: updateError } = await supabase
      .from('agent_tasks')
      .update({
        status: 'failed',
        error_message: 'Force failed via emergency cleanup API',
        completed_at: new Date().toISOString()
      })
      .eq('status', 'running');
    
    if (updateError) {
      throw updateError;
    }
    
    return NextResponse.json({
      success: true,
      failed: runningTasks.length,
      message: `Emergency: Force failed ${runningTasks.length} running task(s)`
    });
    
  } catch (error) {
    console.error('❌ Error in emergency cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
