/**
 * Tests for Semantic ID Generator (Phase 2)
 */

import {
  generateSemanticStepId,
  generateDelegationId,
  parseSemanticStepId,
  isValidSemanticStepId,
} from '@/lib/agents/core/id-generator'

describe('Semantic ID Generator', () => {
  describe('generateSemanticStepId', () => {
    test('generates semantic step ID with format agentId:nodeType:timestamp', () => {
      const id = generateSemanticStepId('cleo-supervisor', 'router', 1762348250879)
      expect(id).toBe('cleo-supervisor:router:1762348250879')
    })

    test('uses Date.now() as default timestamp', () => {
      const beforeTimestamp = Date.now()
      const id = generateSemanticStepId('astra-email', 'tools')
      const afterTimestamp = Date.now()

      expect(id).toMatch(/^astra-email:tools:\d+$/)
      
      const parsed = parseSemanticStepId(id)
      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(parsed.timestamp).toBeLessThanOrEqual(afterTimestamp)
    })

    test('is grep-friendly with colon separators', () => {
      const id = generateSemanticStepId('peter-financial', 'agent', 1762348250879)
      
      // Should match grep patterns
      expect(id).toContain('peter-financial:')
      expect(id).toContain(':agent:')
      expect(id).not.toContain('_') // No underscores
    })
  })

  describe('generateDelegationId', () => {
    test('generates delegation ID with arrow separator', () => {
      const id = generateDelegationId('cleo-supervisor', 'astra-email', 1762348250879)
      expect(id).toBe('cleo-supervisor→astra-email:delegate:1762348250879')
    })

    test('uses Date.now() as default timestamp', () => {
      const beforeTimestamp = Date.now()
      const id = generateDelegationId('cleo-supervisor', 'peter-financial')
      const afterTimestamp = Date.now()

      expect(id).toMatch(/^cleo-supervisor→peter-financial:delegate:\d+$/)
      
      const parsed = parseSemanticStepId(id)
      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(parsed.timestamp).toBeLessThanOrEqual(afterTimestamp)
    })

    test('is grep-friendly with arrow for delegation flow', () => {
      const id = generateDelegationId('cleo-supervisor', 'emma-ecommerce', 1762348250879)
      
      // Should match grep patterns for delegation
      expect(id).toContain('cleo-supervisor→')
      expect(id).toContain('→emma-ecommerce')
      expect(id).toContain(':delegate:')
    })
  })

  describe('parseSemanticStepId', () => {
    test('parses regular step ID correctly', () => {
      const id = 'cleo-supervisor:router:1762348250879'
      const parsed = parseSemanticStepId(id)

      expect(parsed).toEqual({
        agentId: 'cleo-supervisor',
        nodeType: 'router',
        timestamp: 1762348250879,
      })
    })

    test('parses delegation ID correctly', () => {
      const id = 'cleo-supervisor→astra-email:delegate:1762348250879'
      const parsed = parseSemanticStepId(id)

      expect(parsed).toEqual({
        agentId: 'cleo-supervisor→astra-email',
        nodeType: 'delegate',
        timestamp: 1762348250879,
        isDelegation: true,
        fromAgent: 'cleo-supervisor',
        toAgent: 'astra-email',
      })
    })

    test('throws error for invalid format', () => {
      expect(() => parseSemanticStepId('invalid-id')).toThrow(
        'Invalid semantic step ID format'
      )
    })

    test('throws error for invalid timestamp', () => {
      expect(() => parseSemanticStepId('cleo-supervisor:router:invalid')).toThrow(
        'Invalid timestamp in semantic step ID'
      )
    })
  })

  describe('isValidSemanticStepId', () => {
    test('returns true for valid step ID', () => {
      expect(isValidSemanticStepId('cleo-supervisor:router:1762348250879')).toBe(true)
    })

    test('returns true for valid delegation ID', () => {
      expect(isValidSemanticStepId('cleo-supervisor→astra-email:delegate:1762348250879')).toBe(true)
    })

    test('returns false for old underscore format', () => {
      expect(isValidSemanticStepId('cleo-supervisor_router_1762348250879')).toBe(false)
    })

    test('returns false for malformed ID', () => {
      expect(isValidSemanticStepId('invalid')).toBe(false)
      expect(isValidSemanticStepId('cleo-supervisor:router')).toBe(false)
      expect(isValidSemanticStepId('cleo-supervisor:router:invalid')).toBe(false)
    })
  })

  describe('Grep-friendly patterns', () => {
    test('allows searching for all steps by agent', () => {
      const ids = [
        generateSemanticStepId('cleo-supervisor', 'router', 1762348250879),
        generateSemanticStepId('cleo-supervisor', 'agent', 1762348250880),
        generateDelegationId('cleo-supervisor', 'astra-email', 1762348250881),
      ]

      // Simulate grep: "cleo-supervisor:"
      const cleoSteps = ids.filter(id => id.includes('cleo-supervisor:'))
      expect(cleoSteps).toHaveLength(2) // Excludes delegation (has arrow)
    })

    test('allows searching for all delegations from agent', () => {
      const ids = [
        generateSemanticStepId('cleo-supervisor', 'router', 1762348250879),
        generateDelegationId('cleo-supervisor', 'astra-email', 1762348250880),
        generateDelegationId('cleo-supervisor', 'peter-financial', 1762348250881),
      ]

      // Simulate grep: "cleo-supervisor→"
      const delegations = ids.filter(id => id.includes('cleo-supervisor→'))
      expect(delegations).toHaveLength(2)
    })

    test('allows searching for specific node types', () => {
      const ids = [
        generateSemanticStepId('cleo-supervisor', 'router', 1762348250879),
        generateSemanticStepId('astra-email', 'router', 1762348250880),
        generateSemanticStepId('peter-financial', 'agent', 1762348250881),
      ]

      // Simulate grep: ":router:"
      const routerSteps = ids.filter(id => id.includes(':router:'))
      expect(routerSteps).toHaveLength(2)
    })
  })
})
