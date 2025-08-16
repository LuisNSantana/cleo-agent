import { createGuestServerClient } from './supabase/server-guest'
import type { Database } from '@/app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getClient() {
  // server-guest uses service role and no cookies; ideal for server actions/routes
  const sb = await createGuestServerClient()
  if (!sb) throw new Error('Supabase is disabled')
  return sb as unknown as SupabaseClient<Database>
}

export async function trackFeatureUsage(userId: string, featureName: string, opts?: { delta?: number; timeSpentMinutes?: number; successRate?: number | null; metadata?: Record<string, any> }) {
  const sb = await getClient()
  const usageDate = new Date().toISOString().slice(0, 10)
  const delta = opts?.delta ?? 1
  const time = opts?.timeSpentMinutes ?? 0
  const { error } = await sb
    .from('feature_usage_analytics')
    .upsert({ user_id: userId, feature_name: featureName, usage_date: usageDate, usage_count: delta, total_time_spent_minutes: time, metadata: opts?.metadata ?? null }, { onConflict: 'user_id,feature_name,usage_date' })
  if (error) console.error('trackFeatureUsage error', error)
}

export async function trackToolUsage(userId: string, toolName: string, opts?: { ok?: boolean; execMs?: number; params?: Record<string, any>; errorType?: string }) {
  const sb = await getClient()
  const usageDate = new Date().toISOString().slice(0, 10)
  const ok = opts?.ok ?? true
  const exec = opts?.execMs ?? 0
  const { error } = await sb
    .from('tool_usage_analytics')
    .upsert({
      user_id: userId,
      tool_name: toolName,
      usage_date: usageDate,
      invocation_count: 1,
      success_count: ok ? 1 : 0,
      error_count: ok ? 0 : 1,
      avg_execution_time_ms: exec,
      total_execution_time_ms: exec,
      popular_parameters: opts?.params ?? null,
      error_types: opts?.errorType ? [opts.errorType] : [],
    }, { onConflict: 'user_id,tool_name,usage_date' })
  if (error) console.error('trackToolUsage error', error)
}

export async function getUserDailySummary(userId: string) {
  const sb = await getClient()
  const { data, error } = await sb
    .from('user_daily_summary')
    .select('*')
    .eq('user_id', userId)
    .order('usage_date', { ascending: false })
    .limit(30)
  if (error) console.error('getUserDailySummary error', error)
  return data
}
