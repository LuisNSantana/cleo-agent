"use client"

import { motion } from "framer-motion"
import { CheckIcon, StarIcon, ZapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PricingTier {
  name: string
  price: string
  description: string
  credits: string
  agents: string
  features: string[]
  cta: string
  popular?: boolean
  color?: string
  onClick?: () => void
}

interface PricingCardProps {
  tier: PricingTier
  index: number
}

export function PricingCard({ tier, index }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative"
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
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
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.color || 'from-gray-500 to-gray-600'} opacity-5`} />
        
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
                <ZapIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{tier.credits} créditos/mes</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <UsersIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Hasta {tier.agents} agentes</span>
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
            onClick={tier.onClick}
          >
            {tier.cta}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

// Agregar UsersIcon import
import { UsersIcon } from "lucide-react"
