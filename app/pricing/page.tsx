"use client"

import { motion } from "framer-motion"
import { CheckIcon, StarIcon, ZapIcon, ShieldIcon, UsersIcon, CreditCardIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfecto para empezar",
    credits: "100",
    agents: "1",
    features: [
      "Chat básico con Cleo",
      "3 agentes predefinidos",
      "Historial 7 días",
      "Integraciones limitadas",
      "Soporte comunitario"
    ],
    cta: "Comenzar Gratis",
    popular: false,
    color: "from-gray-500 to-gray-600"
  },
  {
    name: "Pro",
    price: "$19.99",
    description: "Para profesionales serios",
    credits: "2,500",
    agents: "7",
    features: [
      "Todos los agentes predefinidos",
      "Historial ilimitado",
      "Integraciones completas",
      "Tool invocations avanzadas",
      "Exportación de resultados",
      "Soporte prioritario",
      "Agentes beta"
    ],
    cta: "Empezar Pro",
    popular: true,
    color: "from-purple-500 to-purple-600"
  },
  {
    name: "Pro+",
    price: "$49.99",
    description: "Potencia máxima",
    credits: "7,500",
    agents: "15",
    features: [
      "Todo lo de Pro",
      "Modelos premium (GPT-4)",
      "Web scraping ilimitado",
      "Automatizaciones programadas",
      "API access",
      "White-label básico",
      "Soporte 24/7"
    ],
    cta: "Ir Pro+",
    popular: false,
    color: "from-blue-500 to-blue-600"
  },
  {
    name: "Business",
    price: "Custom",
    description: "Para equipos empresariales",
    credits: "Ilimitados",
    agents: "Ilimitados",
    features: [
      "Todo lo de Pro+",
      "Agentes personalizados con branding",
      "On-premise deployment",
      "SSO y seguridad enterprise",
      "SLA garantizado",
      "Training personalizado",
      "Soporte dedicado"
    ],
    cta: "Contactar Ventas",
    popular: false,
    color: "from-indigo-500 to-indigo-600"
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Badge variant="outline" className="mb-4">
              🚀 Precios transparentes, sin sorpresas
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Elige tu plan
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Desde principiantes hasta empresas, tenemos el plan perfecto para ti. 
              Empieza gratis y escala cuando lo necesites.
            </p>
          </motion.div>

          {/* Credit System Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <Card className="p-6 bg-gradient-to-r from-muted/50 to-transparent border-border/50">
              <div className="flex items-center gap-4 mb-4">
                <CreditCardIcon className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Sistema de Créditos Inteligente</h3>
                  <p className="text-sm text-muted-foreground">
                    Paga solo por lo que usas. Cada modelo tiene su propio costo.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <ZapIcon className="w-4 h-4 text-green-500" />
                  <span>1 crédito = $0.01 USD</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZapIcon className="w-4 h-4 text-blue-500" />
                  <span>Basado en tokens reales</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZapIcon className="w-4 h-4 text-purple-500" />
                  <span>Transparencia total</span>
                </div>
              </div>
              
              {/* Model Pricing Examples */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">🚀 Grok-4-Fast</span>
                    <span className="text-xs font-mono text-green-700 dark:text-green-300">~0.001 créditos/msg</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Ultra económico • Usado por Kylio, Wex, Ami</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">⚡ GPT-4o-mini</span>
                    <span className="text-xs font-mono text-blue-700 dark:text-blue-300">~0.003 créditos/msg</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Equilibrado • Usado por Peter, Apu, Emma</p>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>💡 Ejemplo Real:</strong> Con el plan Free (100 créditos):
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-1 ml-4">
                  <li>• <strong className="text-green-600 dark:text-green-400">~100,000 mensajes</strong> con Grok-4-Fast (nuestro modelo más usado)</li>
                  <li>• <strong className="text-blue-600 dark:text-blue-400">~33,000 mensajes</strong> con GPT-4o-mini</li>
                  <li>• <strong className="text-purple-600 dark:text-purple-400">~130 mensajes</strong> con GPT-5 (premium, cuando esté disponible)</li>
                </ul>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                    <StarIcon className="w-3 h-3 mr-1" />
                    Más Popular
                  </Badge>
                </div>
              )}
              
              <Card className={cn(
                "relative overflow-hidden border-border/50 transition-all duration-300",
                tier.popular ? "ring-2 ring-primary/50 scale-105" : "hover:scale-105",
                "hover:shadow-2xl"
              )}>
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-5`} />
                
                <div className="relative p-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      {tier.price !== "Custom" && <span className="text-muted-foreground">/mes</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-center gap-2">
                        <CreditCardIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm">{tier.credits} créditos/mes</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <UsersIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm">Hasta {tier.agents} agentes</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={cn(
                      "w-full",
                      tier.popular ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" : ""
                    )}
                    variant={tier.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {tier.cta}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-24 max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
          <div className="grid gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">🔄 ¿Cómo funcionan los créditos?</h3>
              <p className="text-muted-foreground mb-2">
                Cada vez que un agente responde, se calcula el consumo basado en tokens del modelo usado. 
                Por ejemplo, Grok-4-Fast es extremadamente económico (~$0.00001 por mensaje), mientras que GPT-5 es premium (~$0.001 por mensaje).
              </p>
              <p className="text-xs text-muted-foreground italic">
                💡 La mayoría de conversaciones usan Grok-4-Fast, así que tus créditos duran mucho más.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">📊 ¿Puedo ver cuántos créditos consumo?</h3>
              <p className="text-muted-foreground">
                Sí! Cada mensaje muestra en tiempo real cuántos tokens y créditos consume. 
                También puedes ver tu historial completo de uso y estadísticas por agente en tu dashboard.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">⚡ ¿Qué modelos están disponibles?</h3>
              <p className="text-muted-foreground mb-2">
                Actualmente usamos <strong>Grok-4-Fast</strong> (ultra económico) y <strong>GPT-4o-mini</strong> (equilibrado). 
                Próximamente: <strong>GPT-5</strong> (premium) y <strong>Gemini Flash</strong> (rápido).
              </p>
              <p className="text-xs text-muted-foreground italic">
                🎯 Cada agente usa el modelo más óptimo para su tarea específica.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">🎁 ¿Hay período de prueba?</h3>
              <p className="text-muted-foreground">
                El plan Free te da 100 créditos mensuales sin costo. 
                Con Grok-4-Fast puedes tener miles de conversaciones, perfecto para probar todas las funcionalidades.
              </p>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
