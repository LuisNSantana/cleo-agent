"use client"

import { motion } from "framer-motion"
import { CheckIcon, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfecto para empezar",
    features: [
      "1,000 créditos mensuales (Beta)",
      "Chat básico con Kylio",
      "3 agentes predefinidos",
      "Historial 7 días"
    ],
    cta: "Comenzar Gratis",
    href: "/chat",
    popular: false
  },
  {
    name: "Pro",
    price: "Próximamente",
    description: "Para profesionales",
    features: [
      "2,500 créditos mensuales",
      "Todos los agentes predefinidos",
      "Historial ilimitado",
      "Integraciones completas",
      "Soporte prioritario"
    ],
    cta: "Ver Detalles",
    href: "/pricing",
    popular: true
  },
  {
    name: "Business",
    price: "Custom",
    description: "Para equipos",
    features: [
      "Créditos ilimitados",
      "Agentes personalizados",
      "On-premise deployment",
      "SSO y seguridad enterprise",
      "Soporte dedicado"
    ],
    cta: "Contactar",
    href: "/pricing",
    popular: false
  }
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Planes para cada necesidad
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Desde free hasta enterprise. Elige el plan que mejor se adapte a tu flujo de trabajo.
          </p>
        </motion.div>

        {/* Beta Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-12"
        >
          <Card className="border-amber-500/50 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  Beta - Precios Preliminares
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  Estamos en beta. Las suscripciones de pago estarán disponibles próximamente. 
                  Los precios finales pueden variar según el feedback de la comunidad.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col ${
                tier.popular 
                  ? "border-primary shadow-lg shadow-primary/20 scale-105" 
                  : ""
              }`}>
                {tier.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                    variant="default"
                  >
                    Más Popular
                  </Badge>
                )}
                
                <div className="p-8 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tier.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      {tier.price !== "Custom" && tier.price !== "Próximamente" && (
                        <span className="text-muted-foreground">/mes</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    variant={tier.popular ? "default" : "outline"}
                    className="w-full group"
                  >
                    <Link href={tier.href} className="flex items-center justify-center gap-2">
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button variant="ghost" asChild>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Ver comparación completa de planes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
