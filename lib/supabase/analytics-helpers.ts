// Cleo Agent - Analytics Database Helpers
// Type-safe helpers for analytics operations

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/app/types/database.types'

// Analytics types
export interface ModelUsageAnalytics {
  id: string
  user_id: string
  usage_date: string
  model_name: string
  message_count: number
  total_input_tokens: number
  total_output_tokens: number
  average_response_time_ms: number
  successful_requests: number
  failed_requests: number
  total_cost_usd: number
  first_use_at: string
  last_use_at: string
}

export interface UserSessionAnalytics {
  id: string
  user_id: string
  session_date: string
  session_duration_minutes: number
  pages_visited: number
  features_used: string[]
  device_type: string
  browser_name: string
  country_code: string
  referrer_domain: string
  total_messages_sent: number
  total_canvas_actions: number
  session_start_at: string
  session_end_at: string
}

export interface ConversationAnalytics {
  id: string
  chat_id: string
  user_id: string
  message_count: number
  total_tokens: number
  conversation_duration_minutes: number
  models_used: string[]
  tools_used: string[]
  avg_response_time_ms: number
  user_satisfaction_rating: number
  conversation_topic: string
  created_at: string
  updated_at: string
}

export interface FeatureUsageAnalytics {
  id: string
  user_id: string
  usage_date: string
  feature_name: string
  usage_count: number
  total_time_spent_minutes: number
  success_rate: number
  error_count: number
  feature_category: string
  first_use_at: string
  last_use_at: string
}

export interface ToolUsageAnalytics {
  id: string
  user_id: string
  usage_date: string
  tool_name: string
  usage_count: number
  success_count: number
  error_count: number
  average_execution_time_ms: number
  total_tokens_used: number
  tool_category: string
  first_use_at: string
  last_use_at: string
}

// Daily summary view type
export interface DailySummary {
  usage_date: string
  active_users: number
  total_messages: number
  total_input_tokens: number
  total_output_tokens: number
  models_used: number
  avg_response_time: number
}

// Model popularity view type
export interface ModelPopularity {
  model_name: string
  unique_users: number
  total_messages: number
  total_tokens: number
  avg_response_time: number
  successful_requests: number
  failed_requests: number
}

// User engagement view type
export interface UserEngagement {
  id: string
  email: string
  user_since: string
  streak_days: number
  longest_streak: number
  avg_daily_messages: number
  total_chats: number
  total_messages: number
  last_activity: string
  models_tried: number
}

// Analytics service class
export class AnalyticsService {
  private get supabase() {
    return createClient() as ReturnType<typeof createClient>
  }

  // Model usage analytics
  async getModelUsageAnalytics(
    userId?: string,
    dateRange?: { from: string; to: string }
  ) {
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    let query = supabase
      .from('model_usage_analytics' as keyof Database['public']['Tables'])
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (dateRange) {
      query = query
        .gte('usage_date', dateRange.from)
        .lte('usage_date', dateRange.to)
    }

    return query.order('usage_date', { ascending: false })
  }

  async updateModelUsage(
    userId: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    responseTime: number,
    success: boolean = true,
    cost: number = 0
  ) {
    const today = new Date().toISOString().split('T')[0]

  const supabase = this.supabase
  if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

  // Cast function name to any to satisfy type system for RPC
  return (supabase as any).rpc('fn_update_model_analytics', {
      p_user_id: userId,
      p_model_name: modelName,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_response_time_ms: responseTime,
      p_success: success,
      p_cost_usd: cost
    })
  }

  // User session analytics
  async trackUserSession(
    userId: string,
    sessionData: Partial<UserSessionAnalytics>
  ) {
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    return supabase
      .from('user_session_analytics' as keyof Database['public']['Tables'])
      .upsert({
        user_id: userId,
        session_date: new Date().toISOString().split('T')[0],
        ...sessionData
      })
  }

  // Feature usage analytics
  async trackFeatureUsage(
    userId: string,
    featureName: string,
    category: string = 'general',
    timeSpent: number = 0,
    success: boolean = true
  ) {
    const today = new Date().toISOString().split('T')[0]

    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    return supabase
      .from('feature_usage_analytics' as keyof Database['public']['Tables'])
      .upsert({
        user_id: userId,
        usage_date: today,
        feature_name: featureName,
        usage_count: 1,
        total_time_spent_minutes: timeSpent,
        success_rate: success ? 1 : 0,
        error_count: success ? 0 : 1,
        feature_category: category,
        first_use_at: new Date().toISOString(),
        last_use_at: new Date().toISOString()
      })
  }

  // Tool usage analytics
  async trackToolUsage(
    userId: string,
    toolName: string,
    category: string,
    executionTime: number,
    tokensUsed: number = 0,
    success: boolean = true
  ) {
    const today = new Date().toISOString().split('T')[0]

    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    return supabase
      .from('tool_usage_analytics' as keyof Database['public']['Tables'])
      .upsert({
        user_id: userId,
        usage_date: today,
        tool_name: toolName,
        usage_count: 1,
        success_count: success ? 1 : 0,
        error_count: success ? 0 : 1,
        average_execution_time_ms: executionTime,
        total_tokens_used: tokensUsed,
        tool_category: category,
        first_use_at: new Date().toISOString(),
        last_use_at: new Date().toISOString()
      })
  }

  // Analytics views
  async getDailySummary(limit: number = 30) {
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    return (supabase as any)
      .from('analytics_daily_summary')
      .select('*')
      .limit(limit)
  }

  async getModelPopularity() {
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    return (supabase as any)
      .from('analytics_model_popularity')
      .select('*')
  }

  async getUserEngagement(userId?: string) {
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    let query = (supabase as any)
      .from('analytics_user_engagement')
      .select('*')

    if (userId) {
      query = query.eq('id', userId)
    }

    return query
  }

  // Conversation analytics
  async updateConversationAnalytics(
    chatId: string,
    userId: string,
    data: Partial<ConversationAnalytics>
  ) {
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    return supabase
      .from('conversation_analytics' as keyof Database['public']['Tables'])
      .upsert({
        chat_id: chatId,
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString()
      })
  }

  // Error logging
  async logError(
    userId: string,
    errorType: string,
    errorMessage: string,
    context: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    // Check if error_logs table exists
    const supabase = this.supabase
    if (!supabase) return { data: null, error: new Error('Supabase disabled') } as const

    // Attempt insert; if table doesn't exist, surface a clear message
    return (supabase as any)
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: errorType,
        error_message: errorMessage,
        error_context: context,
        severity_level: severity,
        timestamp: new Date().toISOString()
      })
  }

  // Batch operations for better performance
  async batchUpdateAnalytics(operations: Array<() => Promise<any>>) {
    const results = await Promise.allSettled(operations.map(op => op()))
    
    const failed = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')

    if (failed.length > 0) {
      console.warn(`${failed.length} analytics operations failed:`, failed)
    }

    return {
      successful: results.length - failed.length,
      failed: failed.length,
      errors: failed.map(({ result, index }) => ({
        operation: index,
        error: result.status === 'rejected' ? result.reason : null
      }))
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

// Utility functions
export function formatAnalyticsDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): number {
  // Basic cost calculation - you should update these rates
  const costs: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
    'claude-3': { input: 0.015 / 1000, output: 0.075 / 1000 },
    'llama-70b': { input: 0.0009 / 1000, output: 0.0009 / 1000 }
  }

  const modelCost = costs[modelName] || costs['gpt-3.5-turbo']
  return (inputTokens * modelCost.input) + (outputTokens * modelCost.output)
}

export function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'mobile'
  }
  if (/Tablet/.test(userAgent)) {
    return 'tablet'
  }
  return 'desktop'
}

export function getBrowserName(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'chrome'
  if (userAgent.includes('Firefox')) return 'firefox'
  if (userAgent.includes('Safari')) return 'safari'
  if (userAgent.includes('Edge')) return 'edge'
  return 'other'
}
