'use client'

/**
 * 🔔 Tool Confirmation Indicator
 * Indicador visual que muestra cuando hay una acción pendiente de confirmación
 */

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Shield } from 'lucide-react'
import { useToolConfirmation } from '@/hooks/use-tool-confirmation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ToolConfirmationIndicatorProps {
  className?: string
}

export default function ToolConfirmationIndicator({ className }: ToolConfirmationIndicatorProps) {
  const { isWaitingForConfirmation, pendingAction } = useToolConfirmation()

  if (!isWaitingForConfirmation || !pendingAction) {
    return null
  }

  const getSensitivityColor = () => {
    switch (pendingAction.sensitivity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSensitivityIcon = () => {
    switch (pendingAction.sensitivity) {
      case 'critical': return <AlertTriangle className="w-3 h-3" />
      case 'high': return <AlertTriangle className="w-3 h-3" />
      case 'medium': return <Clock className="w-3 h-3" />
      case 'low': return <Shield className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn("flex items-center justify-center", className)}
      >
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-2 shadow-sm",
            getSensitivityColor()
          )}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {getSensitivityIcon()}
          </motion.div>
          <span>Acción pendiente de confirmación</span>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 bg-current rounded-full"
          />
        </Badge>
      </motion.div>
    </AnimatePresence>
  )
}