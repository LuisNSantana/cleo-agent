'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { Progress } from '@/components/ui/progress'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DelegationStatusProps {
  className?: string
}

export function DelegationStatus({ className }: DelegationStatusProps) {
  const { activeDelegations, currentDelegationId } = useClientAgentStore()
  
  const currentDelegation = currentDelegationId ? activeDelegations[currentDelegationId] : null

  if (!currentDelegation) {
    return null
  }

  const getStageMessage = (stage: string, targetAgent: string) => {
    switch (stage) {
      case 'initializing': return `Delegating to ${targetAgent}...`
      case 'analyzing': return `${targetAgent} analyzing...`
      case 'researching': return `${targetAgent} researching...`
      case 'processing': return `${targetAgent} processing...`
      case 'synthesizing': return `${targetAgent} synthesizing...`
      case 'finalizing': return `${targetAgent} finalizing...`
      default: return `${targetAgent} working...`
    }
  }

  const getTimeElapsed = (startTime: Date, lastUpdate: Date) => {
    const diff = lastUpdate.getTime() - startTime.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center space-x-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg",
        className
      )}
    >
      {/* Animated indicator */}
      <motion.div
        className="w-2 h-2 bg-blue-500 rounded-full"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {getStageMessage(currentDelegation.stage, currentDelegation.targetAgent)}
          </p>
          <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
            <Clock className="w-3 h-3 mr-1" />
            {getTimeElapsed(currentDelegation.startTime, currentDelegation.lastUpdate)}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center space-x-2">
          <Progress 
            value={currentDelegation.progress} 
            className="flex-1 h-1.5"
          />
          <span className="text-xs text-blue-600 dark:text-blue-400 min-w-0">
            {currentDelegation.progress}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default DelegationStatus
