import { NextRequest } from 'next/server'
import { resolveConfirmation } from '@/lib/confirmation/simple-blocking'

export async function POST(request: NextRequest) {
  try {
    const { confirmationId, approved } = await request.json()

    if (!confirmationId) {
      return Response.json({ error: 'Missing confirmationId' }, { status: 400 })
    }

    const resolved = resolveConfirmation(confirmationId, Boolean(approved))

    if (!resolved) {
      return Response.json({ error: 'Confirmation not found or expired' }, { status: 404 })
    }

    return Response.json({ 
      success: true, 
      approved: Boolean(approved),
      message: approved ? 'Action approved' : 'Action cancelled'
    })

  } catch (error) {
    console.error('[Simple Confirmation] Error:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}