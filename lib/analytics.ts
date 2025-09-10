import { createGuestServerClient } from './supabase/server-guest'
import type { Database } from '@/app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// Internal helper with environment guards. Returns null when analytics cannot run.
async function getClient(): Promise<SupabaseClient<Database> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role for server-side aggregated writes, fallback to anon for read-only if provided
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Quiet (non-fatal) – analytics disabled gracefully
    return null
  }
  try {
    const sb = await createGuestServerClient()
    if (!sb) return null
    return sb as unknown as SupabaseClient<Database>
  } catch (e) {
    // Do not propagate – analytics must never break tool execution
    return null
  }
}

export async function trackFeatureUsage(
  userId: string,
  featureName: string,
  opts?: { delta?: number; timeSpentMinutes?: number; successRate?: number | null; metadata?: Record<string, any> }
) {
  try {
    const sb = await getClient()
    if (!sb) return // analytics disabled
    const usageDate = new Date().toISOString().slice(0, 10)
    const delta = opts?.delta ?? 1
    const time = opts?.timeSpentMinutes ?? 0
    const successRate = typeof opts?.successRate === 'number' ? opts!.successRate! : null

    // Read-modify-write to increment (upsert would overwrite counts)
    const { data: existing, error: selErr } = await sb
      .from('feature_usage_analytics')
      .select('id, usage_count, total_time_spent_minutes, success_rate')
      .eq('user_id', userId)
      .eq('feature_name', featureName)
      .eq('usage_date', usageDate)
      .maybeSingle()

    if (selErr && selErr.code !== 'PGRST116') {
      console.error('trackFeatureUsage select error', selErr)
    }

    if (!existing) {
      const { error: insErr } = await sb
        .from('feature_usage_analytics')
        .insert({
          user_id: userId,
          feature_name: featureName,
          usage_date: usageDate,
          usage_count: delta,
          total_time_spent_minutes: time,
          success_rate: successRate,
          metadata: opts?.metadata ?? null,
        })
      if (insErr) console.error('trackFeatureUsage insert error', insErr)
      return
    }

    const prevCount = Number(existing.usage_count ?? 0)
    const prevTime = Number(existing.total_time_spent_minutes ?? 0)
    const prevSR = typeof existing.success_rate === 'number' ? Number(existing.success_rate) : null
    const newCount = prevCount + delta
    const newTime = prevTime + time
    const newSR = successRate == null
      ? prevSR
      : prevSR == null
        ? successRate
        : Number((((prevSR * prevCount) + successRate) / (prevCount + 1)).toFixed(2))

    const { error: updErr } = await sb
      .from('feature_usage_analytics')
      .update({ usage_count: newCount, total_time_spent_minutes: newTime, success_rate: newSR, metadata: opts?.metadata ?? null })
      .eq('id', (existing as any).id)
    if (updErr) console.error('trackFeatureUsage update error', updErr)
  } catch (_e) {
    // Swallow errors silently to avoid noise
  }
}

export async function trackToolUsage(
  userId: string,
  toolName: string,
  opts?: { ok?: boolean; execMs?: number; params?: Record<string, any>; errorType?: string }
) {
  try {
    const sb = await getClient()
    if (!sb) return // analytics disabled
    const usageDate = new Date().toISOString().slice(0, 10)
    const ok = opts?.ok ?? true
    const exec = Math.max(0, Math.floor(opts?.execMs ?? 0))

    const { data: existing, error: selErr } = await sb
      .from('tool_usage_analytics')
      .select('id, invocation_count, success_count, error_count, avg_execution_time_ms, total_execution_time_ms')
      .eq('user_id', userId)
      .eq('tool_name', toolName)
      .eq('usage_date', usageDate)
      .maybeSingle()

    if (selErr && selErr.code !== 'PGRST116') {
      console.error('trackToolUsage select error', selErr)
    }

    if (!existing) {
      const { error: insErr } = await sb
        .from('tool_usage_analytics')
        .insert({
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
        })
      if (insErr) console.error('trackToolUsage insert error', insErr)
      return
    }

    const prevInv = Number(existing.invocation_count ?? 0)
    const prevSucc = Number(existing.success_count ?? 0)
    const prevErr = Number(existing.error_count ?? 0)
    const prevAvg = Number(existing.avg_execution_time_ms ?? 0)
    const prevTotal = Number(existing.total_execution_time_ms ?? 0)

    const newInv = prevInv + 1
    const newSucc = prevSucc + (ok ? 1 : 0)
    const newErr = prevErr + (ok ? 0 : 1)
    const newTotal = prevTotal + exec
    const newAvg = Math.round(((prevAvg * prevInv) + exec) / Math.max(1, newInv))

    const { error: updErr } = await sb
      .from('tool_usage_analytics')
      .update({
        invocation_count: newInv,
        success_count: newSucc,
        error_count: newErr,
        avg_execution_time_ms: newAvg,
        total_execution_time_ms: newTotal,
        popular_parameters: opts?.params ?? null,
      })
      .eq('id', (existing as any).id)
    if (updErr) console.error('trackToolUsage update error', updErr)
  } catch (_e) {
    // Silent fail
  }
}

export async function getUserDailySummary(userId: string) {
  const sb = await getClient()
  if (!sb) return []
  const { data, error } = await sb
    .from('user_daily_summary')
    .select('*')
    .eq('user_id', userId)
    .order('usage_date', { ascending: false })
    .limit(30)
  if (error) console.error('getUserDailySummary error', error)
  return data
}
