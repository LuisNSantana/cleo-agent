/**
 * Interrupt State Manager
 * Manages pending interrupts (human-in-the-loop approvals) during agent execution
 * 
 * Uses Supabase for persistent storage across serverless function instances
 * Based on LangGraph official patterns from agent-chat-ui
 */

import { HumanInterrupt, InterruptState, HumanResponse, isHumanInterrupt } from '../types/interrupt'
import { createClient } from '@/lib/supabase/server'

/**
 * DEPRECATED: In-memory storage - kept for backward compatibility during migration
 * Use Supabase storage for production (serverless-safe)
 */
const activeInterrupts = new Map<string, InterruptState>()

export class InterruptManager {
  /**
   * Store interrupt state (in-memory + Supabase)
   */
  static async storeInterrupt(
    executionId: string,
    threadId: string,
    payload: HumanInterrupt,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    const actionRequest = payload.action_request
    
    console.log('🛑 [INTERRUPT] Storing new interrupt:', {
      executionId,
      threadId,
      userId,
      agentId,
      action: actionRequest.action,
      description: payload.description,
      config: payload.config,
      existingInterruptStatus: activeInterrupts.get(executionId)?.status
    })

    const interruptState: InterruptState = {
      executionId,
      threadId,
      status: 'pending',
      interrupt: payload,
      timestamp: new Date(),
      response: undefined
    }

    // Store in memory (L1 cache)
    activeInterrupts.set(executionId, interruptState)
    
    // Persist to Supabase (survives process restarts)
    try {
      const supabase = await createClient()
      if (!supabase) {
        console.warn('⚠️ [INTERRUPT] Supabase not available, skipping persistence')
        return
      }
      
      if (!userId) {
        console.warn('⚠️ [INTERRUPT] No userId provided, skipping Supabase persistence')
        return
      }
      
      const { error } = await supabase
        .from('agent_interrupts')
        .insert({
          execution_id: executionId,
          thread_id: threadId,
          user_id: userId,
          agent_id: agentId || 'unknown',
          status: 'pending',
          interrupt_payload: payload as any
        })
      
      if (error) {
        console.error('❌ [INTERRUPT] Failed to persist to Supabase:', error)
        // Continue anyway - in-memory storage will work for short-lived interrupts
      } else {
        console.log('✅ [INTERRUPT] Persisted to Supabase')
      }
    } catch (dbError) {
      console.error('❌ [INTERRUPT] Supabase error:', dbError)
      // Continue anyway
    }
    
    console.log('✅ [INTERRUPT] Interrupt stored successfully. Active interrupts count:', activeInterrupts.size)
  }

  /**
   * Get pending interrupt for an execution (check Supabase if not in memory)
   * @param forceRefresh - If true, always check Supabase even if found in memory (for serverless polling)
   */
  static async getInterrupt(executionId: string, forceRefresh = false): Promise<InterruptState | undefined> {
    // Check L1 cache first (unless forceRefresh)
    let state = activeInterrupts.get(executionId)
    
    if (state && !forceRefresh) {
      console.log('🔍 [INTERRUPT] Found in memory cache:', executionId)
      return state
    }
    
    // If not in memory OR forceRefresh, check Supabase
    try {
      if (forceRefresh && state) {
        console.log('🔄 [INTERRUPT] Force refresh from Supabase (bypassing memory):', executionId)
      } else {
        console.log('🔍 [INTERRUPT] Not in memory, checking Supabase:', executionId)
      }
      const supabase = await createClient()
      if (!supabase) {
        console.warn('⚠️ [INTERRUPT] Supabase not available for fallback')
        return undefined
      }
      
      const { data, error } = await supabase
        .from('agent_interrupts')
        .select('*')
        .eq('execution_id', executionId)
        .in('status', ['pending', 'approved', 'rejected', 'edited'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found is expected
          console.error('❌ [INTERRUPT] Supabase query error:', error)
        }
        return undefined
      }
      
      if (data) {
        console.log('✅ [INTERRUPT] Found in Supabase, restoring to memory:', executionId)
        // Restore to memory cache
        state = {
          executionId: data.execution_id,
          threadId: data.thread_id,
          status: data.status as InterruptState['status'],
          interrupt: data.interrupt_payload as unknown as HumanInterrupt,
          timestamp: new Date(data.created_at),
          response: data.response as unknown as HumanResponse | undefined
        }
        activeInterrupts.set(executionId, state)
        return state
      }
    } catch (dbError) {
      console.error('❌ [INTERRUPT] Supabase error:', dbError)
    }
    
    return undefined
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
   * Update interrupt status with user response (memory + Supabase)
   */
  static async updateInterruptResponse(
    executionId: string,
    response: HumanResponse
  ): Promise<InterruptState | null> {
    // Get state (will check Supabase if not in memory)
    const state = await InterruptManager.getInterrupt(executionId)
    
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

    // Update in memory
    activeInterrupts.set(executionId, state)
    
    // Update in Supabase
    try {
      const supabase = await createClient()
      if (!supabase) {
        console.warn('⚠️ [INTERRUPT] Supabase not available, skipping DB update')
        return state  // Return the state even if we couldn't persist
      }
      
      const { error } = await supabase
        .from('agent_interrupts')
        .update({
          status: state.status,
          response: response as any
        })
        .eq('execution_id', executionId)
      
      if (error) {
        console.error('❌ [INTERRUPT] Failed to update Supabase:', error)
      } else {
        console.log('✅ [INTERRUPT] Updated in Supabase')
      }
    } catch (dbError) {
      console.error('❌ [INTERRUPT] Supabase error:', dbError)
    }

    return state
  }

  /**
   * Clear interrupt after execution completes
   */
  static clearInterrupt(executionId: string): boolean {
    // DEBUG: Log stack trace to see who's calling this
    console.log('🧹 [INTERRUPT] clearInterrupt called for:', executionId)
    console.trace('🧹 [INTERRUPT] Stack trace:')
    
    const deleted = activeInterrupts.delete(executionId)
    
    if (deleted) {
      console.log('🧹 [INTERRUPT] Cleared interrupt for executionId:', executionId)
    } else {
      console.log('⚠️ [INTERRUPT] No interrupt found to clear for:', executionId)
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
   * CRITICAL: Must check Supabase (L2) not just memory (L1) for serverless compatibility
   */
  static async waitForResponse(
    executionId: string,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<HumanResponse | null> {
    const pollInterval = 500 // Check every 500ms
    const maxAttempts = Math.floor(timeoutMs / pollInterval)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // CRITICAL FIX: ALWAYS check Supabase during polling (forceRefresh=true)
      // In serverless, the approval may come from a different process
      // Memory cache is NOT shared between processes - MUST bypass cache
      const state = await this.getInterrupt(executionId, true)
      
      if (!state) {
        console.error('❌ [INTERRUPT] Interrupt disappeared during wait:', executionId)
        return null
      }

      // DIAGNOSTIC: Log full state every 50 attempts (25 seconds) to reduce noise
      // Only log when debugging needed - changed from every 10 attempts to every 50
      if (attempt % 50 === 0 || state.response) {
        console.log('🔍🔍 [WAIT-FOR-RESPONSE] Polling state:', {
          executionId,
          attempt: attempt + 1,
          maxAttempts,
          hasResponse: !!state.response,
          responseType: state.response?.type,
          status: state.status,
          fullState: JSON.stringify(state, null, 2)
        })
      }

      if (state.response) {
        console.log('✅ [INTERRUPT] Received user response:', {
          executionId,
          responseType: state.response.type,
          attemptNumber: attempt + 1,
          source: activeInterrupts.has(executionId) ? 'memory' : 'supabase'
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

  /**
   * Clear all interrupts from memory (for testing only)
   */
  static clearAll(): void {
    activeInterrupts.clear()
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
