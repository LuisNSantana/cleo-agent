// Voice Session API - Create and manage voice sessions
import { NextRequest, NextResponse } from 'next/server'
import { VoiceSessionManager } from '@/lib/voice/session-manager'
import { CreateVoiceSessionRequest, VoiceError, VoiceRateLimitError } from '@/lib/voice/types'
import { createClient } from '@/lib/supabase/server'
import { addMinutes } from 'date-fns'

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

    const body: CreateVoiceSessionRequest = await req.json()
    const session = await VoiceSessionManager.createSession(user.id, body)
    const token = VoiceSessionManager.generateWSToken(session.id, user.id)

    const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws'
    const host = req.headers.get('host') || 'localhost:3000'
    const wsUrl = `${protocol}://${host}/api/voice/stream/${session.id}`

    return NextResponse.json({
      sessionId: session.id,
      wsUrl,
      token,
      expiresAt: addMinutes(new Date(), 60).toISOString(),
      voice: session.voice,
      model: session.model
    })
  } catch (error) {
    console.error('Voice session creation error:', error)

    if (error instanceof VoiceRateLimitError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 429 }
      )
    }

    if (error instanceof VoiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
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

    const stats = await VoiceSessionManager.getUsageStats(user.id)
    const rateLimitInfo = await VoiceSessionManager.checkRateLimit(user.id)
    const recentSessions = await VoiceSessionManager.getRecentSessions(user.id, 5)

    return NextResponse.json({
      usage: stats,
      rateLimit: rateLimitInfo,
      recentSessions
    })
  } catch (error) {
    console.error('Voice session stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice stats' },
      { status: 500 }
    )
  }
}
