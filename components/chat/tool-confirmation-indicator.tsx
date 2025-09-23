'use client'

/**
 * 🔔 Tool Confirmation Indicator
 * Indicador visual que muestra cuando hay una acción pendiente de confirmación
 */

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'
import { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ToolConfirmationIndicatorProps {
  className?: string
}

export default function ToolConfirmationIndicator({ className }: ToolConfirmationIndicatorProps) {
  const { pendingConfirmations } = useUnifiedConfirmation()
  
  const pendingAction = pendingConfirmations[0] // Get first pending

  if (!pendingAction) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className={cn("flex items-center gap-2", className)}
      >
        <Badge 
          variant="outline" 
          className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1.5 px-2.5 py-1"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-medium">Confirmation Required</span>
          <Clock className="w-3 h-3 ml-1" />
        </Badge>
        
        <div className="flex items-center gap-1 text-xs text-orange-600">
          <span className="font-medium">{pendingAction.toolName}</span>
          <span>•</span>
          <span>{new Date(pendingAction.timestamp).toLocaleTimeString()}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}