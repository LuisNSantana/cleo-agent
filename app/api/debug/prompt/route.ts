import { NextResponse } from 'next/server'
import { buildFinalSystemPrompt } from '@/lib/chat/prompt'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/config'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const model = url.searchParams.get('model') || 'openrouter:openai/o4-mini'

    const supabase = null // Phase 1: skip DB; builder handles null supabase
    const messages = [{ role: 'user', content: url.searchParams.get('q') || 'Necesito ayuda con Notion para organizar tareas.' }]

    const { finalSystemPrompt } = await buildFinalSystemPrompt({
      baseSystemPrompt: SYSTEM_PROMPT_DEFAULT,
      model,
      messages: messages as any,
      supabase,
      realUserId: userId,
      enableSearch: false,
      debugRag: false,
    })

    return NextResponse.json({
      ok: true,
      length: finalSystemPrompt.length,
      preview: finalSystemPrompt.slice(0, 4000),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}
