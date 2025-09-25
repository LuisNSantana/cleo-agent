import { NextRequest } from 'next/server'
import { resolveConfirmation } from '@/lib/confirmation/unified'

// POST /api/executions/[id]/confirm
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { approved } = await req.json()
    if (typeof approved !== 'boolean') {
      return new Response(JSON.stringify({ success: false, message: 'Missing or invalid approved field' }), { status: 400 })
    }

    // Call backend confirmation logic
    const result = await resolveConfirmation(params.id, approved)
    if (!result.success) {
      return new Response(JSON.stringify(result), { status: 404 })
    }
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 })
  }
}
