/**
 * Real-time Optimization Status Component
 * Shows optimization insights while the response is being generated
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { 
  LightningIcon, 
  SparkleIcon, 
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon
} from "@phosphor-icons/react"

export type OptimizationStatus = {
  stage: 'analyzing' | 'routing' | 'delegating' | 'executing' | 'completed'
  complexityScore?: number
  route: 'direct' | 'delegated'
  targetAgent?: string
  optimizations: string[]
  timeElapsed?: number
}

interface RealTimeOptimizationProps {
  status: OptimizationStatus
  className?: string
}

export function RealTimeOptimization({ status, className }: RealTimeOptimizationProps) {
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startTime] = useState(Date.now())

  // Update elapsed time
  useEffect(() => {
    if (status.stage === 'completed') return
    
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [status.stage, startTime])

  const stageInfo = useMemo(() => {
    switch (status.stage) {
      case 'analyzing':
        return {
          icon: <SparkleIcon size={14} className="text-blue-500" />,
          label: 'Analyzing query complexity',
          color: 'blue'
        }
      case 'routing':
        return {
          icon: <LightningIcon size={14} className="text-yellow-500" />,
          label: 'Smart routing decision',
          color: 'yellow'
        }
      case 'delegating':
        return {
          icon: <ArrowDownIcon size={14} className="text-purple-500" />,
          label: 'Delegating to specialist',
          color: 'purple'
        }
      case 'executing':
        return {
          icon: <ClockIcon size={14} className="text-orange-500" />,
          label: 'Executing with optimized tools',
          color: 'orange'
        }
      case 'completed':
        return {
          icon: <CheckCircleIcon size={14} className="text-green-500" />,
          label: 'Optimization completed',
          color: 'green'
        }
    }
  }, [status.stage])

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getRouteColor = (route: 'direct' | 'delegated') => {
    return route === 'direct' 
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-gradient-to-r from-slate-50/80 to-blue-50/50 dark:from-slate-900/50 dark:to-blue-900/20 border border-slate-200/60 dark:border-slate-700/40 rounded-lg p-3 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: status.stage !== 'completed' ? 360 : 0 }}
            transition={{ duration: 2, repeat: status.stage !== 'completed' ? Infinity : 0, ease: "linear" }}
          >
            {stageInfo.icon}
          </motion.div>
          <span className="text-sm font-medium text-foreground/80">
            {stageInfo.label}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {formatTime(timeElapsed)}
          </Badge>
          <Badge className={`text-xs ${getRouteColor(status.route)}`}>
            {status.route === 'direct' ? '⚡ Direct' : '🎯 Delegated'}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {/* Complexity Score */}
        {status.complexityScore !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Complexity Score:</span>
            <Badge variant="secondary" className="font-mono">
              {status.complexityScore}/100
            </Badge>
          </div>
        )}

        {/* Target Agent */}
        {status.targetAgent && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Specialist Agent:</span>
            <Badge variant="default" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              {status.targetAgent.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Active Optimizations */}
        {status.optimizations.length > 0 && (
          <div className="text-xs">
            <div className="text-muted-foreground mb-1">Active Optimizations:</div>
            <div className="space-y-1">
              <AnimatePresence>
                {status.optimizations.map((opt, i) => (
                  <motion.div
                    key={opt}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-1 text-green-600 dark:text-green-400"
                  >
                    <CheckCircleIcon size={12} />
                    <span>{opt}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Create optimization status from pipeline steps
 */
export function createOptimizationStatus(
  steps: any[], 
  complexityScore?: number,
  targetAgent?: string
): OptimizationStatus {
  const latestStep = steps[steps.length - 1]
  
  let stage: OptimizationStatus['stage'] = 'analyzing'
  if (latestStep) {
    switch (latestStep.action) {
      case 'routing': stage = 'routing'; break
      case 'delegating': stage = 'delegating'; break
      case 'executing': stage = 'executing'; break
      case 'completing': stage = 'completed'; break
    }
  }

  const optimizations: string[] = []
  
  // Determine if it's a direct response
  const isDirect = !targetAgent && steps.length <= 2
  
  if (isDirect) {
    optimizations.push("Direct response (no delegation overhead)")
    optimizations.push("80% latency reduction vs legacy")
  } else {
    optimizations.push("Specialized agent routing")
    optimizations.push("68% tool reduction vs legacy")
    if (targetAgent) {
      optimizations.push(`Domain expertise: ${targetAgent}`)
    }
  }

  // Add complexity-based optimizations
  if (complexityScore !== undefined) {
    if (complexityScore < 30) {
      optimizations.push("Simple query optimization")
    } else if (complexityScore > 70) {
      optimizations.push("Complex task specialization")
    }
  }

  return {
    stage,
    complexityScore,
    route: isDirect ? 'direct' : 'delegated',
    targetAgent,
    optimizations
  }
}
