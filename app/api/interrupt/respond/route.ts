/**
 * Interrupt Response Endpoint
 * Handles user responses to LangGraph HITL interrupts.
 * When user approves/rejects a tool, this endpoint updates the InterruptManager
 * which unblocks the waiting execution.
 */

import { NextRequest, NextResponse } from 'next/server'
import { InterruptManager } from '@/lib/agents/core/interrupt-manager'
import type { HumanResponse } from '@/lib/agents/types/interrupt'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    // CRITICAL DEBUG: Log ALL incoming requests to diagnose frontend issues
    console.log('🔍🔍🔍 [INTERRUPT-RESPONSE] Endpoint hit, parsing body...')
    
    const body = await request.json()
    const { executionId, approved } = body

    console.log('📥📥📥 [INTERRUPT-RESPONSE] Received user response:', {
      executionId,
      approved,
      timestamp: new Date().toISOString(),
      bodyKeys: Object.keys(body)
    })

    if (!executionId) {
      console.error('❌ [INTERRUPT-RESPONSE] Missing executionId in request')
      return NextResponse.json(
        { error: 'Missing executionId' },
        { status: 400 }
      )
    }

    // Check if interrupt exists before updating
    const existingInterrupt = await InterruptManager.getInterrupt(executionId)
    console.log('📥 [INTERRUPT-RESPONSE] Checking existing interrupt:', {
      executionId,
      exists: !!existingInterrupt,
      status: existingInterrupt?.status
    })

    // Convert simple approved/rejected to HumanResponse format
    const response: HumanResponse = {
      type: approved ? 'accept' : 'ignore',
      args: null
    }

    // Update interrupt with user response
    const updated = await InterruptManager.updateInterruptResponse(
      executionId,
      response
    )

    if (!updated) {
      console.error('❌ [INTERRUPT-RESPONSE] Failed to update interrupt:', {
        executionId,
        reason: 'Interrupt not found or already resolved'
      })
      return NextResponse.json(
        { error: 'Interrupt not found or already resolved' },
        { status: 404 }
      )
    }

    console.log('✅✅✅ [INTERRUPT-RESPONSE] Successfully updated interrupt:', {
      executionId,
      status: updated.status,
      approved
    })

    return NextResponse.json({
      success: true,
      executionId,
      status: updated.status
    })

  } catch (error) {
    console.error('❌ [INTERRUPT-RESPONSE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
