import { NextRequest } from "next/server"
import { getCleoPrompt } from "@/lib/prompts"

export const runtime = 'nodejs'

// Remove model-specific control tokens from streamed text
function sanitizeModelText(text: string): string {
  if (!text) return text
  let out = text
  // Common special tokens seen in some OpenRouter/DeepSeek streams
  out = out.replace(/<\s*\|\s*begin__?of__?sentence\s*\|\s*>/gi, "")
  out = out.replace(/<\s*\|\s*end__?of__?sentence\s*\|\s*>/gi, "")
  out = out.replace(/<\s*\|\s*begin__?of__?text\s*\|\s*>/gi, "")
  out = out.replace(/<\s*\|\s*end__?of__?text\s*\|\s*>/gi, "")
  out = out.replace(/<\s*\|\s*(?:start|end)_header_id\s*\|\s*>/gi, "")
  out = out.replace(/<\s*\|\s*(?:eot_id|eom_id|eos)\s*\|\s*>/gi, "")
  // Some models leak thinking tags
  out = out.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, "")
  // Collapse excessive spaces introduced by token removal
  out = out.replace(/[ \t]{2,}/g, " ")
  return out
}

// Implementación simple y directa para guest mode usando OpenRouter API
// NO usa LangChain, agentes, pipeline, ni delegation - solo chat directo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Extraer mensajes del historial (para memoria) y último mensaje del usuario
    let conversationHistory: Array<{role: string, content: string}> = []
    let userMessage = ''
    
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      // Usar historial completo de mensajes para contexto
      conversationHistory = body.messages.map((m: any) => ({
        role: m.role,
        content: m.content || ''
      })).filter((m: any) => m.content.trim()) // Filtrar mensajes vacíos

      const lastUserMsg = [...body.messages].reverse().find((m: any) => m.role === 'user')
      if (lastUserMsg) {
        userMessage = lastUserMsg.content || ''
      }
    } else if (body.message) {
      userMessage = typeof body.message === 'string' ? body.message : (body.message.content || '')
      conversationHistory = [{ role: 'user', content: userMessage }]
    }

    if (!userMessage) {
      return new Response('Error: No message provided', { status: 400 })
    }

    // FORZAR DEEPSEEK PARA TODOS LOS CASOS EN GUEST MODE - SOLUCIÓN URGENTE
    const guestModel = 'deepseek/deepseek-chat-v3.1:free'
    const guestModelId = 'openrouter:deepseek/deepseek-chat-v3.1:free'
    
    console.log('🔥 GUEST MODE DEBUG:', {
      userMessage: userMessage.substring(0, 50) + '...',
      conversationLength: conversationHistory.length,
      selectedModel: guestModel,
      selectedModelId: guestModelId,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      timestamp: new Date().toISOString()
    })
    
    const systemPrompt = getCleoPrompt(guestModelId, 'guest')

    // Construir mensajes con historial para mantener contexto
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory // Incluir todo el historial de la conversación
    ]

    // Llamada directa a OpenRouter API
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Cleo Chat Guest Mode'
      },
      body: JSON.stringify({
        model: guestModel,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!openrouterResponse.ok) {
      return new Response('Error communicating with AI service', { status: 500 })
    }

    // Crear stream de respuesta compatible con el cliente
    const stream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const jsonStr = line.slice(5).trim() // Remove "data:" prefix
              if (jsonStr) {
                const data = JSON.parse(jsonStr)
                const content = data.choices?.[0]?.delta?.content
                
                if (content) {
                  const cleaned = sanitizeModelText(content)
                  // El cliente espera texto plano que falle el JSON.parse 
                  // para ser tratado como contenido directo
                  const responseChunk = `data: ${cleaned}\n\n`
                  controller.enqueue(new TextEncoder().encode(responseChunk))
                }
              }
            } catch (e) {
              // Ignorar líneas mal formateadas
            }
          } else if (line.includes('[DONE]')) {
            // Enviar señal de fin
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          }
        }
      }
    })

    return new Response(openrouterResponse.body?.pipeThrough(stream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (err) {
    return new Response('Internal server error', { status: 500 })
  }
}
