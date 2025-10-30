/**
 * Resume Execution Endpoint
 * Handles     // 2. Get interrupt state
    const interrupt = await InterruptManager.getInterrupt(executionId)
    if (!interrupt) {
      return NextResponse.json(
        { error: 'Interrupt not found', executionId },
        { status: 404 }
      )
    }

    // Check if already responded
    if (interrupt.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Interrupt already processed', 
          executionId,
          currentStatus: interrupt.status 
        },
        { status: 409 }
      )nterrupt approvals
 * 
 * Based on LangGraph official patterns:
 * - Receives HumanResponse from UI
 * - Updates InterruptManager state
 * - Allows execution-manager to continue with Command(resume=...)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { InterruptManager } from '@/lib/agents/core/interrupt-manager'
import { HumanResponse } from '@/lib/agents/types/interrupt'

// Request schema
const ResumeRequestSchema = z.object({
  executionId: z.string(),
  response: z.object({
    type: z.enum(['accept', 'edit', 'response', 'ignore']),
    args: z.any()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validation = ResumeRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { executionId, response } = validation.data

    console.log('📥 [RESUME API] Received user response:', {
      executionId,
      responseType: response.type
    })

    // Check if interrupt exists
    const interrupt = await InterruptManager.getInterrupt(executionId)
    if (!interrupt) {
      return NextResponse.json(
        { error: 'Interrupt not found', executionId },
        { status: 404 }
      )
    }

    // Check if already responded
    if (interrupt.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Interrupt already processed', 
          executionId,
          currentStatus: interrupt.status 
        },
        { status: 409 }
      )
    }

    // Update interrupt with user response
    const updatedState = await InterruptManager.updateInterruptResponse(
      executionId,
      response as HumanResponse
    )

    if (!updatedState) {
      return NextResponse.json(
        { error: 'Failed to update interrupt state' },
        { status: 500 }
      )
    }

    console.log('✅ [RESUME API] Interrupt updated successfully:', {
      executionId,
      newStatus: updatedState.status
    })

    // Return success
    // The execution-manager polling loop will detect this response and continue
    return NextResponse.json({
      success: true,
      executionId,
      status: updatedState.status,
      message: 'Response recorded, execution will resume'
    })

  } catch (error) {
    console.error('❌ [RESUME API] Error processing resume request:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check interrupt status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const executionId = searchParams.get('executionId')

    if (!executionId) {
      return NextResponse.json(
        { error: 'Missing executionId parameter' },
        { status: 400 }
      )
    }

    const interrupt = await InterruptManager.getInterrupt(executionId)
    
    if (!interrupt) {
      return NextResponse.json(
        { error: 'Interrupt not found', executionId },
        { status: 404 }
      )
    }

    return NextResponse.json({
      executionId,
      status: interrupt.status,
      interrupt: interrupt.interrupt,
      hasResponse: !!interrupt.response,
      timestamp: interrupt.timestamp
    })

  } catch (error) {
    console.error('❌ [RESUME API] Error fetching interrupt status:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
