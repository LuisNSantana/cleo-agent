// Voice Session Manager
// Handles voice session lifecycle, validation, and rate limiting

import { createClient } from '@/lib/supabase/server'
import {
  VoiceSession,
  VoiceRateLimitInfo,
  VoiceUsageStats,
  CreateVoiceSessionRequest,
  VoiceRateLimitError,
  VoiceError,
  VoiceModel,
  OpenAIVoice,
  VoiceQuality
} from './types'
import { addMinutes, startOfMonth, endOfMonth } from 'date-fns'
import { randomUUID } from 'crypto'

export class VoiceSessionManager {
  /**
   * Create a new voice session
   */
  static async createSession(
    userId: string,
    request: CreateVoiceSessionRequest
  ): Promise<VoiceSession> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    // Check rate limits
    const rateLimitInfo = await this.checkRateLimit(userId)
    if (!rateLimitInfo.allowed) {
      throw new VoiceRateLimitError(rateLimitInfo.message)
    }

    // Voice mode is enabled for all authenticated users
    // No additional checks needed

    // Create session
    const session: Partial<VoiceSession> = {
      id: randomUUID(),
      user_id: userId,
      chat_id: request.chatId || null,
      provider: 'openai',
      model: request.model || 'gpt-4o-realtime-preview',
      voice: request.voice || 'alloy',
      quality: request.quality || 'standard',
      status: 'active',
      started_at: new Date().toISOString(),
      duration_seconds: 0,
      audio_input_tokens: 0,
      audio_output_tokens: 0,
      text_input_tokens: 0,
      text_output_tokens: 0,
      cost_usd: 0,
      metadata: {
        systemPrompt: request.systemPrompt,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
      }
    }

    const { data, error } = await supabase
      .from('voice_sessions' as any)
      .insert(session as any)
      .select()
      .single()

    if (error) {
      // Check if error is due to missing table (migration not run)
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        throw new VoiceError(
          'Voice sessions table does not exist. Please run database migration first: migrations/0012_voice_mode_tables.sql',
          'MIGRATION_REQUIRED'
        )
      }
      
      throw new VoiceError(
        `Failed to create voice session: ${error.message}`,
        'CREATE_SESSION_ERROR'
      )
    }

    if (!data) {
      throw new VoiceError(
        'No data returned from voice session creation',
        'CREATE_SESSION_ERROR'
      )
    }

    return data as unknown as VoiceSession
  }

  /**
   * Get session by ID with validation
   */
  static async getSession(
    sessionId: string,
    userId: string
  ): Promise<VoiceSession | null> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    const { data, error } = await supabase
      .from('voice_sessions' as any)
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data as unknown as VoiceSession
  }

  /**
   * Update session with usage data
   */
  static async updateSession(
    sessionId: string,
    userId: string,
    updates: Partial<VoiceSession>
  ): Promise<VoiceSession> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    // Validate ownership
    const session = await this.getSession(sessionId, userId)
    if (!session) {
      throw new VoiceError('Session not found or unauthorized', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('voice_sessions' as any)
      .update(updates as any)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new VoiceError(
        `Failed to update session: ${error.message}`,
        'UPDATE_SESSION_ERROR'
      )
    }

    return data as unknown as VoiceSession
  }

  /**
   * End a voice session
   */
  static async endSession(
    sessionId: string,
    userId: string,
    finalStats: {
      duration_seconds: number
      audio_input_tokens: number
      audio_output_tokens: number
      text_input_tokens: number
      text_output_tokens: number
    }
  ): Promise<VoiceSession> {
    // Calculate cost
    const cost = this.calculateCost(
      finalStats.audio_input_tokens,
      finalStats.audio_output_tokens,
      finalStats.text_input_tokens,
      finalStats.text_output_tokens
    )

    const updates: Partial<VoiceSession> = {
      ended_at: new Date().toISOString(),
      duration_seconds: finalStats.duration_seconds,
      audio_input_tokens: finalStats.audio_input_tokens,
      audio_output_tokens: finalStats.audio_output_tokens,
      text_input_tokens: finalStats.text_input_tokens,
      text_output_tokens: finalStats.text_output_tokens,
      cost_usd: cost,
      status: 'completed'
    }

    return await this.updateSession(sessionId, userId, updates)
  }

  /**
   * Mark session as error
   */
  static async markSessionError(
    sessionId: string,
    userId: string,
    errorMessage: string
  ): Promise<void> {
    await this.updateSession(sessionId, userId, {
      status: 'error',
      error_message: errorMessage,
      ended_at: new Date().toISOString()
    })
  }

  /**
   * Check if user can start a new voice session
   */
  static async checkRateLimit(userId: string): Promise<VoiceRateLimitInfo> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    // Get user's voice minutes limit
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('voice_minutes_limit')
      .eq('user_id', userId)
      .single()

    const prefs = preferences as any
    const limit = prefs?.voice_minutes_limit || 5 // default 5 minutes

    // Get usage for current month
    const stats = await this.getUsageStats(userId)

    const remaining = Math.max(0, limit - stats.monthlyMinutes)
    const allowed = remaining > 0

    const resetAt = endOfMonth(new Date()).toISOString()

    return {
      allowed,
      remaining,
      limit,
      resetAt,
      message: allowed
        ? undefined
        : `Monthly voice limit reached. Resets at ${resetAt}`
    }
  }

  /**
   * Get usage statistics for user
   */
  static async getUsageStats(userId: string): Promise<VoiceUsageStats> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Get all-time stats
    const { data: allTimeSessions } = await supabase
      .from('voice_sessions' as any)
      .select('duration_seconds, cost_usd')
      .eq('user_id', userId)
      .in('status', ['completed', 'active'])

    // Get monthly stats
    const { data: monthlySessionsData } = await supabase
      .from('voice_sessions' as any)
      .select('duration_seconds, cost_usd')
      .eq('user_id', userId)
      .in('status', ['completed', 'active'])
      .gte('started_at', monthStart.toISOString())
      .lte('started_at', monthEnd.toISOString())

    const totalMinutes = Math.ceil(
      ((allTimeSessions as any)?.reduce((sum: number, s: any) => sum + s.duration_seconds, 0) || 0) / 60
    )
    const totalSessions = allTimeSessions?.length || 0
    const totalCost = (allTimeSessions as any)?.reduce((sum: number, s: any) => sum + s.cost_usd, 0) || 0

    const monthlyMinutes = Math.ceil(
      ((monthlySessionsData as any)?.reduce((sum: number, s: any) => sum + s.duration_seconds, 0) || 0) / 60
    )
    const monthlySessions = monthlySessionsData?.length || 0
    const monthlyCost = (monthlySessionsData as any)?.reduce((sum: number, s: any) => sum + s.cost_usd, 0) || 0

    // Get user's limit
    let limit = 5 // default
    
    try {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('voice_minutes_limit')
        .eq('user_id', userId)
        .single()

      const prefs = preferences as any
      limit = prefs?.voice_minutes_limit || 5
    } catch (error) {
      console.error('Error fetching voice limit:', error)
      // Use default limit on error
    }

    return {
      totalMinutes,
      totalSessions,
      totalCost,
      monthlyMinutes,
      monthlySessions,
      monthlyCost,
      remainingMinutes: Math.max(0, limit - monthlyMinutes),
      limit
    }
  }

  /**
   * Calculate cost based on OpenAI Realtime API pricing
   * Audio input: $0.032/min = $0.00053333/sec
   * Audio output: $0.064/min = $0.00106667/sec
   * Text: $4/1M input tokens, $16/1M output tokens
   */
  private static calculateCost(
    audioInputTokens: number,
    audioOutputTokens: number,
    textInputTokens: number,
    textOutputTokens: number
  ): number {
    // OpenAI Realtime pricing
    const audioInputRate = 0.032 / 60 // per second
    const audioOutputRate = 0.064 / 60 // per second
    const textInputRate = 4.0 / 1000000 // per token
    const textOutputRate = 16.0 / 1000000 // per token

    // Convert tokens to seconds (approximate)
    // For audio, OpenAI uses ~50 tokens per second
    const audioInputSeconds = audioInputTokens / 50
    const audioOutputSeconds = audioOutputTokens / 50

    const audioCost =
      audioInputSeconds * audioInputRate + audioOutputSeconds * audioOutputRate
    const textCost =
      textInputTokens * textInputRate + textOutputTokens * textOutputRate

    return Number((audioCost + textCost).toFixed(6))
  }

  /**
   * Generate secure WebSocket token for session
   */
  static generateWSToken(sessionId: string, userId: string): string {
    // In production, use JWT or similar secure token
    // For now, simple base64 encoded token
    const payload = {
      sessionId,
      userId,
      exp: addMinutes(new Date(), 60).getTime() // 1 hour expiry
    }
    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  /**
   * Validate WebSocket token
   */
  static validateWSToken(
    token: string
  ): { sessionId: string; userId: string } | null {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))

      // Check expiry
      if (payload.exp < Date.now()) {
        return null
      }

      return {
        sessionId: payload.sessionId,
        userId: payload.userId
      }
    } catch {
      return null
    }
  }

  /**
   * Get active sessions for user
   */
  static async getActiveSessions(userId: string): Promise<VoiceSession[]> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    const { data } = await supabase
      .from('voice_sessions' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })

    return (data as unknown as VoiceSession[]) || []
  }

  /**
   * Get recent sessions for user
   */
  static async getRecentSessions(
    userId: string,
    limit: number = 10
  ): Promise<VoiceSession[]> {
    const supabase = await createClient()

    if (!supabase) {
      throw new VoiceError('Database connection failed', 'DB_CONNECTION_ERROR')
    }

    const { data } = await supabase
      .from('voice_sessions' as any)
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)

    return (data as unknown as VoiceSession[]) || []
  }

  /**
   * Cancel all active sessions for user (cleanup)
   */
  static async cancelActiveSessions(userId: string): Promise<void> {
    const activeSessions = await this.getActiveSessions(userId)

    for (const session of activeSessions) {
      await this.updateSession(session.id, userId, {
        status: 'cancelled',
        ended_at: new Date().toISOString()
      })
    }
  }
}
