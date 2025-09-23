import { NextRequest, NextResponse } from 'next/server'
import { executeConfirmedTool } from '@/lib/confirmation/wrapper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { confirmationId, approved, modifiedParameters } = body || {}
    if (!confirmationId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'confirmationId and approved required' }, { status: 400 })
    }
    const result = await executeConfirmedTool(confirmationId, { approved, modifiedParameters })
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to confirm tool' }, { status: 500 })
  }
}