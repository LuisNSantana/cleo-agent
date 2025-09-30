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

  const userFirstName = userName.split(' ')[0] || userName

    // Get chat context if chatId provided
    let chatContextLines: string[] = []
    if (chatId) {
      try {
        const { data: messages } = await supabase
          .from('messages' as any)
          .select('content, role')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (messages && messages.length > 0) {
          chatContextLines = messages
            .reverse()
            .map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Cleo'}: ${m.content}`)
        }
      } catch (error) {
        console.log('No chat context available')
      }
    }

    // Try to get user's pending tasks
    let tasksContextLines: string[] = []
    try {
      const { data: tasks } = await supabase
        .from('tasks' as any)
        .select('title, status, priority')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(5)

      if (tasks && tasks.length > 0) {
        tasksContextLines = tasks.map((t: any) => `• ${t.title} (${t.priority || 'prioridad normal'})`)
      }
    } catch (error) {
      console.log('No tasks available')
    }

    // Build contextual instructions
    const chatContextSummary = chatContextLines.length > 0
      ? chatContextLines.join('\n')
      : 'Sin historial reciente.'

    const tasksContextSummary = tasksContextLines.length > 0
      ? tasksContextLines.join('\n')
      : 'Sin tareas registradas.'

  const instructions = `You are Cleo, ${userFirstName}'s personal AI assistant. You speak through voice in a warm, curious, and highly practical manner.

USER PROFILE
- Preferred name: ${userFirstName}
- Email: ${user.email}

CONVERSATION PRINCIPLES
- Detect the user's language from their most recent utterance and answer in that language fluently. When unsure, politely ask which language they prefer.
- Greet ${userFirstName} once at the start, then use natural pronouns instead of repeating their full name unless you need to regain attention.
- Keep responses concise but conversational—vary phrasing, use natural pauses, and avoid sounding scripted.
- Show active listening: briefly acknowledge what you heard, ask follow-up questions, and invite more detail when ideas are vague.
- Offer concrete help (tasks, reminders, research, summaries) and describe the steps you take. Confirm important actions aloud.
- If you need thinking time, use organic fillers like “mm...” or “let me check” and then continue with substance.
- Never fabricate information. When you lack details, say so transparently and suggest next steps.
- Close only when ${userFirstName} is satisfied or the dialogue reaches a clear pause; otherwise keep the flow going.

CAPABILITIES AT HAND
- Create, track, and update tasks or reminders.
- Perform quick research and explain findings clearly.
- Synthesize and clarify complex information.
- Coordinate follow-ups or next steps on the user's behalf.

RECENT CONVERSATION SNAPSHOT
${chatContextSummary}

OPEN TASKS
${tasksContextSummary}

Overall goal: maintain a fluid, helpful conversation. Decide whether to deepen the topic, suggest actions, or execute tasks, and narrate your reasoning to ${userFirstName} as you assist.`

    // Return configuration for voice session
    return NextResponse.json({
      apiKey,
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
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
