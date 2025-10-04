import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/voice/context/[chatId]
 * 
 * Obtiene el contexto de conversación estructurado para Voice Mode.
 * Retorna los últimos mensajes del chat en formato compatible con OpenAI Realtime API.
 * 
 * Basado en mejores prácticas de ChatGPT y Grok:
 * - Retorna mensajes como array estructurado
 * - Limita a últimos 10 mensajes para mantener latencia baja
 * - Formato compatible con conversation.item.create
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
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

    const chatId = params.chatId

    // Obtener últimos 10 mensajes del chat
    // Siguiendo best practice de ChatGPT: ventana de 5-20 mensajes
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .eq('chat_id', chatId)
      .eq('user_id', user.id) // Seguridad: solo mensajes del usuario
      .order('created_at', { ascending: true })
      .limit(10)

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Formatear mensajes para OpenAI Realtime API
    // Estructura compatible con conversation.item.create
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role, // 'user' o 'assistant'
      content: msg.content,
      created_at: msg.created_at,
      // Formato para conversation.item.create
      item: {
        type: 'message',
        role: msg.role,
        content: [
          {
            type: msg.role === 'user' ? 'input_text' : 'text',
            text: msg.content
          }
        ]
      }
    }))

    console.log(`📝 [Voice Context] Retrieved ${formattedMessages.length} messages for chat ${chatId}`)

    return NextResponse.json({
      success: true,
      chatId,
      messageCount: formattedMessages.length,
      messages: formattedMessages
    })
  } catch (error) {
    console.error('Error getting chat context:', error)
    return NextResponse.json(
      { error: 'Failed to get context' },
      { status: 500 }
    )
  }
}
