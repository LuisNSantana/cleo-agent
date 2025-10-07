import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agent_id } = body

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Use provided agent_id or default from env
    const agentId = agent_id || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

    if (!agentId) {
      return NextResponse.json(
        { error: 'No agent ID provided' },
        { status: 400 }
      )
    }

    // Get signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/agents/${agentId}/websocket`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('ElevenLabs API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to get signed URL from ElevenLabs' },
        { status: response.status }
      )
    }

    const data = await response.json()

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
