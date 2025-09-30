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
    // Get SDP from browser
    const sdp = await request.text()
    
    if (!sdp || sdp.trim().length === 0) {
      return NextResponse.json(
        { error: 'SDP offer is required' },
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

    // Session configuration for OpenAI
    const sessionConfig = {
      session: {
        type: 'realtime',
        model: 'gpt-4o-realtime-preview-2024-10-01',
        modalities: ['text', 'audio'],
        instructions: 'You are Cleo, a helpful AI assistant. Respond naturally and conversationally.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad'
        }
      }
    }

    // Create multipart form data
    const formData = new FormData()
    formData.append('sdp', sdp)
    formData.append('session', JSON.stringify(sessionConfig))

    console.log('📡 Forwarding SDP to OpenAI Realtime API...')

    // Forward to OpenAI using the unified interface
    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      
      return NextResponse.json(
        { 
          error: 'Failed to establish connection with OpenAI',
          details: errorText
        },
        { status: response.status }
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
