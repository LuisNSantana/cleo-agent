import { NextResponse } from 'next/server'
import { triggerTaskProcessing } from '@/lib/agent-tasks/scheduler'

export async function POST() {
  try {
    await triggerTaskProcessing()
    return NextResponse.json({ success: true, message: 'Task processing triggered' })
  } catch (error) {
    console.error('Error triggering task processing:', error)
    return NextResponse.json({ success: false, error: 'Failed to trigger task processing' }, { status: 500 })
  }
}
