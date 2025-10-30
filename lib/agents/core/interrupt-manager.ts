/**
 * Interrupt State Manager
 * Manages pending interrupts (human-in-the-loop approvals) during agent execution
 * 
 * Based on LangGraph official patterns from agent-chat-ui
 */

import { HumanInterrupt, InterruptState, HumanResponse, isHumanInterrupt } from '../types/interrupt'

/**
 * In-memory storage for active interrupts
 * Key: executionId
 * Value: InterruptState
 */
const activeInterrupts = new Map<string, InterruptState>()

export class InterruptManager {
  /**
   * Store a new interrupt waiting for user response
   */
  static async storeInterrupt(
    executionId: string,
    threadId: string,
    interrupt: HumanInterrupt
  ): Promise<InterruptState> {
    const state: InterruptState = {
      executionId,
      threadId,
      interrupt,
      timestamp: new Date(),
      status: 'pending'
    }

    activeInterrupts.set(executionId, state)

    console.log('🛑 [INTERRUPT] Stored new interrupt:', {
      executionId,
      threadId,
      action: interrupt.action_request.action,
      description: interrupt.description,
      config: interrupt.config
    })

    return state
  }

  /**
   * Get pending interrupt for an execution
   */
  static getInterrupt(executionId: string): InterruptState | undefined {
    return activeInterrupts.get(executionId)
  }

  /**
   * Get all pending interrupts (for admin/debug purposes)
   */
  static getAllPendingInterrupts(): InterruptState[] {
    return Array.from(activeInterrupts.values()).filter(
      state => state.status === 'pending'
    )
  }

  /**
   * Update interrupt status with user response
   */
  static async updateInterruptResponse(
    executionId: string,
    response: HumanResponse
  ): Promise<InterruptState | null> {
    const state = activeInterrupts.get(executionId)
    
    if (!state) {
      console.error('❌ [INTERRUPT] No interrupt found for executionId:', executionId)
      return null
    }

    // Update state with response
    state.response = response
    state.status = response.type === 'accept' ? 'approved' 
      : response.type === 'ignore' ? 'rejected'
      : response.type === 'edit' ? 'edited'
      : 'approved' // 'response' type also counts as approved

    console.log('✅ [INTERRUPT] Updated interrupt with response:', {
      executionId,
      responseType: response.type,
      newStatus: state.status
    })

    return state
  }

  /**
   * Clear interrupt after execution completes
   */
  static clearInterrupt(executionId: string): boolean {
    const deleted = activeInterrupts.delete(executionId)
    
    if (deleted) {
      console.log('🧹 [INTERRUPT] Cleared interrupt for executionId:', executionId)
    }
    
    return deleted
  }

  /**
   * Check if execution has pending interrupt
   */
  static hasPendingInterrupt(executionId: string): boolean {
    const state = activeInterrupts.get(executionId)
    return state ? state.status === 'pending' : false
  }

  /**
   * Wait for user response to interrupt (with timeout)
   */
  static async waitForResponse(
    executionId: string,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<HumanResponse | null> {
    const pollInterval = 500 // Check every 500ms
    const maxAttempts = Math.floor(timeoutMs / pollInterval)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const state = activeInterrupts.get(executionId)
      
      if (!state) {
        console.error('❌ [INTERRUPT] Interrupt disappeared during wait:', executionId)
        return null
      }

      if (state.response) {
        console.log('✅ [INTERRUPT] Received user response:', {
          executionId,
          responseType: state.response.type,
          attemptNumber: attempt + 1
        })
        return state.response
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    console.error('⏱️ [INTERRUPT] Timeout waiting for user response:', {
      executionId,
      timeoutMs
    })
    
    return null
  }
}

/**
 * Helper to validate interrupt payload from LangGraph stream
 */
export function validateInterruptPayload(payload: unknown): HumanInterrupt | null {
  if (!isHumanInterrupt(payload)) {
    console.warn('⚠️ [INTERRUPT] Invalid interrupt payload:', payload)
    return null
  }

  return payload as HumanInterrupt
}
