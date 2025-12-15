'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Clock, Zap, Search, Brain, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAgentMetadata } from '@/lib/agents/agent-metadata'

interface ExecutionProgressProps {
  stage: string
  message: string
  agentId?: string
  agentName?: string
  agentAvatar?: string
  progress: number
  isActive: boolean
  className?: string
}

const getStageIcon = (stage: string) => {
  switch (stage.toLowerCase()) {
    case 'initializing':
    case 'starting':
      return <Clock className="w-3 h-3" />
    case 'analyzing':
    case 'thinking':
      return <Brain className="w-3 h-3" />
    case 'researching':
    case 'searching':
      return <Search className="w-3 h-3" />
    case 'processing':
    case 'working':
      return <Zap className="w-3 h-3" />
    case 'finalizing':
    case 'completing':
      return <CheckCircle className="w-3 h-3" />
    default:
      return <Clock className="w-3 h-3" />
  }
}

const getStageColor = (stage: string) => {
  switch (stage.toLowerCase()) {
    case 'initializing':
    case 'starting':
      return {
        bg: 'bg-blue-500/15',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        accent: 'bg-blue-400'
      }
    case 'analyzing':
    case 'thinking':
      return {
        bg: 'bg-purple-500/15',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        accent: 'bg-purple-400'
      }
    case 'researching':
    case 'searching':
      return {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        accent: 'bg-amber-400'
      }
    case 'processing':
    case 'working':
      return {
        bg: 'bg-green-500/15',
        border: 'border-green-500/30',
        text: 'text-green-300',
        accent: 'bg-green-400'
      }
    case 'finalizing':
    case 'completing':
      return {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        accent: 'bg-emerald-400'
      }
    default:
      return {
        bg: 'bg-slate-500/15',
        border: 'border-slate-500/30',
        text: 'text-slate-300',
        accent: 'bg-slate-400'
      }
  }
}

export function ExecutionProgress({
  stage,
  message,
  agentId,
  agentName,
  agentAvatar,
  progress,
  isActive,
  className
}: ExecutionProgressProps) {
  const colors = getStageColor(stage)
  const icon = getStageIcon(stage)

  // Get agent metadata if agentId is provided
  const agentMetadata = agentId ? getAgentMetadata(agentId, agentName) : null
  const displayName = agentName || agentMetadata?.name || 'Agent'
  const displayAvatar = agentAvatar || agentMetadata?.avatar

  if (!isActive) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300",
        colors.bg,
        colors.border,
        className
      )}
    >
      {/* Animated pulse indicator */}
      <motion.div
        className={cn("w-2 h-2 rounded-full", colors.accent)}
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* Agent avatar */}
      <Avatar className="w-6 h-6">
        <AvatarImage src={displayAvatar} alt={displayName} />
        <AvatarFallback className="bg-violet-600 text-[10px]">
          {agentMetadata?.emoji || displayName[0] || 'A'}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn("flex items-center gap-1.5", colors.text)}>
            {icon}
            <span className="text-sm font-medium capitalize">{stage}</span>
          </div>
          
          <span className="text-xs text-slate-400">
            • {displayName}
          </span>
        </div>
        
        <p className={cn("text-sm", colors.text)}>
          {message}
        </p>
        
        {/* Progress bar */}
        {progress > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Progress 
              value={progress} 
              className="flex-1 h-1.5"
            />
            <span className={cn("text-xs font-medium min-w-[3ch]", colors.text)}>
              {progress}%
            </span>
          </div>
        )}
      </div>
      
      {/* Animated dots */}
      <div className="flex gap-1">
        <motion.span
          className={cn("w-1.5 h-1.5 rounded-full", colors.accent)}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className={cn("w-1.5 h-1.5 rounded-full", colors.accent)}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className={cn("w-1.5 h-1.5 rounded-full", colors.accent)}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  )
}

export default ExecutionProgress
