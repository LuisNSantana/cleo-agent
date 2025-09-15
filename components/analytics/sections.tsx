"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, KpiCard, Sparkline, CHART_PALETTE } from './charts'
import { ChartPieSlice, RocketLaunch, GearSix, PuzzlePiece, Timer } from '@phosphor-icons/react'

export function ActivitySection({ daily }: { daily: Array<{ usage_date: string; messages_sent: number; messages_received: number; total_input_tokens?: number | null; total_output_tokens?: number | null; avg_response_time_ms?: number | null }> }) {
  const series = daily.map(d => d.messages_sent + d.messages_received)
  const hasTokenData = daily.some(d => typeof d.total_input_tokens === 'number' || typeof d.total_output_tokens === 'number')
  const inputSeries = daily.map(d => Number(d.total_input_tokens ?? 0))
  const outputSeries = daily.map(d => Number(d.total_output_tokens ?? 0))
  const hasLatency = daily.some(d => typeof d.avg_response_time_ms === 'number' && Number(d.avg_response_time_ms) > 0)
  const latencySeries = daily.map(d => Number(d.avg_response_time_ms ?? 0))
  return (
  <Card className="md:col-span-1 lg:col-span-3 bg-gradient-to-b from-white/[0.02] to-transparent dark:from-white/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RocketLaunch className="size-4 text-primary" />
          <CardTitle>Recent activity</CardTitle>
        </div>
        <CardDescription>
          Messages per day{hasTokenData ? ' • tokens' : ''}{hasLatency ? ' • latency' : ''} (last {daily.length} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {series.length ? (
          <div className="space-y-4">
            <Sparkline data={series} className="w-full" color={CHART_PALETTE[0]} />
            {hasTokenData && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Input tokens</div>
                  <Sparkline data={inputSeries} className="w-full" color={CHART_PALETTE[1]} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Output tokens</div>
                  <Sparkline data={outputSeries} className="w-full" color={CHART_PALETTE[3]} />
                </div>
              </div>
            )}
            {hasLatency && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Avg response time (ms)</div>
                <Sparkline data={latencySeries} className="w-full" color={CHART_PALETTE[4]} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No data available.</div>
        )}
      </CardContent>
    </Card>
  )
}

export function ModelsSection({ modelUsage }: { modelUsage: Array<{ model_name: string; message_count: number }> }) {
  const data = modelUsage.map(m => ({ label: m.model_name, value: m.message_count }))
  return (
  <Card className="md:col-span-1 lg:col-span-3 bg-gradient-to-b from-white/[0.02] to-transparent dark:from-white/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartPieSlice className="size-4 text-primary" />
          <CardTitle>Top models</CardTitle>
        </div>
        <CardDescription>Messages by model</CardDescription>
      </CardHeader>
      <CardContent>
  {data.length ? <BarChart data={data} scrollable minBarWidth={22} maxItems={16} /> : <div className="text-muted-foreground text-sm">No data.</div>}
      </CardContent>
    </Card>
  )
}

export function FeaturesSection({ features }: { features: Array<{ feature_name: string; usage_count: number }> }) {
  const data = features.map(f => ({ label: f.feature_name, value: f.usage_count }))
  return (
  <Card className="md:col-span-1 lg:col-span-2 bg-gradient-to-b from-white/[0.02] to-transparent dark:from-white/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GearSix className="size-4 text-primary" />
          <CardTitle>Featured features</CardTitle>
        </div>
        <CardDescription>Top interactions</CardDescription>
      </CardHeader>
      <CardContent>
  {data.length ? <BarChart data={data} colors={[CHART_PALETTE[2], CHART_PALETTE[5], CHART_PALETTE[6], CHART_PALETTE[7], CHART_PALETTE[8]]} /> : <div className="text-muted-foreground text-sm">No data.</div>}
      </CardContent>
    </Card>
  )
}

export function ToolsSection({ tools }: { tools: Array<{ tool_name: string; usage_count: number }> }) {
  const data = tools.map(t => ({ label: t.tool_name, value: t.usage_count }))
  return (
  <Card className="md:col-span-1 lg:col-span-2 bg-gradient-to-b from-white/[0.02] to-transparent dark:from-white/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PuzzlePiece className="size-4 text-primary" />
          <CardTitle>Most used tools</CardTitle>
        </div>
        <CardDescription>Tool invocations</CardDescription>
      </CardHeader>
      <CardContent>
  {data.length ? (
          <BarChart
            data={data}
            colors={[CHART_PALETTE[8], CHART_PALETTE[0], CHART_PALETTE[1], CHART_PALETTE[3], CHART_PALETTE[4]]}
            scrollable
            minBarWidth={22}
            maxItems={16}
          />
        ) : (
          <div className="text-muted-foreground text-sm">No data.</div>
        )}
      </CardContent>
    </Card>
  )
}

export function QuickStats({ totals, days }: { totals: { messages: number; inputTokens: number; outputTokens: number; activeDays: number; avgResponseMs?: number; costUsd?: number }; days: number }) {
  const avgMsgs = totals.activeDays ? Math.round(totals.messages / totals.activeDays) : 0
  // Locale-stable cost string for SSR/CSR hydration consistency
  const costStr = Number.isFinite(totals.costUsd as number)
    ? (Number(totals.costUsd) || 0).toFixed(2)
    : '0.00'
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
  <KpiCard title={`Messages (${days} days)`} value={totals.messages} />
  <KpiCard title="Tokens (input)" value={totals.inputTokens} />
  <KpiCard title="Tokens (output)" value={totals.outputTokens} />
  <KpiCard title="Daily average" value={avgMsgs} delta={`${totals.activeDays} active days`}>
        <Timer className="size-4 text-muted-foreground" />
      </KpiCard>
  <KpiCard title="Avg latency (ms)" value={Math.max(0, Math.round(totals.avgResponseMs || 0))} />
  <KpiCard title="Est. cost (USD)" value={costStr} />
    </div>
  )
}
