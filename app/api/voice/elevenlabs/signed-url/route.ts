import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('📥 Received ElevenLabs signed URL request')
    
    const body = await req.json().catch(() => ({}))
    const { agent_id } = body

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY not configured')
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Use provided agent_id or default
    const agentId = agent_id || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'agent_1301k707t7ybf60bby0zc3q49eqt'
    console.log('🎯 Using Agent ID:', agentId)

    if (!agentId) {
      console.error('❌ No agent ID available')
      return NextResponse.json(
        { error: 'No agent ID provided' },
        { status: 400 }
      )
    }

    // Get signed URL from ElevenLabs
    const params = new URLSearchParams({ agent_id: agentId })
    if (body?.include_conversation_id) {
      params.set('include_conversation_id', 'true')
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/signed-url?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          Accept: 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ ElevenLabs API error:', response.status, errorData)
      return NextResponse.json(
        { error: 'Failed to get signed URL from ElevenLabs', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Got signed URL from ElevenLabs')

    return NextResponse.json({
      signed_url: data.signed_url || data.url
    })
  } catch (error) {
    console.error('Error getting ElevenLabs signed URL:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
