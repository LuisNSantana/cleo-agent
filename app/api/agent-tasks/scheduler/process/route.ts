import { NextResponse } from 'next/server'
import { triggerTaskProcessing } from '@/lib/agent-tasks/scheduler'

/**
 * POST /api/agent-tasks/scheduler/process
 * Called by Vercel Cron every minute to process scheduled tasks
 * Also can be called manually for testing
 */
export async function POST() {
  const startTime = Date.now()
  
  try {
    console.log('🔄 [CRON] Task processing triggered at:', new Date().toISOString())
    
    await triggerTaskProcessing()
    
    const duration = Date.now() - startTime
    console.log(`✅ [CRON] Task processing completed in ${duration}ms`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Task processing triggered',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [CRON] Error triggering task processing:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to trigger task processing',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET /api/agent-tasks/scheduler/process
 * Vercel Cron also supports GET requests
 */
export async function GET() {
  return POST()
}
