'use client'

/**
 * Agent Value Proposition Component
 * Educational component that explains the benefits and value of using AI agents
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb,
  Clock,
  TrendUp,
  Shield,
  Lightning,
  Users,
  Brain,
  Target,
  CheckCircle
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface ValueProposition {
  icon: React.ComponentType<any>
  title: string
  description: string
  benefits: string[]
  color: string
}

const valuePropositions: ValueProposition[] = [
  {
    icon: Clock,
    title: "Ahorro de Tiempo",
    description: "Automatiza tareas repetitivas y acelera tu flujo de trabajo",
    benefits: [
      "Procesamiento 24/7 sin interrupciones",
      "Ejecución paralela de múltiples tareas",
      "Reducción del 70% en tiempo de respuesta"
    ],
    color: "text-blue-500"
  },
  {
    icon: Target,
    title: "Precisión Mejorada",
    description: "Consistencia y exactitud en cada ejecución",
    benefits: [
      "Eliminación de errores humanos",
      "Procesos estandarizados",
      "Resultados predecibles y confiables"
    ],
    color: "text-green-500"
  },
  {
    icon: Brain,
    title: "Inteligencia Avanzada",
    description: "Capacidades cognitivas superiores a las tareas tradicionales",
    benefits: [
      "Análisis de patrones complejos",
      "Aprendizaje continuo",
      "Toma de decisiones inteligente"
    ],
    color: "text-purple-500"
  },
  {
    icon: TrendUp,
    title: "Escalabilidad",
    description: "Crece con tus necesidades sin límites técnicos",
    benefits: [
      "Manejo de cargas de trabajo masivas",
      "Expansión instantánea de capacidades",
      "Optimización automática de recursos"
    ],
    color: "text-orange-500"
  },
  {
    icon: Shield,
    title: "Confiabilidad",
    description: "Sistema robusto con monitoreo y recuperación automática",
    benefits: [
      "Disponibilidad 99.9%",
      "Recuperación automática de fallos",
      "Auditoría completa de todas las acciones"
    ],
    color: "text-red-500"
  },
  {
    icon: Users,
    title: "Colaboración",
    description: "Trabajo en equipo entre agentes especializados",
    benefits: [
      "Especialización por dominio",
      "Coordinación inteligente",
      "Resultados sinérgicos superiores"
    ],
    color: "text-teal-500"
  }
]

export function AgentValueProposition() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <Lightbulb className="size-5 text-primary" weight="duotone" />
          <span className="text-sm font-medium text-primary">¿Por qué usar Agentes IA?</span>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Potencia tu Productividad con IA
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Los agentes de IA representan el futuro del trabajo inteligente.
          Descubre cómo pueden transformar tu forma de trabajar y lograr más.
        </p>
      </div>

      {/* Value Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {valuePropositions.map((prop, index) => {
          const IconComponent = prop.icon
          return (
            <div
              key={prop.title}
              className={cn(
                "group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/10 border border-white/10 shadow-glass-sm transition-all duration-500 hover:scale-105 hover:shadow-glass animate-scale-in",
                `animation-delay-${index * 100}`
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br border transition-all duration-300 group-hover:scale-110",
                    `from-${prop.color.split('-')[1]}-500/20 to-${prop.color.split('-')[1]}-500/10`,
                    `border-${prop.color.split('-')[1]}-500/20`
                  )}>
                    <IconComponent
                      className={cn("size-6", prop.color)}
                      weight="duotone"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{prop.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      Beneficio #{index + 1}
                    </Badge>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {prop.description}
                </p>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground/80">Beneficios clave:</h4>
                  <ul className="space-y-1">
                    {prop.benefits.map((benefit, benefitIndex) => (
                      <li
                        key={benefitIndex}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle className="size-4 text-green-500 flex-shrink-0" weight="duotone" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Call to Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
            <Lightning className="size-5 text-primary" weight="duotone" />
            <span className="text-sm font-medium text-primary">¡Comienza Ahora!</span>
          </div>
          <h3 className="text-xl font-bold">
            Crea tu Primer Agente en Minutos
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Experimenta el poder de la automatización inteligente.
            Tus agentes aprenderán y mejorarán con cada interacción.
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Badge variant="outline" className="px-3 py-1">
              ⚡ Configuración en 2 minutos
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              🎯 Resultados inmediatos
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              📈 Mejora continua
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
