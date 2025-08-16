"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, KpiCard, Sparkline } from './charts'
import { ChartPieSlice, RocketLaunch, GearSix, PuzzlePiece, Timer } from '@phosphor-icons/react'

export function ActivitySection({ daily }: { daily: Array<{ usage_date: string; messages_sent: number; messages_received: number }> }) {
  const series = daily.map(d => d.messages_sent + d.messages_received)
  return (
    <Card className="col-span-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RocketLaunch className="size-4 text-primary" />
          <CardTitle>Actividad reciente</CardTitle>
        </div>
        <CardDescription>Mensajes por día (últimos {daily.length} días)</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length ? (
          <Sparkline data={series} className="w-full" />
        ) : (
          <div className="text-muted-foreground text-sm">Sin datos disponibles.</div>
        )}
      </CardContent>
    </Card>
  )
}

export function ModelsSection({ modelUsage }: { modelUsage: Array<{ model_name: string; message_count: number }> }) {
  const data = modelUsage.map(m => ({ label: m.model_name, value: m.message_count }))
  return (
    <Card className="col-span-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartPieSlice className="size-4 text-primary" />
          <CardTitle>Modelos más usados</CardTitle>
        </div>
        <CardDescription>Mensajes por modelo</CardDescription>
      </CardHeader>
      <CardContent>
  {data.length ? <BarChart data={data} /> : <div className="text-muted-foreground text-sm">Sin datos.</div>}
      </CardContent>
    </Card>
  )
}

export function FeaturesSection({ features }: { features: Array<{ feature_name: string; usage_count: number }> }) {
  const data = features.map(f => ({ label: f.feature_name, value: f.usage_count }))
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GearSix className="size-4 text-primary" />
          <CardTitle>Features destacadas</CardTitle>
        </div>
        <CardDescription>Top interacciones</CardDescription>
      </CardHeader>
      <CardContent>
  {data.length ? <BarChart data={data} /> : <div className="text-muted-foreground text-sm">Sin datos.</div>}
      </CardContent>
    </Card>
  )
}

export function ToolsSection({ tools }: { tools: Array<{ tool_name: string; usage_count: number }> }) {
  const data = tools.map(t => ({ label: t.tool_name, value: t.usage_count }))
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PuzzlePiece className="size-4 text-primary" />
          <CardTitle>Herramientas más usadas</CardTitle>
        </div>
        <CardDescription>Invocaciones por herramienta</CardDescription>
      </CardHeader>
      <CardContent>
  {data.length ? <BarChart data={data} /> : <div className="text-muted-foreground text-sm">Sin datos.</div>}
      </CardContent>
    </Card>
  )
}

export function QuickStats({ totals, days }: { totals: { messages: number; inputTokens: number; outputTokens: number; activeDays: number }; days: number }) {
  const avgMsgs = totals.activeDays ? Math.round(totals.messages / totals.activeDays) : 0
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  <KpiCard title={`Mensajes (${days} días)`} value={totals.messages} />
  <KpiCard title="Tokens (input)" value={totals.inputTokens} />
  <KpiCard title="Tokens (output)" value={totals.outputTokens} />
  <KpiCard title="Promedio diario" value={avgMsgs} delta={`${totals.activeDays} días activos`}>
        <Timer className="size-4 text-muted-foreground" />
      </KpiCard>
    </div>
  )
}
