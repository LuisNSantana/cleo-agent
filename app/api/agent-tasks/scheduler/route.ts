import { NextResponse } from 'next/server'
import { getScheduler } from '@/lib/agent-tasks/scheduler'

export async function GET() {
  try {
    const scheduler = getScheduler()
    const status = scheduler.getStatus()
    
    return NextResponse.json({
      success: true,
      status
    })
  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get scheduler status' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    const scheduler = getScheduler()
    
    if (action === 'start') {
      scheduler.start()
    } else if (action === 'stop') {
      scheduler.stop()
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      )
    }
    
    const status = scheduler.getStatus()
    
    return NextResponse.json({
      success: true,
      status,
      message: `Scheduler ${action}ed successfully`
    })
  } catch (error) {
    console.error('Error controlling scheduler:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to control scheduler' },
      { status: 500 }
    )
  }
}
