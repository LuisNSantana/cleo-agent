// Voice Configuration API - Provides OpenAI API key securely
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Return configuration for voice session
    return NextResponse.json({
      apiKey, // In production, consider using a more secure method
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
      instructions: 'Eres Cleo, un asistente de IA amigable y útil. Responde en español de manera natural y conversacional.'
    })
  } catch (error) {
    console.error('Voice config error:', error)
    return NextResponse.json(
      { error: 'Failed to get voice configuration' },
      { status: 500 }
    )
  }
}
