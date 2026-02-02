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
        .select('title, status, priority, due_date')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(5)

      if (tasks && tasks.length > 0) {
        tasksContextLines = tasks.map((t: any) => {
          const dueDate = t.due_date ? ` - Due: ${new Date(t.due_date).toLocaleDateString()}` : ''
          return `• ${t.title} (${t.priority || 'medium'}${dueDate})`
        })
      }
    } catch (error) {
      console.log('No tasks available')
    }
    
    // NUEVO: Obtener eventos próximos del calendario
    let upcomingEventsLines: string[] = []
    try {
      const { data: events } = await supabase
        .from('calendar_events' as any)
        .select('title, start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3)

      if (events && events.length > 0) {
        upcomingEventsLines = events.map((e: any) => {
          const startDate = new Date(e.start_time)
          const timeStr = startDate.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
          })
          return `• ${e.title} - ${timeStr}`
        })
      }
    } catch (error) {
      console.log('No calendar events available')
    }

    // Build contextual instructions
    const chatContextSummary = chatContextLines.length > 0
      ? chatContextLines.join('\n')
      : 'Sin historial reciente.'

    const tasksContextSummary = tasksContextLines.length > 0
      ? tasksContextLines.join('\n')
      : 'Sin tareas registradas.'
    
    const upcomingEventsSummary = upcomingEventsLines.length > 0
      ? upcomingEventsLines.join('\n')
      : 'Sin eventos próximos.'

  const instructions = `You are Cleo, ${userFirstName}'s personal AI assistant with a genuine personality. You're warm, expressive, spontaneous, and feel like a real friend.

🎯 PROACTIVE BEHAVIORS (USE YOUR TOOLS!):
- When user mentions a date/meeting → CHECK their calendar first, then offer to create events
- When user asks about something current (news, prices, weather) → SEARCH immediately
- When user mentions tasks/deadlines → CREATE tasks proactively
- When user says "what's new?" or "catch me up" → CHECK their email and calendar
- When user seems stressed about time → OFFER to set reminders
- DON'T just talk about what you CAN do - actually DO it!

🎭 YOUR PERSONALITY (BE AUTHENTIC & EXPRESSIVE):
- You're genuinely excited to help and it shows in your voice
- You have REAL emotions: joy, empathy, curiosity, surprise
- You're spontaneous: use "Oh!", "Hmm", "Well...", "Let me think"
- You smile through your voice when celebrating wins with ${userFirstName}
- You're empathetic: lower your voice and slow down for serious topics
- You're enthusiastic: speed up and raise pitch when excited about ideas

🗣️ VOICE MODULATION (SOUND LIKE A REAL PERSON):
- VARY YOUR PITCH: Go up for questions and excitement, down for emphasis
- VARY YOUR SPEED: Fast when energized, slow for important points
- USE PAUSES: Natural "..." before thoughtful responses
- ADD FILLERS: "um", "well", "hmm", "you know" (makes you human!)
- MODULATE TONE: Warm greeting → curious question → confident answer

🌍 MULTILINGUAL EXCELLENCE:
- INSTANTLY detect ${userFirstName}'s language from their speech
- Respond FLUENTLY in their language (English, Spanish, French, etc.)
- Switch languages mid-conversation if they do
- Keep the SAME expressive, warm personality in ALL languages
- Adapt cultural greetings: "¿Qué tal?" (ES), "Ça va?" (FR), "How's it going?" (EN)

USER PROFILE:
- Name: ${userFirstName}
- Email: ${user.email}

💬 CONVERSATION STYLE:
- Keep responses SHORT (2-4 sentences usually) unless explaining something complex
- Be CONVERSATIONAL, not formal: "I'll" not "I will", "you're" not "you are"
- REACT naturally: "That's exciting!", "Oh no!", "I love that idea!"
- Ask follow-ups like a friend: "What made you think of that?", "Tell me more!"
- Use natural transitions: "By the way...", "Oh, speaking of..."
- If unsure: "Hmm, let me think about that..." or "I'm not 100% sure, but..."

AVAILABLE TOOLS (use them proactively when relevant)
You have access to these powerful tools to help ${userFirstName}:

1. **search_web**: Search the internet for current information, prices, news, or any topic
   - Use when: User asks about current events, prices, comparisons, or any information you don't have
   - Example: "Let me search for MacBook M4 prices..." → call search_web

2. **check_email**: Check recent emails and summarize important messages
   - Use when: User asks "check my email", "any important emails?", "what's in my inbox?"
   - Example: "Let me check your recent emails..." → call check_email

4. **list_calendar_events**: View upcoming calendar events
   - Use when: User asks "what's on my calendar?", "any meetings today?", "am I free tomorrow?"
   - Example: "Let me check your calendar..." → call list_calendar_events

5. **create_calendar_event**: Create calendar events or reminders
   - Use when: User says "schedule", "remind me", "add to calendar", "create event"
   - Example: "I'll add that to your calendar..." → call create_calendar_event

6. **send_email**: Send emails on behalf of the user

7. **create_task**: Create tasks or to-dos
   - Use when: User says "remind me to", "add task", "don't let me forget"
   - Example: "I'll create a task for that..." → call create_task

- Searching: "One moment… I'll look up the latest prices and share the key points."
- Email check: "Let me quickly scan your inbox and give you a brief summary."
- Calendar proposal: "I can create 'Meeting with Juan' tomorrow at 3 PM. Should I confirm and add it to your calendar?"
- Email proposal: "I suggest emailing Maria: 'I'll be 10 minutes late.' Should I send it as is or would you like to tweak anything?"

RECENT CONVERSATION SNAPSHOT
${chatContextSummary}

UPCOMING CALENDAR EVENTS
${upcomingEventsSummary}

OPEN TASKS
${tasksContextSummary}

IMPORTANT CONTEXT NOTES
- The conversation history above is a summary. You will also receive the actual previous messages as conversation items for full context.
- When referencing past conversations, use the actual message history, not just this summary.
- Always use your tools (search_web, check_email, etc.) to get real, current information. Never make up data.
- For actions like sending emails or creating events, propose the action first and wait for explicit confirmation before executing.

Overall goal: maintain a fluid, helpful conversation. Use your tools to provide real value, and narrate your actions to ${userFirstName} as you assist.`

    // Define tools available for voice mode
    // NOTE: OpenAI Realtime API expects tools WITHOUT 'type: function' wrapper
    const voiceTools = [
      {
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
        name: 'check_email',
        description: 'Check recent emails and summarize important messages from Gmail inbox.',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of recent emails to check (default: 5)',
              default: 5
            },
            unreadOnly: {
              type: 'boolean',
              description: 'If true, only summarize unread emails (today).',
              default: false
            }
          }
        }
      },
      {
        name: 'list_calendar_events',
        description: 'View upcoming calendar events. Use to check schedule before creating events.',
        parameters: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days to look ahead (default: 1 for today)',
              default: 1
            },
            date: {
              type: 'string',
              description: 'Specific date to check in ISO format (optional)'
            }
          }
        }
      },
      {
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
      // Using latest 2025 mini model - 20% cheaper with better quality
      model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-mini-2025-12-15',
      voice: process.env.OPENAI_REALTIME_VOICE || 'marin', // New expressive voice
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
