"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, TrendingUp, Zap, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CreditBalance {
  plan: 'free' | 'pro' | 'pro+' | 'business'
  total_credits: number
  used_credits: number
  remaining_credits: number
  usage_percentage: number
}

interface CreditDisplayProps {
  balance: CreditBalance | null
  loading?: boolean
  className?: string
  variant?: 'compact' | 'full' | 'badge'
}

/**
 * Credit Display Component
 * Shows user's credit balance with visual indicators
 */
export function CreditDisplay({ 
  balance, 
  loading = false,
  className,
  variant = 'compact'
}: CreditDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Cargando créditos...</span>
      </div>
    )
  }

  if (!balance) {
    return null
  }

  // ✅ Destructure with defaults to prevent undefined errors
  const { 
    plan = 'free', 
    total_credits = 0, 
    used_credits = 0, 
    remaining_credits = 0, 
    usage_percentage = 0 
  } = balance || {}

  // Color coding based on usage
  const getStatusColor = () => {
    if (usage_percentage >= 90) return 'text-red-600 dark:text-red-400'
    if (usage_percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getStatusBg = () => {
    if (usage_percentage >= 90) return 'bg-red-500/10'
    if (usage_percentage >= 70) return 'bg-yellow-500/10'
    return 'bg-green-500/10'
  }

  // Badge variant - minimal
  if (variant === 'badge') {
    const isLow = usage_percentage >= 70
    
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`${remaining_credits.toLocaleString()} créditos restantes (${usage_percentage.toFixed(1)}% usado)`}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold",
          "border transition-all duration-200 cursor-pointer",
          "hover:shadow-md active:shadow-sm",
          isLow 
            ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
          className
        )}
      >
        <Coins className="w-3 h-3" />
        <span className="tabular-nums">{remaining_credits.toLocaleString()}</span>
      </motion.button>
    )
  }

  // Compact variant - one line
  if (variant === 'compact') {
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          "hover:bg-muted/50 cursor-pointer",
          className
        )}
      >
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          getStatusColor()
        )}>
          <Coins className="w-4 h-4" />
          <span>{remaining_credits.toLocaleString()}</span>
          <span className="text-muted-foreground">créditos</span>
        </div>
        <Info className="w-3 h-3 text-muted-foreground/50" />
      </motion.button>
    )
  }

  // Full variant - detailed view
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-3 p-4 rounded-lg border border-border/50 bg-card",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            getStatusBg()
          )}>
            <Coins className={cn("w-4 h-4", getStatusColor())} />
          </div>
          <div>
            <p className="text-sm font-medium">Créditos Disponibles</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Plan {plan}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-2xl font-bold tabular-nums", getStatusColor())}>
            {remaining_credits.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">
            de {total_credits.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Uso este mes</span>
          <span className="font-medium">{usage_percentage.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usage_percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              usage_percentage >= 90 ? "bg-red-500" :
              usage_percentage >= 70 ? "bg-yellow-500" :
              "bg-green-500"
            )}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
          <div>
            <p className="text-[10px] text-muted-foreground">Usados</p>
            <p className="text-xs font-medium">{used_credits.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-muted-foreground" />
          <div>
            <p className="text-[10px] text-muted-foreground">Restantes</p>
            <p className="text-xs font-medium">{remaining_credits.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Warning for low balance */}
      <AnimatePresence>
        {usage_percentage >= 80 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "flex items-start gap-2 p-2 rounded-md text-[10px]",
              usage_percentage >= 90 ? "bg-red-500/10 text-red-600 dark:text-red-400" :
              "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            )}
          >
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p>
              {usage_percentage >= 90 
                ? "⚠️ Te estás quedando sin créditos. Considera actualizar tu plan."
                : "💡 Estás cerca del límite mensual de créditos."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Credit Badge - Minimal inline display
 */
export function CreditBadge({ 
  credits, 
  className 
}: { 
  credits: number
  className?: string 
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono",
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      className
    )}>
      <Coins className="w-2.5 h-2.5" />
      {credits.toFixed(2)}
    </span>
  )
}

/**
 * Cost Indicator - Shows USD cost
 */
export function CostIndicator({ 
  usd, 
  className 
}: { 
  usd: number
  className?: string 
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono",
      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      className
    )}>
      <span>💵</span>
      ${usd.toFixed(4)}
    </span>
  )
}
