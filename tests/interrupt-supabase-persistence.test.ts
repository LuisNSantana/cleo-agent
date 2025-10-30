/**
 * Test suite for Interrupt Manager with Supabase persistence
 * 
 * This test verifies that interrupts survive process restarts by:
 * 1. Storing interrupts in both memory and Supabase
 * 2. Retrieving interrupts from Supabase when not in memory
 * 3. Updating interrupts in both stores
 */

import { InterruptManager } from '@/lib/agents/core/interrupt-manager'
import type { HumanInterrupt, HumanResponse } from '@/lib/agents/types/interrupt'

// Mock Supabase client
const mockSupabaseData = new Map<string, any>()

const mockSupabase = {
  from: jest.fn((table: string) => ({
    insert: jest.fn((data: any) => {
      if (table === 'agent_interrupts') {
        mockSupabaseData.set(data.execution_id, data)
        return Promise.resolve({ error: null })
      }
      return Promise.resolve({ error: null })
    }),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => {
            // Find the first pending interrupt
            for (const [key, value] of mockSupabaseData.entries()) {
              if (value.status === 'pending') {
                return Promise.resolve({ 
                  data: value,
                  error: null 
                })
              }
            }
            return Promise.resolve({ 
              data: null,
              error: { code: 'PGRST116', message: 'Not found' }
            })
          })
        }))
      }))
    })),
    update: jest.fn((data: any) => ({
      eq: jest.fn((field: string, value: string) => {
        const existing = mockSupabaseData.get(value)
        if (existing) {
          mockSupabaseData.set(value, { ...existing, ...data })
          return Promise.resolve({ error: null })
        }
        return Promise.resolve({ 
          error: { message: 'Not found' }
        })
      })
    }))
  }))
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase))
}))

describe('InterruptManager - Supabase Persistence', () => {
  const testExecutionId = 'exec_test_12345'
  const testThreadId = 'thread_test_67890'
  const testUserId = 'user_test_abc123'
  const testAgentId = 'astra'

  const testInterruptPayload: HumanInterrupt = {
    action_request: {
      action: 'sendGmailMessage',
      args: {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test'
      }
    },
    config: {
      allow_accept: true,
      allow_edit: true,
      allow_respond: true,
      allow_ignore: false
    },
    description: 'Send email to test@example.com'
  }

  beforeEach(() => {
    // Clear mock data before each test
    mockSupabaseData.clear()
    // Clear in-memory store
    InterruptManager.clearAll()
    jest.clearAllMocks()
  })

  describe('storeInterrupt()', () => {
    it('should store interrupt in both memory and Supabase', async () => {
      await InterruptManager.storeInterrupt(
        testExecutionId,
        testThreadId,
        testInterruptPayload,
        testUserId,
        testAgentId
      )

      // Verify it's in memory
      const memoryInterrupt = await InterruptManager.getInterrupt(testExecutionId)
      expect(memoryInterrupt).toBeDefined()
      expect(memoryInterrupt?.executionId).toBe(testExecutionId)
      expect(memoryInterrupt?.status).toBe('pending')

      // Verify Supabase insert was called
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_interrupts')
      
      // Verify data in Supabase
      const supabaseData = mockSupabaseData.get(testExecutionId)
      expect(supabaseData).toBeDefined()
      expect(supabaseData.execution_id).toBe(testExecutionId)
      expect(supabaseData.user_id).toBe(testUserId)
      expect(supabaseData.agent_id).toBe(testAgentId)
      expect(supabaseData.status).toBe('pending')
    })

    it('should skip Supabase persistence if userId is not provided', async () => {
      await InterruptManager.storeInterrupt(
        testExecutionId,
        testThreadId,
        testInterruptPayload,
        undefined, // No userId
        testAgentId
      )

      // Should still be in memory
      const memoryInterrupt = await InterruptManager.getInterrupt(testExecutionId)
      expect(memoryInterrupt).toBeDefined()

      // Should NOT be in Supabase
      const supabaseData = mockSupabaseData.get(testExecutionId)
      expect(supabaseData).toBeUndefined()
    })
  })

  describe('getInterrupt() - Supabase Fallback', () => {
    it('should retrieve interrupt from memory first', async () => {
      // Store interrupt
      await InterruptManager.storeInterrupt(
        testExecutionId,
        testThreadId,
        testInterruptPayload,
        testUserId,
        testAgentId
      )

      // Clear Supabase select mock calls
      jest.clearAllMocks()

      // Retrieve from memory (should not hit Supabase)
      const interrupt = await InterruptManager.getInterrupt(testExecutionId)
      
      expect(interrupt).toBeDefined()
      expect(interrupt?.executionId).toBe(testExecutionId)
      
      // Supabase should NOT have been queried
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should fallback to Supabase when not in memory (simulating process restart)', async () => {
      // 1. Store interrupt in Supabase directly (simulating it was stored before restart)
      mockSupabaseData.set(testExecutionId, {
        id: 'interrupt_id_123',
        execution_id: testExecutionId,
        thread_id: testThreadId,
        user_id: testUserId,
        agent_id: testAgentId,
        status: 'pending',
        interrupt_payload: testInterruptPayload,
        response: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null
      })

      // 2. Clear memory (simulating process restart)
      InterruptManager.clearAll()

      // 3. Try to get interrupt - should fetch from Supabase
      const interrupt = await InterruptManager.getInterrupt(testExecutionId)

      // Should have fetched from Supabase
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_interrupts')
      
      // Should be restored to memory
      expect(interrupt).toBeDefined()
      expect(interrupt?.executionId).toBe(testExecutionId)
      expect(interrupt?.threadId).toBe(testThreadId)
      expect(interrupt?.status).toBe('pending')
      
      // Should now be in memory for subsequent calls
      jest.clearAllMocks()
      const secondFetch = await InterruptManager.getInterrupt(testExecutionId)
      expect(secondFetch).toBeDefined()
      expect(mockSupabase.from).not.toHaveBeenCalled() // Should not query Supabase again
    })

    it('should return undefined if interrupt not found in memory or Supabase', async () => {
      const interrupt = await InterruptManager.getInterrupt('non_existent_id')
      
      expect(interrupt).toBeUndefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_interrupts')
    })
  })

  describe('updateInterruptResponse()', () => {
    it('should update interrupt in both memory and Supabase', async () => {
      // 1. Store interrupt
      await InterruptManager.storeInterrupt(
        testExecutionId,
        testThreadId,
        testInterruptPayload,
        testUserId,
        testAgentId
      )

      // 2. Prepare response
      const userResponse: HumanResponse = {
        type: 'accept',
        args: testInterruptPayload.action_request.args
      }

      // 3. Update with response
      const updatedState = await InterruptManager.updateInterruptResponse(
        testExecutionId,
        userResponse
      )

      // Verify state updated
      expect(updatedState).toBeDefined()
      expect(updatedState?.status).toBe('approved')
      expect(updatedState?.response).toEqual(userResponse)

      // Verify Supabase update was called
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_interrupts')
      
      // Verify data updated in Supabase
      const supabaseData = mockSupabaseData.get(testExecutionId)
      expect(supabaseData.status).toBe('approved')
      expect(supabaseData.response).toEqual(userResponse)
    })

    it('should handle rejection response', async () => {
      await InterruptManager.storeInterrupt(
        testExecutionId,
        testThreadId,
        testInterruptPayload,
        testUserId,
        testAgentId
      )

      const rejectResponse: HumanResponse = {
        type: 'ignore',
        args: {}
      }

      const updatedState = await InterruptManager.updateInterruptResponse(
        testExecutionId,
        rejectResponse
      )

      expect(updatedState?.status).toBe('rejected')  // 'ignore' maps to 'rejected' status
      expect(updatedState?.response).toEqual(rejectResponse)
    })

    it('should retrieve from Supabase before updating if not in memory', async () => {
      // 1. Store in Supabase only (simulating previous session)
      mockSupabaseData.set(testExecutionId, {
        id: 'interrupt_id_123',
        execution_id: testExecutionId,
        thread_id: testThreadId,
        user_id: testUserId,
        agent_id: testAgentId,
        status: 'pending',
        interrupt_payload: testInterruptPayload,
        response: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null
      })

      // 2. Clear memory
      InterruptManager.clearAll()

      // 3. Update response
      const userResponse: HumanResponse = {
        type: 'accept',
        args: testInterruptPayload.action_request.args
      }

      const updatedState = await InterruptManager.updateInterruptResponse(
        testExecutionId,
        userResponse
      )

      // Should have fetched from Supabase first, then updated
      expect(updatedState).toBeDefined()
      expect(updatedState?.status).toBe('approved')
      
      // Verify Supabase was updated
      const supabaseData = mockSupabaseData.get(testExecutionId)
      expect(supabaseData.status).toBe('approved')
    })
  })

  describe('End-to-End Flow: Approval with Process Restart', () => {
    it('should handle complete approval flow with simulated process restart', async () => {
      // 📝 Step 1: Agent generates interrupt and stores it
      console.log('Step 1: Storing interrupt...')
      await InterruptManager.storeInterrupt(
        testExecutionId,
        testThreadId,
        testInterruptPayload,
        testUserId,
        testAgentId
      )

      // Verify stored in both places
      let interrupt = await InterruptManager.getInterrupt(testExecutionId)
      expect(interrupt?.status).toBe('pending')
      expect(mockSupabaseData.has(testExecutionId)).toBe(true)
      
      // 🔄 Step 2: Simulate process restart (clear memory)
      console.log('Step 2: Simulating process restart (clearing memory)...')
      InterruptManager.clearAll()
      
      // Verify memory is cleared but Supabase still has it
      expect(mockSupabaseData.has(testExecutionId)).toBe(true)

      // ⏳ Step 3: User approves after delay (22+ seconds)
      console.log('Step 3: User approves (fetching from Supabase)...')
      const userResponse: HumanResponse = {
        type: 'accept',
        args: testInterruptPayload.action_request.args
      }

      // This should fetch from Supabase since memory is cleared
      const updatedState = await InterruptManager.updateInterruptResponse(
        testExecutionId,
        userResponse
      )

      // ✅ Step 4: Verify approval was successful
      console.log('Step 4: Verifying approval...')
      expect(updatedState).toBeDefined()
      expect(updatedState?.status).toBe('approved')
      expect(updatedState?.response).toEqual(userResponse)

      // Verify it's now in memory again
      interrupt = await InterruptManager.getInterrupt(testExecutionId)
      expect(interrupt?.status).toBe('approved')
      expect(interrupt?.response).toEqual(userResponse)

      // Verify Supabase was updated
      const supabaseData = mockSupabaseData.get(testExecutionId)
      expect(supabaseData.status).toBe('approved')
      expect(supabaseData.response).toEqual(userResponse)
      
      console.log('✅ End-to-end flow successful!')
    })
  })
})
