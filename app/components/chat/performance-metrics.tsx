/**
 * Performance Metrics Display Component
 * Shows real-time performance metrics during chat operations
 */

"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TimerIcon,
  GearIcon,
  ArrowsClockwiseIcon,
  TrendUpIcon,
  CheckCircleIcon
} from "@phosphor-icons/react"
import { type OptimizationMetrics } from '@/app/hooks/use-optimization-status'

interface PerformanceMetricsProps {
  metrics: OptimizationMetrics
  className?: string
}

export function PerformanceMetrics({ metrics, className }: PerformanceMetricsProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getOptimizationColor = (score: number) => {
    if (score >= 80) return 'text-green-500 bg-green-100 dark:bg-green-900/30'
    if (score >= 60) return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30'
    return 'text-red-500 bg-red-100 dark:bg-red-900/30'
  }

  const getOptimizationLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Very Good'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Needs Optimization'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-lg p-3 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendUpIcon size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-foreground/80">Performance Metrics</span>
        </div>
        <Badge className={`text-xs font-mono ${getOptimizationColor(metrics.optimizationScore)}`}>
          {getOptimizationLabel(metrics.optimizationScore)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Response Time */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TimerIcon size={12} />
            <span>Response Time</span>
          </div>
          <div className="text-sm font-mono font-medium">
            {formatTime(metrics.responseTime)}
          </div>
        </div>

        {/* Tools Used */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GearIcon size={12} />
            <span>Tools Used</span>
          </div>
          <div className="text-sm font-mono font-medium">
            {metrics.toolsUsed}
          </div>
        </div>

        {/* Agent Switches */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowsClockwiseIcon size={12} />
            <span>Agent Switches</span>
          </div>
          <div className="text-sm font-mono font-medium">
            {metrics.agentSwitches}
          </div>
        </div>

        {/* Complexity Score */}
        {metrics.complexityScore !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircleIcon size={12} />
              <span>Complexity</span>
            </div>
            <div className="text-sm font-mono font-medium">
              {metrics.complexityScore}/100
            </div>
          </div>
        )}
      </div>

      {/* Optimization Score Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Optimization Score</span>
          <span className="font-mono font-medium">{metrics.optimizationScore}/100</span>
        </div>
        <Progress 
          value={metrics.optimizationScore} 
          className="h-1.5"
        />
      </div>

      {/* Performance Insights */}
      <div className="mt-3 space-y-1">
        <div className="text-xs text-muted-foreground">Performance Insights:</div>
        <div className="space-y-1">
          {metrics.responseTime < 2000 && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon size={10} />
              <span>Fast response time</span>
            </div>
          )}
          {metrics.agentSwitches === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon size={10} />
              <span>Direct execution (no delegation overhead)</span>
            </div>
          )}
          {metrics.agentSwitches > 0 && metrics.complexityScore && metrics.complexityScore > 50 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <CheckCircleIcon size={10} />
              <span>Smart delegation for complex task</span>
            </div>
          )}
          {metrics.toolsUsed > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
              <CheckCircleIcon size={10} />
              <span>Efficient tool utilization</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
