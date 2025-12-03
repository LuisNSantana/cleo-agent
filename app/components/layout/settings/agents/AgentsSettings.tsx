"use client"

import React, { useMemo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useClientAgentStore } from "@/lib/agents/client-store"
import { cn } from "@/lib/utils"
import type { AgentConfig } from "@/lib/agents/types"
import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import { toast } from "@/components/ui/toast"
import { nanoid } from "nanoid"
import {
  GraphIcon,
  GearIcon,
  ChatCircleIcon,
  ListChecksIcon,
  ArrowRightIcon,
  RobotIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react"

type Module = {
  title: string
  description: string
  href: string
  icon: React.ComponentType<any>
  features: string[]
  stats: { label: string; value: number }
}

export function AgentsSettings() {
  const {
    agents,
    metrics,
    executions,
    syncAgents,
    addAgent,
    deleteAgent,
  } = useClientAgentStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [query, setQuery] = useState("")

  const activeAgents = metrics?.activeAgents ?? 0
  const totalExecutions = metrics?.totalExecutions ?? 0
  const totalAgents = agents.length

  const filteredAgents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return agents
    return agents.filter((agent) => {
      const haystack = `${agent.name} ${agent.description || ""} ${(agent.tags || []).join(" ")}`
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [agents, query])

  const pinnedAgents = useMemo(
    () => filteredAgents.filter((agent) => agent.tags?.includes("favorite")),
    [filteredAgents]
  )
  const regularAgents = useMemo(
    () => filteredAgents.filter((agent) => !agent.tags?.includes("favorite")),
    [filteredAgents]
  )

  const getAgentStatus = useCallback(
    (agentId: string) => {
      const runningExecution = executions.find(
        (exec) => exec.agentId === agentId && exec.status === "running"
      )
      if (runningExecution) {
        return {
          tone: "active" as const,
          label: "En progreso",
          lastActive: runningExecution.startTime,
        }
      }
      const latestExecution = [...executions]
        .filter((exec) => exec.agentId === agentId)
        .sort(
          (a, b) =>
            new Date(b.endTime || b.startTime).getTime() -
            new Date(a.endTime || a.startTime).getTime()
        )[0]

      if (!latestExecution) {
        return { tone: "idle" as const, label: "Listo" }
      }

      if (latestExecution.status === "failed") {
        return {
          tone: "error" as const,
          label: "Necesita atención",
          lastActive: latestExecution.endTime || latestExecution.startTime,
        }
      }

      return {
        tone: "idle" as const,
        label: "Listo",
        lastActive: latestExecution.endTime || latestExecution.startTime,
      }
    },
    [executions]
  )

  const recentActivity = useMemo(() => {
    return [...executions]
      .sort(
        (a, b) =>
          new Date(b.endTime || b.startTime).getTime() -
          new Date(a.endTime || a.startTime).getTime()
      )
      .slice(0, 5)
  }, [executions])

  const completedExecutions = useMemo(
    () => executions.filter((exec) => exec.status === "completed"),
    [executions]
  )
  const failedExecutions = useMemo(
    () => executions.filter((exec) => exec.status === "failed"),
    [executions]
  )
  const runningExecutions = useMemo(
    () => executions.filter((exec) => exec.status === "running"),
    [executions]
  )

  const averageDurationMs = useMemo(() => {
    const durations = executions
      .filter((exec) => exec.startTime && exec.endTime)
      .map(
        (exec) =>
          new Date(exec.endTime!).getTime() - new Date(exec.startTime).getTime()
      )
    if (!durations.length) return null
    const total = durations.reduce((sum, value) => sum + value, 0)
    return Math.round(total / durations.length)
  }, [executions])

  const successRate = useMemo(() => {
    const total =
      completedExecutions.length + failedExecutions.length || completedExecutions.length
    if (!total) return 100
    return Math.round((completedExecutions.length / total) * 100)
  }, [completedExecutions.length, failedExecutions.length])

  const fleetBreakdown = useMemo(() => {
    const issues = failedExecutions.length
    const active = runningExecutions.length
    const total = Math.max(totalAgents, 1)
    const idle = Math.max(total - active - issues, 0)
    return { issues, active, idle, total }
  }, [failedExecutions.length, runningExecutions.length, totalAgents])

  const executionTrend = useMemo(() => {
    const now = new Date()
    const keyForDate = (date: Date) =>
      `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const weekdayFormatter = new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
    })
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now)
      date.setDate(now.getDate() - (6 - index))
      return {
        key: keyForDate(date),
        label: weekdayFormatter.format(date).toUpperCase(),
        count: 0,
      }
    })
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    executions.forEach((exec) => {
      const timestamp = new Date(exec.endTime || exec.startTime || Date.now())
      const diffDays = Math.floor(
        (now.getTime() - timestamp.getTime()) / 86400000
      )
      if (diffDays >= 0 && diffDays < 7) {
        const key = keyForDate(timestamp)
        const bucket = bucketMap.get(key)
        if (bucket) bucket.count += 1
      }
    })
    return buckets.map(({ label, count }) => ({ label, count }))
  }, [executions])

  const modules: Module[] = useMemo(
    () => [
      {
        title: "Agent Architecture",
        description:
          "Visualiza relaciones y estructura entre agentes con un grafo interactivo",
        href: "/agents/architecture",
        icon: GraphIcon,
        features: [
          "Grafo interactivo",
          "Monitor en tiempo real",
          "Ejecución rápida",
        ],
        stats: { label: "Agentes activos", value: activeAgents },
      },
      {
        title: "Administrar Agentes",
        description: "Crea, edita y configura agentes y sus herramientas",
        href: "/agents/manage",
        icon: GearIcon,
        features: ["CRUD completo", "Configuración avanzada", "Herramientas"],
        stats: { label: "Total agentes", value: agents.length },
      },
      {
        title: "Chat de Agentes",
        description: "Conversa con tus agentes y revisa el historial",
        href: "/agents/chat",
        icon: ChatCircleIcon,
        features: ["Chat en vivo", "Historial", "Multi-agente"],
        stats: { label: "Conversaciones", value: 0 },
      },
      {
        title: "Tareas de Agentes",
        description: "Asigna tareas y sigue el progreso y estado",
        href: "/agents/tasks",
        icon: ListChecksIcon,
        features: ["Asignación", "Prioridades", "Estados"],
        stats: { label: "Tareas activas", value: 0 },
      },
    ],
    [activeAgents, agents.length]
  )

  const handleRefreshAgents = async () => {
    setIsRefreshing(true)
    try {
      await syncAgents()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="w-full space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                  <Image
                    src="/icons/control-center.png"
                    alt="Agent Control Center"
                    width={48}
                    height={48}
                    className="object-contain p-1"
                  />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-strong">
                    Agent Control Center
                  </h1>
                  <p className="text-sm sm:text-base text-subtle mt-1">
                    Gestiona tu sistema multi-agente desde un único lugar
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="outline" className="text-foreground">
                  {agents.length} Agents
                </Badge>
                <Badge variant="outline" className="text-foreground">
                  {totalExecutions} Exec
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex flex-col gap-2 text-foreground md:flex-row md:items-center md:justify-between">
            <span>Estado del sistema</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAgents}
              disabled={isRefreshing}
              className="self-start md:self-auto"
            >
              {isRefreshing ? "Sincronizando..." : "Sincronizar agentes"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <KpiBadge label="Activos" value={activeAgents} />
            <KpiBadge label="Ejecuciones" value={totalExecutions} />
            <KpiBadge
              label="Error rate"
              value={
                metrics?.errorRate != null
                  ? `${(metrics.errorRate * 100).toFixed(1)}%`
                  : "0%"
              }
            />
            <KpiBadge
              label="Respuesta media"
              value={
                metrics?.averageResponseTime
                  ? `${Math.round(metrics.averageResponseTime)}ms`
                  : "—"
              }
            />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar agente, capacidad o sector…"
              className="md:max-w-sm"
            />
            <span className="text-xs text-muted-foreground">
              {filteredAgents.length} agentes listos para delegar
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <FleetHealthCard
          breakdown={fleetBreakdown}
          averageResponse={metrics?.averageResponseTime}
        />
        <ExecutionInsightCard
          successRate={successRate}
          averageDurationMs={averageDurationMs}
          failedExecutions={failedExecutions.length}
        />
        <UsageTrendCard
          data={executionTrend}
          totalExecutions={executions.length}
        />
      </div>

      {(pinnedAgents.length > 0 || regularAgents.length > 0) ? (
        <div className="space-y-6">
          {pinnedAgents.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Favoritos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Agentes fijados para acceso inmediato.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pinnedAgents.map((agent) => {
                  const status = getAgentStatus(agent.id)
                  return (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      status={status}
                    />
                  )
                })}
              </div>
            </section>
          )}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Agentes
                </h3>
                <p className="text-xs text-muted-foreground">
                  {regularAgents.length} resultados
                </p>
              </div>
            </div>
            {regularAgents.length === 0 ? (
              <Card className="border-dashed border-border bg-muted/20">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No encontramos agentes con ese criterio. Intenta limpiar el filtro.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {regularAgents.map((agent) => {
                  const status = getAgentStatus(agent.id)
                  return (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      status={status}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes agentes configurados. Crea uno desde “Administrar agentes”.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ejecuciones registradas en las últimas horas.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((execution) => {
                  const meta = getAgentMetadata(execution.agentId)
                  const status =
                    execution.status === "failed"
                      ? "error"
                      : execution.status === "running"
                      ? "active"
                      : "idle"
                  return (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <AgentStatusBadge tone={status as AgentStatusTone} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {meta.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(
                              new Date(execution.endTime || execution.startTime)
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {execution.status === "failed"
                          ? "Error"
                          : execution.status === "completed"
                          ? "Completado"
                          : "En curso"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <MiniAgentCrud
          agents={agents}
          onCreate={addAgent}
          onDelete={deleteAgent}
        />
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {modules.map((m, index) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card className="h-full border-border bg-card transition-colors hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                        {m.title}
                      </CardTitle>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-strong">
                        {m.stats.value}
                      </div>
                      <div className="text-xs text-subtle">{m.stats.label}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-subtle mb-4">{m.description}</p>
                  <ul className="space-y-1.5 mb-4">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground/40" />
                        <span className="text-soft">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={m.href}>
                    <Button className="w-full" size="sm">
                      <span className="font-medium">Abrir módulo</span>
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <RobotIcon className="w-5 h-5" />
              Acciones rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
              <Link href="/agents/manage">
                <Button variant="outline" className="w-full justify-center md:justify-start gap-2 h-11">
                  <GearIcon className="w-5 h-5" />
                  Gestionar agentes
                </Button>
              </Link>
              <Link href="/agents/architecture">
                <Button variant="outline" className="w-full justify-center md:justify-start gap-2 h-11">
                  <GraphIcon className="w-5 h-5" />
                  Ver arquitectura
                </Button>
              </Link>
              <Link href="/agents/chat">
                <Button variant="outline" className="w-full justify-center md:justify-start gap-2 h-11">
                  <ChatCircleIcon className="w-5 h-5" />
                  Iniciar chat
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleRefreshAgents}
                disabled={isRefreshing}
                className="w-full justify-center md:justify-start gap-2 h-11 disabled:opacity-50"
              >
                <ArrowClockwiseIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Sincronizando..." : "Sincronizar agentes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-muted-foreground text-xs">Multi-Agent System • Cleo</p>
    </div>
  )
}

type AgentStatusTone = 'active' | 'idle' | 'error'

type AgentStatusInfo = {
  tone: AgentStatusTone
  label: string
  lastActive?: Date
}

function AgentCard({ agent, status }: { agent: AgentConfig; status: AgentStatusInfo }) {
  const quickActions = [
    {
      label: "Chat",
      href: `/agents/chat?agentId=${agent.id}`,
      icon: ChatCircleIcon,
    },
    {
      label: "Analytics",
      href: `/agents/manage?agent=${agent.id}#analytics`,
      icon: GraphIcon,
    },
    {
      label: "Configurar",
      href: `/agents/manage?agent=${agent.id}`,
      icon: GearIcon,
    },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base text-foreground">
              {agent.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {agent.description || "Agente sin descripción"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {agent.role}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {agent.model}
              </Badge>
              {(agent.tags || []).slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <AgentStatusBadge tone={status.tone} />
            <span className="text-[11px] text-muted-foreground">
              {status.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Última actividad: {formatRelativeTime(status.lastActive)}
        </p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <Button
              key={label}
              asChild
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <Link href={href}>
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AgentStatusBadge({ tone }: { tone: AgentStatusTone }) {
  const palette: Record<AgentStatusTone, string> = {
    active: "bg-emerald-500",
    idle: "bg-slate-400",
    error: "bg-red-500",
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", palette[tone])} />
      {tone === "active" ? "Activo" : tone === "error" ? "Error" : "Listo"}
    </span>
  )
}

function KpiBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function formatRelativeTime(date?: Date) {
  if (!date) return "—"
  const time = new Date(date).getTime()
  if (Number.isNaN(time)) return "—"
  const diffMs = Date.now() - time
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return "justo ahora"
  if (diffMinutes < 60) return `hace ${diffMinutes} min`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.round(diffHours / 24)
  return `hace ${diffDays} d`
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

type FleetBreakdown = {
  active: number
  idle: number
  issues: number
  total: number
}

function FleetHealthCard({
  breakdown,
  averageResponse,
}: {
  breakdown: FleetBreakdown
  averageResponse?: number | null
}) {
  const sections = [
    {
      label: "Activos",
      value: breakdown.active,
      percent: Math.round((breakdown.active / breakdown.total) * 100),
      tone: "bg-emerald-500",
    },
    {
      label: "Listos",
      value: breakdown.idle,
      percent: Math.round((breakdown.idle / breakdown.total) * 100),
      tone: "bg-slate-400",
    },
    {
      label: "Incidencias",
      value: breakdown.issues,
      percent: Math.round((breakdown.issues / breakdown.total) * 100),
      tone: "bg-red-500",
    },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">
          Fleet health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{section.label}</span>
              <span className="font-medium text-foreground">
                {section.value} · {section.percent || 0}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", section.tone)}
                style={{ width: `${section.percent || 0}%` }}
              />
            </div>
          </div>
        ))}
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Latencia promedio
          </p>
          <p className="text-lg font-semibold text-foreground">
            {averageResponse ? `${Math.round(averageResponse)}ms` : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ExecutionInsightCard({
  successRate,
  averageDurationMs,
  failedExecutions,
}: {
  successRate: number
  averageDurationMs: number | null
  failedExecutions: number
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">
          Execution insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Tasa de éxito
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">
              {successRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              vs fallos: {failedExecutions}
            </span>
          </div>
          <Progress value={successRate} className="mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Duración media
            </p>
            <p className="text-lg font-semibold text-foreground">
              {averageDurationMs ? formatDuration(averageDurationMs) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Alertas abiertas
            </p>
            <p className="text-lg font-semibold text-foreground">
              {failedExecutions}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Supervisa la estabilidad de tus agentes y toma acción rápida cuando alguna ejecución falle.
        </p>
      </CardContent>
    </Card>
  )
}

type TrendPoint = {
  label: string
  count: number
}

function UsageTrendCard({
  data,
  totalExecutions,
}: {
  data: TrendPoint[]
  totalExecutions: number
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">
          Actividad (7 días)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total ejecuciones
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {totalExecutions}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Últimos 7 días
          </Badge>
        </div>
        <UsageSparkline data={data} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>+ Visibilidad diaria</span>
          <Link
            href="/agents/tasks"
            className="text-primary font-medium hover:underline"
          >
            Ver tablero
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function UsageSparkline({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.map((item) => item.count), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((point) => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-md bg-gradient-to-t from-primary to-primary/60"
            style={{ height: `${(point.count / max) * 100 || 4}%` }}
          />
          <span className="text-[11px] uppercase text-muted-foreground">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  )
}

type MiniAgentCrudProps = {
  agents: AgentConfig[]
  onCreate: (agent: AgentConfig) => void
  onDelete: (id: string) => void
}

function MiniAgentCrud({ agents, onCreate, onDelete }: MiniAgentCrudProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [role, setRole] = useState<AgentConfig["role"]>("specialist")
  const [model, setModel] = useState("grok-4-1-fast-reasoning")
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agents, selectedAgentId])

  const handleQuickCreate = () => {
    if (!name.trim()) {
      toast({
        title: "Asigna un nombre al agente",
        status: "warning",
      })
      return
    }
    const baseSlug = slugifyName(name)
    const idCandidate = baseSlug || `agent-${nanoid(6)}`
    const newAgent: AgentConfig = {
      id: agents.some((agent) => agent.id === idCandidate)
        ? `${idCandidate}-${nanoid(4)}`
        : idCandidate,
      name: name.trim(),
      description: description || "Draft agent created from dashboard",
      role,
      model: model || "grok-4-fast",
      temperature: 0.35,
      maxTokens: 32768,
      tools: [],
      prompt: description || "Draft blueprint. Configure full prompt in Administrar agentes.",
      color: "#0EA5E9",
      icon: "🤖",
      tags: ["dashboard", role],
    }
    onCreate(newAgent)
    toast({
      title: "Agente creado en borrador",
      description: "Finaliza su configuración en Administrar agentes.",
      status: "success",
    })
    setName("")
    setDescription("")
  }

  const handleDuplicate = () => {
    const source = agents.find((agent) => agent.id === selectedAgentId)
    if (!source) return
    const copy: AgentConfig = {
      ...source,
      id: `${source.id}-copy-${nanoid(4)}`,
      name: `${source.name} Copy`,
      tags: [...(source.tags || []), "duplicado"],
    }
    onCreate(copy)
    toast({
      title: "Agente duplicado",
      description: `${source.name} se copió como borrador.`,
      status: "success",
    })
  }

  const handleArchive = () => {
    if (!selectedAgentId) return
    onDelete(selectedAgentId)
    toast({
      title: "Agente archivado",
      status: "info",
    })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">CRUD rápido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Crear borrador
          </p>
          <Input
            placeholder="Nombre del agente"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AgentConfig["role"])
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="supervisor">Supervisor</option>
              <option value="specialist">Specialist</option>
              <option value="worker">Worker</option>
              <option value="evaluator">Evaluator</option>
            </select>
            <Input
              placeholder="Modelo (ej. grok-4-fast)"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          </div>
          <Textarea
            placeholder="Objetivo / descripción corta"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[70px]"
          />
          <Button className="w-full" onClick={handleQuickCreate}>
            Publicar borrador
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Gestionar existente
          </p>
          <select
            value={selectedAgentId}
            onChange={(event) => setSelectedAgentId(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleDuplicate}>
              Duplicar
            </Button>
            <Button variant="destructive" onClick={handleArchive}>
              Archivar
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Usa este panel para prototipos rápidos. Para configuración avanzada, abre “Administrar agentes”.
        </p>
      </CardContent>
    </Card>
  )
}

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
