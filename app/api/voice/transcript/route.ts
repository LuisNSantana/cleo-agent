import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/voice/transcript
 * 
 * Guarda transcripciones de Voice Mode en el chat de texto.
 * Esto permite que las conversaciones de voz aparezcan en el historial del chat.
 * 
 * Basado en mejores prácticas de ChatGPT:
 * - Sincroniza voz con texto
 * - Mantiene historial unificado
 * - Permite continuidad entre modos
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { chatId, role, content, sessionId } = body

    if (!chatId || !role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, role, content' },
        { status: 400 }
      )
    }

    // Validar role
    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "assistant"' },
        { status: 400 }
      )
    }

    // Guardar mensaje en la base de datos
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        user_id: user.id,
        role,
        content,
        metadata: {
          source: 'voice_mode',
          session_id: sessionId,
          transcribed_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving transcript:', insertError)
      return NextResponse.json(
        { error: 'Failed to save transcript' },
        { status: 500 }
      )
    }

    console.log(`💬 [Voice Transcript] Saved ${role} message to chat ${chatId}`)

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        chatId,
        role,
        content
      }
    })
  } catch (error) {
    console.error('Error saving transcript:', error)
    return NextResponse.json(
      { error: 'Failed to save transcript' },
      { status: 500 }
    )
  }
}
