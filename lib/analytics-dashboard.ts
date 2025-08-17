// Server-side dashboard data assembler
// Gathers per-user analytics for the dashboard in one call

import { createGuestServerClient } from '@/lib/supabase/server-guest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/app/types/database.types'

export type DashboardData = {
  rangeDays: number
  daily: Array<{
    usage_date: string
    messages_sent: number
    messages_received: number
    conversations?: number | null
    models_used?: number | null
    total_input_tokens?: number | null
    total_output_tokens?: number | null
  avg_response_time_ms?: number | null
  }>
  modelUsage: Array<{
    model_name: string
    message_count: number
    total_input_tokens?: number | null
    total_output_tokens?: number | null
    successful_requests?: number | null
    failed_requests?: number | null
  }>
  featureUsage: Array<{
    feature_name: string
    usage_count: number
    total_time_spent_minutes?: number | null
    success_rate?: number | null
  }>
  toolUsage: Array<{
    tool_name: string
    usage_count: number
    success_count?: number | null
    error_count?: number | null
    average_execution_time_ms?: number | null
  }>
  totals: {
    messages: number
    inputTokens: number
    outputTokens: number
    activeDays: number
  avgResponseMs: number
  costUsd: number
  }
}

async function getClient() {
  const sb = await createGuestServerClient()
  if (!sb) throw new Error('Supabase disabled')
  return sb as unknown as SupabaseClient<Database>
}

export async function getDashboardData(userId: string, rangeDays: number = 30): Promise<DashboardData> {
  const sb = await getClient()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - rangeDays + 1)
  const from = fromDate.toISOString().slice(0, 10)

  // Daily summary (view): user_daily_summary
  const { data: dailyRaw, error: dailyErr } = await sb
    .from('user_daily_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('usage_date', from)
    .order('usage_date', { ascending: true })

  if (dailyErr) console.error('[Dashboard] daily error', dailyErr)

  const daily = (dailyRaw ?? []).map((d: Tables<'user_daily_summary'>) => ({
    usage_date: String(d.usage_date ?? ''),
    messages_sent: Number(d.messages_sent ?? 0),
    messages_received: Number(d.messages_received ?? 0),
    conversations: d.conversations ?? null,
    models_used: d.models_used ?? null,
    total_input_tokens: d.total_input_tokens ?? null,
    total_output_tokens: d.total_output_tokens ?? null,
  avg_response_time_ms: (d as any).avg_response_time_ms ?? null,
  }))

  // Model usage (table): model_usage_analytics (fallback: aggregate messages)
  let modelUsage: DashboardData['modelUsage'] = []
  {
    const { data, error } = await sb
      .from('model_usage_analytics')
      .select('model_name,message_count,total_input_tokens,total_output_tokens,successful_requests,failed_requests,usage_date')
      .eq('user_id', userId)
      .gte('usage_date', from)
    if (!error && data) {
      const aggregate: Record<string, DashboardData['modelUsage'][number]> = {}
      for (const r of data as Tables<'model_usage_analytics'>[]) {
        const key = r.model_name
        if (!aggregate[key]) {
          aggregate[key] = {
            model_name: key,
            message_count: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            successful_requests: 0,
            failed_requests: 0,
          }
        }
        aggregate[key].message_count += Number(r.message_count ?? 0)
        aggregate[key].total_input_tokens = Number(aggregate[key].total_input_tokens ?? 0) + Number(r.total_input_tokens ?? 0)
        aggregate[key].total_output_tokens = Number(aggregate[key].total_output_tokens ?? 0) + Number(r.total_output_tokens ?? 0)
        aggregate[key].successful_requests = Number(aggregate[key].successful_requests ?? 0) + Number(r.successful_requests ?? 0)
        aggregate[key].failed_requests = Number(aggregate[key].failed_requests ?? 0) + Number(r.failed_requests ?? 0)
      }
      modelUsage = Object.values(aggregate)
    } else if (error && (error as unknown as { code?: string }).code === 'PGRST204') {
      // table may not exist; ignore
      modelUsage = []
    } else if (error) {
      console.error('[Dashboard] model usage error', error)
    }
  }

  // Feature usage (table): feature_usage_analytics
  let featureUsage: DashboardData['featureUsage'] = []
  {
    const { data, error } = await sb
      .from('feature_usage_analytics')
      .select('feature_name,usage_count,total_time_spent_minutes,success_rate,usage_date')
      .eq('user_id', userId)
      .gte('usage_date', from)
    if (!error && data) {
      const aggregate: Record<string, DashboardData['featureUsage'][number]> = {}
      for (const r of data as Tables<'feature_usage_analytics'>[]) {
        const key = r.feature_name
        if (!aggregate[key]) {
          aggregate[key] = {
            feature_name: key,
            usage_count: 0,
            total_time_spent_minutes: 0,
            success_rate: null,
          }
        }
        aggregate[key].usage_count += Number(r.usage_count ?? 0)
        aggregate[key].total_time_spent_minutes = Number(aggregate[key].total_time_spent_minutes ?? 0) + Number(r.total_time_spent_minutes ?? 0)
        // naive avg
        const sr = typeof r.success_rate === 'number' ? r.success_rate : null
        if (sr != null) {
          const prev = aggregate[key].success_rate ?? sr
          aggregate[key].success_rate = Number(((prev + sr) / 2).toFixed(2))
        }
      }
      featureUsage = Object.values(aggregate)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 8)
    } else if (error && (error as unknown as { code?: string }).code === 'PGRST204') {
      featureUsage = []
    } else if (error) {
      console.error('[Dashboard] feature usage error', error)
    }
  }

  // Tool usage (table): tool_usage_analytics
  let toolUsage: DashboardData['toolUsage'] = []
  {
    const { data, error } = await sb
      .from('tool_usage_analytics')
      .select('tool_name,invocation_count,success_count,error_count,avg_execution_time_ms,usage_date')
      .eq('user_id', userId)
      .gte('usage_date', from)
    if (!error && data) {
      const aggregate: Record<string, DashboardData['toolUsage'][number]> = {}
      for (const r of data as Tables<'tool_usage_analytics'>[]) {
        const key = r.tool_name
        if (!aggregate[key]) {
          aggregate[key] = {
            tool_name: key,
            usage_count: 0,
            success_count: 0,
            error_count: 0,
            average_execution_time_ms: 0,
          }
        }
        aggregate[key].usage_count += Number(r.invocation_count ?? 0)
        aggregate[key].success_count = Number(aggregate[key].success_count ?? 0) + Number(r.success_count ?? 0)
        aggregate[key].error_count = Number(aggregate[key].error_count ?? 0) + Number(r.error_count ?? 0)
        // simple rolling avg
        const cur = Number(r.avg_execution_time_ms ?? 0)
        aggregate[key].average_execution_time_ms = Math.round(((aggregate[key].average_execution_time_ms ?? 0) + cur) / 2)
      }
      toolUsage = Object.values(aggregate).sort((a, b) => b.usage_count - a.usage_count).slice(0, 8)
    } else if (error && (error as unknown as { code?: string }).code === 'PGRST204') {
      toolUsage = []
    } else if (error) {
      console.error('[Dashboard] tool usage error', error)
    }
  }

  // Totals from daily
  const totals = daily.reduce(
    (acc, d) => {
      const dayMsgs = d.messages_sent + d.messages_received
      const assistMsgs = d.messages_received
      acc.messages += dayMsgs
      acc.inputTokens += Number(d.total_input_tokens ?? 0)
      acc.outputTokens += Number(d.total_output_tokens ?? 0)
      acc.activeDays += 1
      // Weighted latency by assistant messages if available
      const lat = Number((d as any).avg_response_time_ms ?? 0)
      if (assistMsgs > 0 && lat > 0) {
        acc._latTotal += lat * assistMsgs
        acc._latWeight += assistMsgs
      }
      return acc
    },
    { messages: 0, inputTokens: 0, outputTokens: 0, activeDays: 0, _latTotal: 0, _latWeight: 0 } as any
  ) as { messages: number; inputTokens: number; outputTokens: number; activeDays: number; _latTotal?: number; _latWeight?: number }

  // Estimated cost using simple per-1k pricing map
  const costPerK: Record<string, { in: number; out: number }> = {
    'gpt-4': { in: 0.03, out: 0.06 },
    'gpt-4o': { in: 0.005, out: 0.015 },
    'gpt-3.5-turbo': { in: 0.001, out: 0.002 },
    'gpt-5-mini-2025-08-07': { in: 0.002, out: 0.006 },
    'grok-3-mini': { in: 0.0005, out: 0.0005 },
    'claude-3': { in: 0.015, out: 0.075 },
    'llama-70b': { in: 0.0009, out: 0.0009 },
  }
  const estimateModelCost = (model: string, inTok: number, outTok: number) => {
    const key = Object.keys(costPerK).find(k => model.toLowerCase().includes(k.split('-')[0]))
    const rate = key ? costPerK[key] : costPerK['gpt-3.5-turbo']
    return (inTok / 1000) * rate.in + (outTok / 1000) * rate.out
  }
  const totalCost = (modelUsage ?? []).reduce((sum, m) => sum + estimateModelCost(m.model_name || '', Number(m.total_input_tokens ?? 0), Number(m.total_output_tokens ?? 0)), 0)

  const avgResponseMs = totals._latWeight && totals._latWeight > 0 ? Math.round((totals._latTotal! / totals._latWeight!)) : 0

  const finalTotals = {
    messages: totals.messages,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    activeDays: totals.activeDays,
    avgResponseMs,
    costUsd: Number(totalCost.toFixed(2)),
  }

  return { rangeDays, daily, modelUsage, featureUsage, toolUsage, totals: finalTotals }
}
