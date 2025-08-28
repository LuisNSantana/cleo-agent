/**
 * Agents API Route
 * Handles agent execution and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'
import { ExecuteAgentRequest } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteAgentRequest = await request.json()
    const { agentId, input, context } = body

    if (!input || !input.trim()) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      )
    }

  const orchestrator = getAgentOrchestrator()
  // Debug instance identity
  console.log('[API/execute] Orchestrator instance id:', (orchestrator as any)["__id"] || (globalThis as any).__cleoOrchestrator ? 'global' : 'local')

    try {
  // Start execution non-blocking to enable live UI updates
  const execution = orchestrator.startAgentExecution(input, agentId)
  console.log('[API/execute] Started execution:', execution.id)

      return NextResponse.json({
        success: true,
        execution: {
          id: execution.id,
          agentId: execution.agentId,
          status: execution.status,
          startTime: execution.startTime,
          messages: execution.messages,
          metrics: execution.metrics,
          error: execution.error,
          steps: execution.steps || []
        }
      })
    } catch (error) {
      console.error('Agent execution error:', error)

      // Only recreate orchestrator for very specific graph errors, not general errors
      if (error instanceof Error && (
        error.message.includes('already present') ||
        error.message.includes('Graph not initialized') ||
        error.message.includes('UNREACHABLE_NODE')
      )) {
        console.log('Detected critical graph error, attempting orchestrator recreation...', {
          errorMessage: error.message,
          errorType: error.constructor.name
        })
        
        const { recreateAgentOrchestrator } = await import('@/lib/agents/agent-orchestrator')
        const newOrchestrator = recreateAgentOrchestrator()

        try {
          const execution = newOrchestrator.startAgentExecution(input, agentId)
          return NextResponse.json({
            success: true,
            execution: {
              id: execution.id,
              agentId: execution.agentId,
              status: execution.status,
              startTime: execution.startTime,
              messages: execution.messages,
              metrics: execution.metrics,
              error: execution.error,
              steps: execution.steps || []
            }
          })
        } catch (retryError) {
          console.error('Retry execution failed:', retryError)
          return NextResponse.json(
            { error: 'Failed to execute agent after retry', details: retryError instanceof Error ? retryError.message : String(retryError) },
            { status: 500 }
          )
        }
      }

      // For other errors, just return the error without recreating
      return NextResponse.json(
        { 
          error: 'Failed to execute agent',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error executing agent:', error)
    return NextResponse.json(
      {
        error: 'Failed to execute agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const orchestrator = getAgentOrchestrator()
    const executions = orchestrator.getAllExecutions()

    return NextResponse.json({
      success: true,
      executions: executions.map(execution => ({
        id: execution.id,
        agentId: execution.agentId,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        metrics: execution.metrics,
        error: execution.error
      }))
    })

  } catch (error) {
    console.error('Error fetching executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}
