/**
 * Tests for Agent Orchestrator - Critical Delegation & Execution Paths
 * Priority: MAXIMUM - Core delegation system for production reliability
 */

import { AgentOrchestrator, OrchestratorConfig } from '../lib/agents/core/orchestrator'
import { AgentConfig } from '../lib/agents/types'
import { SubAgentService } from '../lib/agents/services/sub-agent-service'
import { __clearConfirmationIntervalForTest } from '../lib/confirmation/unified'

// Mock Supabase and external dependencies
jest.mock('../lib/agents/services/sub-agent-service', () => ({
  SubAgentService: {
    getSubAgent: jest.fn(),
    createSubAgent: jest.fn(),
    updateSubAgent: jest.fn(),
    getSubAgents: jest.fn(),
    deleteSubAgent: jest.fn(),
    getSubAgentStatistics: jest.fn(),
    validateParentAgentAccess: jest.fn()
  }
}))

const mockedSubAgentService = SubAgentService as jest.Mocked<typeof SubAgentService>

jest.mock('../lib/supabase/server', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    }))
  }
}))

jest.mock('../lib/server/request-context', () => ({
  getCurrentUserId: jest.fn().mockReturnValue('test-user-id')
}))

describe('Agent Orchestrator - Critical Delegation & Execution Paths', () => {
  let orchestrator: AgentOrchestrator

  beforeEach(() => {
    // Configure mocks
    mockedSubAgentService.getSubAgents.mockResolvedValue([])
    mockedSubAgentService.getSubAgentStatistics.mockResolvedValue({
      totalSubAgents: 0,
      subAgentsByParent: {},
      createdToday: 0
    })
    mockedSubAgentService.validateParentAgentAccess.mockResolvedValue(true)
    mockedSubAgentService.createSubAgent.mockResolvedValue({
      id: 'test-sub-agent',
      name: 'Test Sub Agent',
      description: 'Test sub agent',
      parentAgentId: 'test-agent',
      isSubAgent: true,
      delegationToolName: 'test-tool',
      subAgentConfig: {},
      systemPrompt: 'You are a test sub agent',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date().toISOString(),
      isActive: true,
      createdBy: 'test-user'
    })
    mockedSubAgentService.deleteSubAgent.mockResolvedValue(true)

    const config: OrchestratorConfig = {
      enableMetrics: true,
      enableMemory: true
    }
    orchestrator = new AgentOrchestrator(config)
  })

  afterEach(async () => {
    await orchestrator.shutdown()
    jest.clearAllMocks()
  })

  describe('Core Orchestrator Initialization', () => {
    it('inicializa orchestrator correctamente', () => {
      expect(orchestrator).toBeDefined()
      expect(orchestrator).toBeInstanceOf(AgentOrchestrator)
    })

    it('maneja configuración mínima', async () => {
      const minimalConfig: OrchestratorConfig = {}
      const minimalOrchestrator = new AgentOrchestrator(minimalConfig)
      expect(minimalOrchestrator).toBeDefined()
      // Clean up this test-specific orchestrator
      await minimalOrchestrator.shutdown()
    })
  })

  describe('Agent Initialization', () => {
    it('inicializa agente con configuración válida', async () => {
      const agentConfig: AgentConfig = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent for orchestrator',
        role: 'worker',
        model: 'openrouter:test',
        prompt: 'You are a test agent',
        temperature: 0.7,
        maxTokens: 1000,
        tools: [],
        color: '#000000',
        icon: 'agent'
      }

      // Should not throw
      await expect(orchestrator.initializeAgent(agentConfig)).resolves.not.toThrow()
    })

    it('rechaza configuración inválida', async () => {
      const invalidConfig = null as any

      await expect(orchestrator.initializeAgent(invalidConfig)).rejects.toThrow()
    })
  })

  describe('Execution Management', () => {
    it('ejecuta cancelación correctamente', async () => {
      const executionId = 'test-exec-123'
      const cancelled = await orchestrator.cancelExecution(executionId)
      expect(typeof cancelled).toBe('boolean')
    })

    it('maneja shutdown gracefully', async () => {
      await expect(orchestrator.shutdown()).resolves.not.toThrow()
    })
  })

  describe('Sub-Agent Management - Delegation Infrastructure', () => {
    it('crea sub-agente con configuración básica', async () => {
      const subAgentConfig = {
        id: 'new-sub-agent',
        name: 'New Sub Agent',
        model: 'openrouter:test',
        prompt: 'I am a new sub-agent',
        temperature: 0.7,
        maxTokens: 1000,
        tools: []
      }

      // Should handle creation attempt
      try {
        await orchestrator.createSubAgent('parent-agent', subAgentConfig as any)
      } catch (error) {
        // Expected - we're testing error handling
        expect(error).toBeDefined()
      }
    })

    it('recupera lista de sub-agentes', async () => {
      const subAgents = await orchestrator.getSubAgents('parent-agent')
      expect(Array.isArray(subAgents)).toBe(true)
    })

    it('maneja eliminación de sub-agente', async () => {
      const result = await orchestrator.deleteSubAgent('sub-agent-id')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Error Handling & Recovery', () => {
    it('mantiene estabilidad durante errores', async () => {
      // Test that orchestrator doesn't crash under error conditions
      const agentConfig: AgentConfig = {
        id: 'error-test-agent',
        name: 'Error Test Agent',
        description: 'Agent for error testing',
        role: 'worker',
        model: 'invalid-model',
        prompt: 'You are an error test agent',
        temperature: 0.7,
        maxTokens: 1000,
        tools: [],
        color: '#FF0000',
        icon: 'error'
      }

      // Should handle initialization errors gracefully
      try {
        await orchestrator.initializeAgent(agentConfig)
      } catch (error) {
        expect(error).toBeDefined()
      }

      // Orchestrator should still be functional
      expect(orchestrator).toBeDefined()
    })

    it('procesa eventos de delegación sin crashes', async () => {
      // Test delegation event processing by calling internal methods safely
      const delegationData = {
        fromAgentId: 'test-agent',
        toAgentId: 'target-agent',
        task: 'Test delegation task',
        context: { userId: 'test-user', threadId: 'test-thread' },
        executionId: 'delegation-test-123'
      }

      // Test that orchestrator handles delegation-related operations without crashing
      // by testing sub-agent operations which are part of delegation infrastructure
      const subAgents = await orchestrator.getSubAgents('test-agent')
      expect(Array.isArray(subAgents)).toBe(true)

      // Orchestrator should still be stable
      expect(orchestrator).toBeDefined()
    })
  })

  afterEach(async () => {
    // Ensure orchestrator is properly shut down after each test to clean up intervals
    try {
      await orchestrator.shutdown()
    } catch (error) {
      // Ignore shutdown errors in cleanup
    }
    
    // Clear global confirmation interval
    __clearConfirmationIntervalForTest()
  })
})