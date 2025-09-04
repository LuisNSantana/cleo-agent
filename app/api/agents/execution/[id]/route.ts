import { NextRequest, NextResponse } from 'next/server'
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'Execution ID is required' },
        { status: 400 }
      )
    }

  const orchestrator = getAgentOrchestrator()
  const exec = orchestrator.getExecution(executionId)

    if (!exec) {
      console.warn('[API/execution] Execution not found:', executionId, {
        totalExecutions: orchestrator.getAllExecutions().length,
        knownIds: orchestrator.getAllExecutions().map(e => e.id)
      })
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Normalize dates to ISO for transport
    const normalized = {
      ...exec,
      startTime: exec.startTime instanceof Date ? exec.startTime.toISOString() : exec.startTime,
      endTime: exec.endTime instanceof Date ? exec.endTime.toISOString() : exec.endTime,
      messages: (exec.messages || []).map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp
      })),
      steps: exec.steps?.map(step => ({
        ...step,
        timestamp: step.timestamp instanceof Date ? step.timestamp.toISOString() : step.timestamp
      })) || []
    }

    return NextResponse.json({ success: true, execution: normalized })

  } catch (error) {
    console.error('Error fetching execution:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
