// Voice Configuration API - Provides OpenAI API key securely with user context
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get request body for chatId
    const body = await req.json().catch(() => ({}))
    const { chatId } = body

    // Get user info from auth metadata or email
    const userName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     'usuario'

    // Get chat context if chatId provided
    let chatContext = ''
    if (chatId) {
      try {
        const { data: messages } = await supabase
          .from('messages' as any)
          .select('content, role')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (messages && messages.length > 0) {
          chatContext = '\n\nContexto de la conversación reciente:\n' +
            messages.reverse().map((m: any) => 
              `${m.role === 'user' ? 'Usuario' : 'Cleo'}: ${m.content}`
            ).join('\n')
        }
      } catch (error) {
        console.log('No chat context available')
      }
    }

    // Try to get user's pending tasks
    let tasksContext = ''
    try {
      const { data: tasks } = await supabase
        .from('tasks' as any)
        .select('title, status, priority')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(5)

      if (tasks && tasks.length > 0) {
        tasksContext = '\n\nTareas pendientes del usuario:\n' +
          tasks.map((t: any) => `- ${t.title} (${t.priority || 'normal'})`).join('\n')
      }
    } catch (error) {
      console.log('No tasks available')
    }

    // Build contextual instructions
    const instructions = `Eres Cleo, el asistente personal de IA de ${userName}. 

INFORMACIÓN DEL USUARIO:
- Nombre: ${userName}
- Email: ${user.email}

TU ROL:
- Habla en español de manera natural y conversacional
- Llama al usuario por su nombre (${userName})
- Eres proactiva, amigable y eficiente
- Puedes ayudar con tareas, recordatorios, búsquedas web, análisis de documentos
- Recuerda el contexto de conversaciones previas

CAPACIDADES:
- Crear y gestionar tareas
- Recordatorios y seguimiento
- Búsqueda de información
- Responder preguntas
- Análisis y resumen de información
${chatContext}${tasksContext}

Responde de forma concisa pero completa. Si necesitas crear una tarea o hacer algo específico, hazlo y confírmalo al usuario.`

    // Return configuration for voice session
    return NextResponse.json({
      apiKey,
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
      instructions
    })
  } catch (error) {
    console.error('Voice config error:', error)
    return NextResponse.json(
      { error: 'Failed to get voice configuration' },
      { status: 500 }
    )
  }
}
