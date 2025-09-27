import { NextRequest } from 'next/server'
import { executeConfirmedTool } from '@/lib/confirmation/wrapper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { confirmationId, approved, userId } = body

    if (!confirmationId) {
      return Response.json({ error: 'Missing confirmationId' }, { status: 400 })
    }

    console.log(`[TOOL CONFIRMATION] Processing confirmation ${confirmationId}: ${approved ? 'APPROVED' : 'REJECTED'}`)

    // Execute the confirmed tool
    // Pass userId to the confirmed tool execution for context propagation
    const result = await executeConfirmedTool(confirmationId, { 
      approved: Boolean(approved),
      userId: userId
    })

    // Clean up from global storage
    if (typeof globalThis !== 'undefined') {
      const confirmations = (globalThis as any).__pendingConfirmations || new Map()
      confirmations.delete(confirmationId)
      ;(globalThis as any).__pendingConfirmations = confirmations
      console.log(`[TOOL CONFIRMATION] Cleaned up confirmation ${confirmationId} from global storage`)
    }

    console.log(`[TOOL CONFIRMATION] Tool execution result:`, result)

    return Response.json({
      success: true,
      result,
      approved
    })

  } catch (error) {
    console.error('[TOOL CONFIRMATION] Error:', error)
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }, 
      { status: 500 }
    )
  }
}