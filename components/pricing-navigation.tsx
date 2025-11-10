"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

interface PricingNavigationProps {
  onPlanSelect: (plan: string) => void
  currentPlan?: string
}

export function PricingNavigation({ onPlanSelect, currentPlan }: PricingNavigationProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")

  const discounts = {
    monthly: 0,
    annual: 20
  }

  return (
    <div className="flex flex-col items-center gap-6 mb-12">
      {/* Beta Badge */}
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1">
        🚧 Beta - Funcionalidad completa, suscripciones deshabilitadas
      </Badge>

      {/* Billing Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={
            billingCycle === "monthly"
              ? "px-4 py-2 bg-primary text-white rounded-lg transition-colors"
              : "px-4 py-2 bg-muted text-muted-foreground rounded-lg transition-colors hover:bg-muted/80"
          }
        >
          Mensual
        </button>
        
        <button
          onClick={() => setBillingCycle("annual")}
          className={
            billingCycle === "annual"
              ? "px-4 py-2 bg-primary text-white rounded-lg transition-colors relative"
              : "px-4 py-2 bg-muted text-muted-foreground rounded-lg transition-colors hover:bg-muted/80 relative"
          }
        >
          Anual
          {billingCycle === "annual" && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full"
            >
              -20%
            </motion.span>
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {billingCycle === "annual" 
            ? "Ahorra 20% al pagar anualmente" 
            : "Cambia a facturación anual y ahorra 20%"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Las suscripciones estarán disponibles próximamente
        </p>
      </div>
    </div>
  )
}
