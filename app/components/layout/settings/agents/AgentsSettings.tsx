"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useClientAgentStore } from "@/lib/agents/client-store"
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
  const { agents, metrics, syncAgents } = useClientAgentStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const activeAgents = metrics?.activeAgents ?? 0
  const totalExecutions = metrics?.totalExecutions ?? 0

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
      {/* Header */}
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
