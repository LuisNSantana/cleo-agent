'use client'

/**
 * Hook for managing real-time execution visualization
 * Simulates agent thinking process and execution steps
 */

import { useState, useEffect, useCallback } from 'react'
import { useClientAgentStore } from './client-store'
import { AgentExecution, ExecutionStep } from './types'

export interface AgentThought {
  id: string
  agent: string
  type: 'analysis' | 'decision' | 'action' | 'reflection'
  content: string
  timestamp: Date
  confidence?: number
}

export function useRealTimeExecution() {
  const { executions, currentExecution } = useClientAgentStore()
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [currentStep, setCurrentStep] = useState<ExecutionStep | null>(null)
  const [agentThoughts, setAgentThoughts] = useState<AgentThought[]>([])
  const [isLive, setIsLive] = useState(false)

  // Monitor current execution and use real steps
  useEffect(() => {
    if (currentExecution && currentExecution.status === 'running') {
      setIsLive(true)

      // Use real steps from execution if available
      if (currentExecution.steps && currentExecution.steps.length > 0) {
        // Convert ISO strings back to Date objects
        const realSteps = currentExecution.steps.map(step => ({
          ...step,
          timestamp: typeof step.timestamp === 'string' ? new Date(step.timestamp) : step.timestamp
        }))

        setExecutionSteps(realSteps)

        // Set current step to the latest one
        const latestStep = realSteps[realSteps.length - 1]
        if (latestStep) {
          setCurrentStep(latestStep)
        }
      } else {
        // Fallback: create basic steps based on execution status
        const basicStep: ExecutionStep = {
          id: `basic_${currentExecution.id}`,
          timestamp: new Date(),
          agent: currentExecution.agentId,
          action: 'analyzing',
          content: 'Iniciando procesamiento...',
          progress: 25
        }
        setCurrentStep(basicStep)
        setExecutionSteps([basicStep])
      }
    } else if (currentExecution && currentExecution.status === 'completed') {
      // Show completion step and maintain it for visualization
      if (currentExecution.steps && currentExecution.steps.length > 0) {
        const realSteps = currentExecution.steps.map(step => ({
          ...step,
          timestamp: typeof step.timestamp === 'string' ? new Date(step.timestamp) : step.timestamp
        }))
        setExecutionSteps(realSteps)
        
        // Add a final completion step if not present
        const hasCompletionStep = realSteps.some(step => step.action === 'completing')
        if (!hasCompletionStep) {
          const completionStep: ExecutionStep = {
            id: `completed_${currentExecution.id}`,
            timestamp: new Date(),
            agent: 'cleo-supervisor',
            action: 'completing',
            content: 'Respuesta completada exitosamente',
            progress: 100
          }
          setExecutionSteps(prev => [...prev, completionStep])
          setCurrentStep(completionStep)
        } else {
          setCurrentStep(realSteps[realSteps.length - 1])
        }
      } else {
        const completionStep: ExecutionStep = {
          id: `completed_${currentExecution.id}`,
          timestamp: new Date(),
          agent: 'cleo-supervisor',
          action: 'completing',
          content: 'Ejecución completada',
          progress: 100
        }
        setCurrentStep(completionStep)
        setExecutionSteps([completionStep])
      }
      setIsLive(false)
    } else {
      setIsLive(false)
      setCurrentStep(null)
      setExecutionSteps([])
    }
  }, [currentExecution])

  // Get execution statistics
  const getExecutionStats = useCallback(() => {
    const runningExecutions = executions.filter(e => e.status === 'running')
    const completedExecutions = executions.filter(e => e.status === 'completed')
    const failedExecutions = executions.filter(e => e.status === 'failed')
    
    return {
      running: runningExecutions.length,
      completed: completedExecutions.length,
      failed: failedExecutions.length,
      total: executions.length,
      avgExecutionTime: completedExecutions.reduce((acc, e) => acc + (e.metrics.executionTime || 0), 0) / completedExecutions.length || 0
    }
  }, [executions])

  // Get agent activity status
  const getAgentStatus = useCallback(() => {
    // All predefined agent IDs
    const agentIds = [
      'cleo-supervisor',    // Supervisor
      'wex-intelligence',   // Intelligence Specialist
      'toby-technical',     // Technical Developer
      'ami-creative',       // Creative & Content
      'peter-financial',    // Financial Advisor
      'emma-ecommerce',     // E-commerce Specialist
      'apu-support',        // Customer Support
      'astra-email',        // Email Specialist
      'iris-insights',      // Data Insights
      'notion-agent',       // Notion Integration
      'nora-medical',       // Medical Knowledge
      'jenn-community'      // Community Manager
    ]
    
    return agentIds.map(agentId => {
      const agentExecutions = executions.filter(e => e.agentId === agentId)
      const isActive = agentExecutions.some(e => e.status === 'running')
      const lastExecution = agentExecutions
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
      
      return {
        agentId,
        isActive,
        executionCount: agentExecutions.length,
        lastActivity: lastExecution?.startTime || null,
        avgResponseTime: agentExecutions
          .filter(e => e.status === 'completed')
          .reduce((acc, e) => acc + (e.metrics.executionTime || 0), 0) / agentExecutions.length || 0
      }
    })
  }, [executions])

  return {
    executionSteps,
    currentStep,
    agentThoughts,
    isLive,
    executionStats: getExecutionStats(),
    agentStatus: getAgentStatus(),
    runningExecutions: executions.filter(e => e.status === 'running'),
    recentExecutions: executions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 10)
  }
}

// Re-export ExecutionStep type for convenience
export type { ExecutionStep } from './types'
