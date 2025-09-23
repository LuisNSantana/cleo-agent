import { NextRequest } from 'next/server'
import { resolveConfirmation } from '@/lib/confirmation/unified'

export async function POST(request: Request) {
  try {
    const { confirmationId, approved } = await request.json()
    
    if (!confirmationId || typeof approved !== 'boolean') {
      return Response.json({
        success: false,
        error: 'Invalid parameters: confirmationId and approved (boolean) required'
      }, { status: 400 })
    }

    console.log(`[CONFIRM API] Processing confirmation ${confirmationId} with approved=${approved}`)
    
    const result = await resolveConfirmation(confirmationId, approved)
    
    console.log(`[CONFIRM API] Result:`, result)
    
    return Response.json(result)
    
  } catch (error) {
    console.error('[Confirm API] Error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}