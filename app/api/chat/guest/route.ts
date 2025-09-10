import { NextResponse } from 'next/server'

// Guest chat endpoint: forwards request to internal /api/multi-model-chat without
// forwarding cookies or authorization. This avoids requiring a user session and
// mirrors the minimal payload the client sends in guest mode.
export const runtime = 'nodejs'

import { NextRequest } from "next/server"
import { getCleoPrompt } from "@/lib/prompts"

// Guest chat endpoint: forwards request to internal /api/multi-model-chat without
// delegation capabilities - guests can only chat directly with Cleo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // The client may send a `messages` array (full chat) or a single `message`.
    // Normalize to the shape expected by /api/multi-model-chat: { message, type, options, metadata }
    let messageForForward: any = body.message
    let typeForForward: string | undefined = body.type

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      // Find last user message from messages array
      const lastUser = [...body.messages].reverse().find((m: any) => m.role === 'user')
      if (lastUser) {
        // The chat client sends parts/experimental attachments; forward as-is
        messageForForward = (lastUser.parts && lastUser.parts.length > 0) ? lastUser.parts : (lastUser.content || '')
        // determine type based on whether it's an array (multimodal) or string
        typeForForward = Array.isArray(messageForForward) ? 'multimodal' : 'text'
      }
    }

    const payload = {
      message: messageForForward,
      type: typeForForward || 'text',
      options: body.options || {},
      metadata: {
        chatId: body.chatId || body.metadata?.chatId,
        userId: body.userId || body.metadata?.userId,
        isAuthenticated: false,
        systemPrompt: getCleoPrompt(body.model || 'langchain:fast', 'guest'), // Use guest-specific prompt
        originalModel: body.model || body.metadata?.originalModel || body.model,
        message_group_id: body.message_group_id || body.metadata?.message_group_id,
        documentId: body.documentId || body.metadata?.documentId,
        debugRag: body.debugRag || body.metadata?.debugRag,
      },
    }

    // Guest mode: NEVER delegate to agents - always use direct Cleo conversation
    // If user asks for delegation, Cleo will suggest them to sign in with Gmail
    const endpointPath = '/api/multi-model-chat' // Always use direct chat, no delegation
    const baseUrl = new URL(endpointPath, req.url)
    try {
      const host = baseUrl.hostname
      if (host === 'localhost' || host === '127.0.0.1') {
        baseUrl.protocol = 'http:'
      }
    } catch {}
    const fRes = await fetch(baseUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), // Always use payload (no delegation) in guest mode
    })

    const contentType = fRes.headers.get('Content-Type') || 'text/event-stream; charset=utf-8'
    return new Response(fRes.body, {
      status: fRes.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': fRes.headers.get('Cache-Control') || 'no-cache, no-transform',
        Connection: fRes.headers.get('Connection') || 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[GuestChat] Failed to forward guest chat:', err)
    return new Response(JSON.stringify({ error: 'Guest chat failed' }), { status: 500 })
  }
}
