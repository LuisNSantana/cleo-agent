'use client'

import { useState, useCallback } from 'react'

interface ProgressState {
  stage: string
  message: string
  agentId?: string
  agentName?: string
  progress: number
  isActive: boolean
  timestamp: Date
}

interface ExecutionProgressHook {
  progress: ProgressState | null
  setProgress: (stage: string, message: string, agentId?: string, progress?: number) => void
  clearProgress: () => void
  simulateProgress: (stages: Array<{ stage: string; message: string; agentId?: string; duration: number }>) => void
}

export function useExecutionProgress(): ExecutionProgressHook {
  const [progress, setProgressState] = useState<ProgressState | null>(null)

  const setProgress = useCallback((stage: string, message: string, agentId?: string, progressValue = 0) => {
    setProgressState({
      stage,
      message,
      agentId,
      progress: progressValue,
      isActive: true,
      timestamp: new Date()
    })
  }, [])

  const clearProgress = useCallback(() => {
    setProgressState(null)
  }, [])

  const simulateProgress = useCallback((stages: Array<{ stage: string; message: string; agentId?: string; duration: number }>) => {
    if (stages.length === 0) return

    let currentIndex = 0
    const totalDuration = stages.reduce((acc, stage) => acc + stage.duration, 0)
    let elapsed = 0

    const processStage = () => {
      if (currentIndex >= stages.length) {
        setProgressState(null)
        return
      }

      const currentStage = stages[currentIndex]
      const progressPercent = Math.round((elapsed / totalDuration) * 100)
      
      setProgressState({
        stage: currentStage.stage,
        message: currentStage.message,
        agentId: currentStage.agentId,
        progress: Math.min(progressPercent, 95), // Never reach 100% until complete
        isActive: true,
        timestamp: new Date()
      })

      // Move to next stage after duration
      setTimeout(() => {
        elapsed += currentStage.duration
        currentIndex++
        processStage()
      }, currentStage.duration)
    }

    processStage()
  }, [])

  return {
    progress,
    setProgress,
    clearProgress,
    simulateProgress
  }
}
