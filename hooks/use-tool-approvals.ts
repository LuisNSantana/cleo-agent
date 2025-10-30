/**
 * Hook: useToolApprovals
 * 
 * Manages human-in-the-loop interrupts from agent execution streams
 * Integrates with Zustand store and displays approval UI
 * 
 * Based on LangGraph official patterns
 */

'use client'

import { useEffect, useCallback } from 'react'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { HumanInterrupt, HumanResponse, InterruptState } from '@/lib/agents/types/interrupt'

export interface UseToolApprovalsOptions {
  executionId?: string
  chatId?: string // Support chat-based tracking
  onInterrupt?: (interrupt: InterruptState) => void
  onResume?: (executionId: string) => void
}

export function useToolApprovals(options: UseToolApprovalsOptions = {}) {
  const {
    activeInterrupts,
    pendingApprovals,
    addInterrupt,
    removeInterrupt,
    submitApprovalResponse,
    getPendingInterrupt
  } = useClientAgentStore()

  const { executionId, chatId, onInterrupt, onResume } = options

  // Get pending interrupt for current execution
  const pendingInterrupt = executionId ? getPendingInterrupt(executionId) : undefined

  // Get all interrupts for current chat (multiple executions)
  const chatInterrupts = chatId 
    ? Object.values(activeInterrupts).filter(interrupt => {
        // Filter by chat ID if available in metadata
        return interrupt.executionId.includes(chatId)
      })
    : []

  // Handle approval response
  const handleApprovalResponse = useCallback(async (
    execId: string, 
    response: HumanResponse
  ) => {
    try {
      console.log('🔄 [useToolApprovals] Submitting approval:', { execId, type: response.type })
      await submitApprovalResponse(execId, response)
      onResume?.(execId)
      console.log('✅ [useToolApprovals] Approval submitted successfully')
    } catch (error) {
      console.error('❌ [useToolApprovals] Failed to submit approval:', error)
      throw error
    }
  }, [submitApprovalResponse, onResume])

  // Listen for interrupt events from execution manager
  // This works through SSE or polling mechanism
  useEffect(() => {
    // Handler for interrupt events from SSE stream
    const handleInterrupt = (event: CustomEvent) => {
      const interruptData = event.detail

      console.log('🛑 [useToolApprovals] Interrupt received:', {
        executionId: interruptData.executionId,
        action: interruptData.interrupt?.action_request?.action
      })

      const interruptState: InterruptState = {
        executionId: interruptData.executionId,
        threadId: interruptData.threadId,
        interrupt: interruptData.interrupt,
        timestamp: new Date(),
        status: 'pending'
      }

      addInterrupt(interruptData.executionId, interruptState)
      onInterrupt?.(interruptState)
    }

    // Register event listener
    window.addEventListener('interrupt', handleInterrupt as EventListener)

    return () => {
      window.removeEventListener('interrupt', handleInterrupt as EventListener)
    }
  }, [addInterrupt, onInterrupt])


  return {
    // State
    pendingInterrupt,
    chatInterrupts,
    hasPendingApproval: executionId ? pendingApprovals.includes(executionId) : pendingApprovals.length > 0,
    allPendingApprovals: pendingApprovals,
    activeInterrupts,
    
    // Actions
    handleApprovalResponse,
    removeInterrupt
  }
}

/**
 * Hook to emit interrupt events from execution manager
 * Used server-side or in SSE handlers
 */
export function emitInterruptEvent(
  executionId: string,
  threadId: string,
  interrupt: HumanInterrupt
) {
  if (typeof window === 'undefined') return

  const event = new CustomEvent('execution.interrupted', {
    detail: { executionId, threadId, interrupt }
  })

  window.dispatchEvent(event)
  
  console.log('📡 [emitInterruptEvent] Dispatched interrupt event:', {
    executionId,
    action: interrupt.action_request.action
  })
}
