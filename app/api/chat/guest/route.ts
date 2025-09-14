import { NextRequest } from "next/server"
import { getCleoPrompt } from "@/lib/prompts"

export const runtime = 'nodejs'

// Implementación simple y directa para guest mode usando OpenRouter API
// NO usa LangChain, agentes, pipeline, ni delegation - solo chat directo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Extraer el último mensaje del usuario
    let userMessage = ''
    
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      const lastUserMsg = [...body.messages].reverse().find((m: any) => m.role === 'user')
      if (lastUserMsg) {
        userMessage = lastUserMsg.content || ''
      }
    } else if (body.message) {
      userMessage = typeof body.message === 'string' ? body.message : (body.message.content || '')
    }

    if (!userMessage) {
      return new Response('Error: No message provided', { status: 400 })
    }

    // Modelo basado en entorno: GLM 4.5 para desarrollo, DeepSeek Free para producción
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    const guestModel = isProduction ? 'deepseek/deepseek-chat-v3.1:free' : 'z-ai/glm-4.5'
    const guestModelId = isProduction ? 'openrouter:deepseek/deepseek-chat-v3.1:free' : 'openrouter:z-ai/glm-4.5'
    const systemPrompt = getCleoPrompt(guestModelId, 'guest')

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
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user', 
            content: userMessage
          }
        ],
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
                  // El cliente espera texto plano que falle el JSON.parse 
                  // para ser tratado como contenido directo
                  const responseChunk = `data: ${content}\n\n`
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
