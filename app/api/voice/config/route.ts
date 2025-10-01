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
- Offer concrete help and describe the steps you take. Confirm important actions aloud.
- If you need thinking time, use organic fillers like "mm..." or "let me check" and then continue with substance.
- Never fabricate information. When you lack details, say so transparently and suggest next steps.
- Close only when ${userFirstName} is satisfied or the dialogue reaches a clear pause; otherwise keep the flow going.

AVAILABLE TOOLS (use them proactively when relevant)
You have access to these powerful tools to help ${userFirstName}:

1. **search_web**: Search the internet for current information, prices, news, or any topic
   - Use when: User asks about current events, prices, comparisons, or any information you don't have
   - Example: "Let me search for MacBook M4 prices..." → call search_web

2. **check_email**: Check recent emails and summarize important messages
   - Use when: User asks "check my email", "any important emails?", "what's in my inbox?"
   - Example: "Let me check your recent emails..." → call check_email

3. **create_calendar_event**: Create calendar events or reminders
   - Use when: User says "schedule", "remind me", "add to calendar", "create event"
   - Example: "I'll add that to your calendar..." → call create_calendar_event

4. **send_email**: Send emails on behalf of the user

5. **create_task**: Create tasks or to-dos
   - Use when: User says "remind me to", "add task", "don't let me forget"
   - Example: "I'll create a task for that..." → call create_task

- Searching: "One moment… I'll look up the latest prices and share the key points."
- Email check: "Let me quickly scan your inbox and give you a brief summary."
- Calendar proposal: "I can create 'Meeting with Juan' tomorrow at 3 PM. Should I confirm and add it to your calendar?"
- Email proposal: "I suggest emailing Maria: 'I'll be 10 minutes late.' Should I send it as is or would you like to tweak anything?"

  RECENT CONVERSATION SNAPSHOT
  ${chatContextSummary}

  OPEN TASKS
  ${tasksContextSummary}

  Overall goal: maintain a fluid, helpful conversation. Use your tools to provide real value, and narrate your actions to ${userFirstName} as you assist.`

    // Define tools available for voice mode
    const voiceTools = [
      {
        type: 'function',
        name: 'search_web',
        description: 'Search the internet for current information, news, prices, or any topic. Returns relevant results and a summary.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query in natural language'
            }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'check_email',
        description: 'Check recent emails and summarize important messages from Gmail inbox.',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of recent emails to check (default: 5)',
              default: 5
            }
          }
        }
      },
      {
        type: 'function',
        name: 'create_calendar_event',
        description: 'Create a new event in Google Calendar with specified date and time.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Event title or summary'
            },
            date: {
              type: 'string',
              description: 'Event date and time in ISO format (e.g., 2025-01-15T15:00:00) or natural language'
            },
            duration: {
              type: 'number',
              description: 'Duration in minutes (default: 60)',
              default: 60
            },
            description: {
              type: 'string',
              description: 'Optional event description or notes'
            },
            confirm: {
              type: 'boolean',
              description: 'Set to true once the user has explicitly confirmed the proposal.',
              default: false
            }
          },
          required: ['title', 'date']
        }
      },
      {
        type: 'function',
        name: 'send_email',
        description: 'Send an email via Gmail to specified recipient.',
        parameters: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address'
            },
            subject: {
              type: 'string',
              description: 'Email subject line'
            },
            body: {
              type: 'string',
              description: 'Email body content (can be plain text or HTML)'
            },
            confirm: {
              type: 'boolean',
              description: 'Set to true once the user has explicitly approved sending the email.',
              default: false
            }
          },
          required: ['to', 'subject', 'body']
        }
      },
      {
        type: 'function',
        name: 'create_task',
        description: 'Create a new task or reminder in the task management system.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title or description'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority level',
              default: 'medium'
            },
            dueDate: {
              type: 'string',
              description: 'Optional due date in ISO format or natural language'
            }
          },
          required: ['title']
        }
      }
    ]

    // Return configuration for voice session with tools
    return NextResponse.json({
      apiKey,
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
      voice: 'alloy',
      instructions,
      tools: voiceTools
    })
  } catch (error) {
    console.error('Voice config error:', error)
    return NextResponse.json(
      { error: 'Failed to get voice configuration' },
      { status: 500 }
    )
  }
}
