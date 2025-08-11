import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.fireworks.ai/inference/v1'
const DEFAULT_MODEL = 'accounts/fireworks/models/llama4-scout-instruct-basic'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FIREWORKS_API_KEY) return NextResponse.json({ error: 'Missing FIREWORKS_API_KEY' }, { status: 500 })
    const body = await req.json().catch(() => ({}))
    const { mode = 'chat', model = DEFAULT_MODEL, prompt = 'Hello', messages, imageUrl } = body

    const headers: Record<string,string> = {
      'Authorization': `Bearer ${process.env.FIREWORKS_API_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    if (mode === 'completion') {
      const payload: any = {
        model,
        max_tokens: 4096, // Máximo confirmado para Llama4 Scout
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.6,
        prompt,
      }
      if (imageUrl) payload.images = [imageUrl]
      const r = await fetch(`${BASE}/completions`, { method: 'POST', headers, body: JSON.stringify(payload) })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || 'Fireworks completion error')
      return NextResponse.json({ raw: json })
    }

    // chat mode
    const payload: any = {
      model,
      max_tokens: 4096, // Máximo confirmado para Llama4 Scout
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0.6,
      messages: messages || [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...(imageUrl ? [{ type: 'image_url', image_url: { url: imageUrl } }] : [])
          ]
        }
      ]
    }
    const r = await fetch(`${BASE}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(payload) })
    const json = await r.json()
    if (!r.ok) throw new Error(json.error || 'Fireworks chat error')
    return NextResponse.json({ raw: json })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
