// Server-side dashboard data assembler
// Gathers per-user analytics for the dashboard in one call

// IMPORTANT: Use the authenticated server client so views that depend on auth.uid()
// (e.g., user_daily_summary) return rows for the current user. The service-role
// guest client bypasses auth and would make those views empty.
import { createClient as createServerSupabase } from '@/lib/supabase/server'
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
    success_rate?: number | null
  }>
  agentUsage: Array<{
    agent_id: string
    execution_count: number
    success_count: number
    error_count: number
    success_rate: number
    avg_execution_time_ms: number
    delegations_sent?: number
    delegations_received?: number
  }>
  totals: {
    messages: number
    inputTokens: number
    outputTokens: number
    activeDays: number
    avgResponseMs: number
    costUsd: number
    agentsUsed: number
  }
}

async function getClient() {
  const sb = await createServerSupabase()
  if (!sb) throw new Error('Supabase disabled')
  return sb as unknown as SupabaseClient<Database>
}

export async function getDashboardData(userId: string, rangeDays: number = 30): Promise<DashboardData> {
  console.log(`[Dashboard] Getting data for userId: ${userId}, rangeDays: ${rangeDays}`)
  
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
    console.log(`[Dashboard] Querying model_usage_analytics for userId: ${userId}, from: ${from}`)
    const { data, error } = await sb
      .from('model_usage_analytics')
      .select('model_name,message_count,total_input_tokens,total_output_tokens,successful_requests,failed_requests,usage_date')
      .eq('user_id', userId)
      .gte('usage_date', from)
    console.log(`[Dashboard] Model usage query result:`, { dataLength: data?.length, error })
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

  // Estimated cost using simple per-1k pricing map (updated with requested pricing)
  const costPerK: Record<string, { in: number; out: number }> = {
    'gpt-4': { in: 0.03, out: 0.06 },
    'gpt-4o': { in: 0.005, out: 0.015 },
    'gpt-3.5-turbo': { in: 0.001, out: 0.002 },
    // GPT-5 mini: $2.00 per 1M (input and output)
    'gpt-5-mini-2025-08-07': { in: 0.002, out: 0.002 },
    // Grok-3 mini: $0.40 per 1M (input and output)
    'grok-3-mini': { in: 0.0004, out: 0.0004 },
    'claude-3': { in: 0.015, out: 0.075 },
    'llama-70b': { in: 0.0009, out: 0.0009 },
  }
  const estimateModelCost = (model: string, inTok: number, outTok: number) => {
    const m = model.toLowerCase()
    // 1) Exact match first
    let matchKey = Object.keys(costPerK).find(k => k.toLowerCase() === m)
    // 2) Longest partial match (prefer more specific like gpt-5-mini over generic gpt)
    if (!matchKey) {
      const candidates = Object.keys(costPerK)
        .filter(k => m.includes(k.toLowerCase()) || k.toLowerCase().includes(m))
        .sort((a, b) => b.length - a.length)
      matchKey = candidates[0]
    }
    const rate = matchKey ? costPerK[matchKey] : costPerK['gpt-3.5-turbo']
    return (inTok / 1000) * rate.in + (outTok / 1000) * rate.out
  }
  const totalCost = (modelUsage ?? []).reduce((sum, m) => sum + estimateModelCost(m.model_name || '', Number(m.total_input_tokens ?? 0), Number(m.total_output_tokens ?? 0)), 0)

  const avgResponseMs = totals._latWeight && totals._latWeight > 0 ? Math.round((totals._latTotal! / totals._latWeight!)) : 0

  // Fallback: if daily view returned nothing (or zero tokens), derive totals from modelUsage
  if ((daily?.length ?? 0) === 0 || (totals.inputTokens === 0 && totals.outputTokens === 0)) {
    const fromModels = (modelUsage ?? []).reduce(
      (acc, m) => {
        acc.messages += Number(m.message_count ?? 0)
        acc.inputTokens += Number(m.total_input_tokens ?? 0)
        acc.outputTokens += Number(m.total_output_tokens ?? 0)
        return acc
      },
      { messages: 0, inputTokens: 0, outputTokens: 0 }
    )
    // Only override if we actually have some data from models
    if (fromModels.messages > 0 || fromModels.inputTokens > 0 || fromModels.outputTokens > 0) {
      totals.messages = fromModels.messages
      totals.inputTokens = fromModels.inputTokens
      totals.outputTokens = fromModels.outputTokens
    }
  }

  // Agent usage analytics (placeholder until migration runs)
  let agentUsage: DashboardData['agentUsage'] = []
  let uniqueAgents = 0

  const finalTotals = {
    messages: totals.messages,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    activeDays: totals.activeDays,
    avgResponseMs,
    costUsd: Number(totalCost.toFixed(2)),
    agentsUsed: uniqueAgents,
  }

  return { rangeDays, daily, modelUsage, featureUsage, toolUsage, agentUsage, totals: finalTotals }
}
