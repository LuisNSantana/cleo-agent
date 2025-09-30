// Voice Session End API - End voice sessions
import { NextRequest, NextResponse } from 'next/server'
import { VoiceSessionManager } from '@/lib/voice/session-manager'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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

    const { sessionId } = params
    const body = await req.json()

    const session = await VoiceSessionManager.endSession(
      sessionId,
      user.id,
      body
    )

    return NextResponse.json({
      duration: session.duration_seconds,
      cost: session.cost_usd,
      tokens: {
        audioInput: session.audio_input_tokens,
        audioOutput: session.audio_output_tokens,
        textInput: session.text_input_tokens,
        textOutput: session.text_output_tokens
      }
    })
  } catch (error) {
    console.error('Voice session end error:', error)
    return NextResponse.json(
      { error: 'Failed to end voice session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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

    const { sessionId } = params

    await VoiceSessionManager.markSessionError(
      sessionId,
      user.id,
      'Session cancelled by user'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Voice session cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel voice session' },
      { status: 500 }
    )
  }
}
