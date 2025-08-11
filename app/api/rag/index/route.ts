import { NextRequest, NextResponse } from 'next/server'
import { indexDocument } from '@/lib/rag/index-document'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { documentId, force } = body
    if (!documentId) return NextResponse.json({ error: 'documentId requerido' }, { status: 400 })
    const result = await indexDocument(documentId, { force })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
