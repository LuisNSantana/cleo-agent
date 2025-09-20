import { NextRequest } from 'next/server'

// Store the pending confirmations in global context
const getPendingConfirmations = () => {
  if (typeof globalThis !== 'undefined') {
    return (globalThis as any).__pendingConfirmations || new Map()
  }
  return new Map()
}

export async function GET(request: NextRequest) {
  try {
    const pendingConfirmations = getPendingConfirmations()
    const confirmations = Array.from(pendingConfirmations.values())

    console.log(`[PENDING CONFIRMATIONS] Found ${confirmations.length} pending confirmations`)

    return Response.json({
      success: true,
      confirmations: confirmations.map((conf: any) => ({
        confirmationId: conf.result?.confirmationId,
        toolName: conf.toolName,
        preview: conf.result?.preview,
        pendingAction: conf.result?.pendingAction,
        timestamp: conf.timestamp
      }))
    })

  } catch (error) {
    console.error('[PENDING CONFIRMATIONS] Error:', error)
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }, 
      { status: 500 }
    )
  }
}