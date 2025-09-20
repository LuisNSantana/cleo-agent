import { getPendingConfirmations } from '@/lib/confirmation/simple-blocking'

export async function GET() {
  try {
    const confirmations = getPendingConfirmations()
    
    return Response.json({
      success: true,
      confirmations
    })
  } catch (error) {
    console.error('[Get Pending Confirmations] Error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      confirmations: []
    }, { status: 500 })
  }
}