/**
 * Voice Tools Execution API
 * Executes tools called from OpenAI Realtime API during voice conversations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeVoiceTool, validateToolCall, type ToolCall } from '@/lib/voice/tool-executor'
import logger from '@/lib/utils/logger'

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

    const body = await req.json()
    const { toolCall } = body as { toolCall: ToolCall }
    
    if (!toolCall) {
      return NextResponse.json(
        { error: 'Tool call is required' },
        { status: 400 }
      )
    }

    // Validate tool call
    const validation = validateToolCall(toolCall)
    if (!validation.valid) {
      logger.warn('🎙️ [VOICE TOOL] Invalid tool call', {
        toolCall,
        error: validation.error
      })
      
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    logger.info('🎙️ [VOICE TOOL] Executing tool', {
      toolName: toolCall.name,
      userId: user.id,
      callId: toolCall.call_id
    })

    // Execute tool
    const result = await executeVoiceTool(toolCall, user.id)
    
    logger.info('🎙️ [VOICE TOOL] Tool executed successfully', {
      toolName: toolCall.name,
      userId: user.id,
      callId: toolCall.call_id,
      success: JSON.parse(result.output).success
    })
    
    return NextResponse.json(result)
  } catch (error) {
    logger.error('🎙️ [VOICE TOOL] Execution error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to execute tool',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'voice-tools-executor',
    availableTools: [
      'search_web',
      'check_email',
      'create_calendar_event',
      'send_email',
      'create_task'
    ]
  })
}
