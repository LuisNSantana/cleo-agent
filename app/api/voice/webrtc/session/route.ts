import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * WebRTC Session Endpoint
 * 
 * This endpoint receives an SDP offer from the browser and forwards it
 * to OpenAI's Realtime API using the unified interface.
 * 
 * The flow is:
 * 1. Browser creates WebRTC offer
 * 2. Browser POSTs SDP to this endpoint
 * 3. This endpoint forwards to OpenAI with API key
 * 4. OpenAI returns SDP answer
 * 5. This endpoint returns answer to browser
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let sdp: string | undefined
    let sessionOverrides: Partial<Record<string, unknown>> | undefined

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null)

      if (body && typeof body === 'object') {
        if (typeof body.sdp === 'string') {
          sdp = body.sdp
        }
        if (body.session && typeof body.session === 'object') {
          sessionOverrides = body.session as Partial<Record<string, unknown>>
        }
      }
    } else {
      sdp = await request.text()
    }

    if (!sdp || sdp.trim().length === 0) {
      console.error('❌ Empty SDP received')
      return NextResponse.json(
        { error: 'SDP offer is required' },
        { status: 400 }
      )
    }

    console.log('📥 Received SDP length:', sdp.length)
    console.log('📥 SDP preview:', sdp.substring(0, 100))

    // Validate SDP format
    if (!sdp.includes('v=0')) {
      console.error('❌ Invalid SDP format - missing v=0')
      return NextResponse.json(
        { error: 'Invalid SDP format' },
        { status: 400 }
      )
    }

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Session configuration - using latest 2025 models
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-mini-2025-12-15'
    const voice = process.env.OPENAI_REALTIME_VOICE || 'marin'

    const sessionConfig: Record<string, unknown> = {
      model,
      voice,
      modalities: ['text', 'audio'],
      turn_detection: { type: 'server_vad' }
    }

    if (sessionOverrides) {
      if (typeof sessionOverrides.model === 'string' && sessionOverrides.model.trim().length > 0) {
        sessionConfig.model = sessionOverrides.model
      }
      if (typeof sessionOverrides.voice === 'string' && sessionOverrides.voice.trim().length > 0) {
        sessionConfig.voice = sessionOverrides.voice
      }
      if (typeof sessionOverrides.instructions === 'string') {
        sessionConfig.instructions = sessionOverrides.instructions
      }
      if (Array.isArray(sessionOverrides.modalities)) {
        sessionConfig.modalities = sessionOverrides.modalities
      }
      if (sessionOverrides.turn_detection && typeof sessionOverrides.turn_detection === 'object') {
        sessionConfig.turn_detection = sessionOverrides.turn_detection
      }
    }

    // Create multipart form data - using append to preserve multiple values if needed
    const formData = new FormData()
    formData.append('sdp', sdp)
    formData.append('session', JSON.stringify(sessionConfig))

    console.log('📡 Forwarding SDP to OpenAI Realtime API...')

    // Forward to OpenAI using the unified interface
    const effectiveModel = typeof sessionConfig.model === 'string' && sessionConfig.model.trim().length > 0
      ? sessionConfig.model
      : model

    const realtimeUrl = `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(effectiveModel)}`
    const response = await fetch(realtimeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      },
      body: formData
    })

    if (!response.ok) {
      const rawError = await response.text()
      let errorPayload: unknown = rawError

      try {
        errorPayload = JSON.parse(rawError)
      } catch (parseError) {
        // keep raw text if parsing fails
      }

      console.error('OpenAI API error:', response.status, errorPayload)

      return NextResponse.json(
        {
          error: 'Failed to establish connection with OpenAI',
          details: errorPayload
        },
        { status: response.status === 400 ? 502 : response.status }
      )
    }

    // Get SDP answer from OpenAI
    const answerSdp = await response.text()
    console.log('✅ Received SDP answer from OpenAI')

    // Return SDP answer to browser
    return new NextResponse(answerSdp, {
      status: 200,
      headers: {
        'Content-Type': 'application/sdp'
      }
    })

  } catch (error) {
    console.error('WebRTC session error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
