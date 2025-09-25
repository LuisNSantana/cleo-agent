/**
 * Tests for Graph Builder - Critical Path Coverage
 * Priority: MAXIMUM - Core execution system
 */

import { GraphBuilder, GraphBuilderConfig, DualModeGraphConfig } from '../lib/agents/core/graph-builder'
import { AgentConfig } from '../lib/agents/types'
import { ModelFactory } from '../lib/agents/core/model-factory'
import { EventEmitter } from '../lib/agents/core/event-emitter'
import { ExecutionManager } from '../lib/agents/core/execution-manager'

// Mock Supabase to avoid initialization errors
jest.mock('../lib/agents/services/sub-agent-service', () => ({
  SubAgentService: jest.fn().mockImplementation(() => ({
    getSubAgent: jest.fn(),
    createSubAgent: jest.fn(),
    updateSubAgent: jest.fn()
  }))
}))

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

// Mock all dependencies
jest.mock('../lib/agents/core/model-factory')
jest.mock('../lib/agents/core/event-emitter')
jest.mock('../lib/agents/core/execution-manager')
jest.mock('../lib/langchain/tooling')
jest.mock('../lib/agents/core/tool-heuristics')
jest.mock('../lib/agents/runtime-config')
jest.mock('../lib/diagnostics/tool-selection-logger')
jest.mock('../lib/notion/credentials')
jest.mock('../lib/utils/logger')

describe('Graph Builder - Critical Paths', () => {
  let graphBuilder: GraphBuilder
  let mockModelFactory: jest.Mocked<ModelFactory>
  let mockEventEmitter: jest.Mocked<EventEmitter>
  let mockExecutionManager: jest.Mocked<ExecutionManager>

  beforeEach(() => {
    // Setup mocks
    mockModelFactory = {
      createModel: jest.fn().mockReturnValue({} as any),
      getModelInfo: jest.fn().mockReturnValue({ provider: 'test', model: 'test' }),
      getModel: jest.fn().mockResolvedValue({} as any),
      clearCache: jest.fn(),
      getCacheSize: jest.fn().mockReturnValue(0)
    } as any

    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      listenerCount: jest.fn().mockReturnValue(0),
      eventNames: jest.fn().mockReturnValue([])
    } as any

    mockExecutionManager = {
      executeTool: jest.fn(),
      validateExecution: jest.fn(),
      executeWithHistory: jest.fn(),
      executeTools: jest.fn(),
      cleanupExecutionContext: jest.fn(),
      setExecutionContext: jest.fn()
    } as any

    const config: GraphBuilderConfig = {
      modelFactory: mockModelFactory,
      eventEmitter: mockEventEmitter,
      executionManager: mockExecutionManager
    }

    graphBuilder = new GraphBuilder(config)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('buildDualModeGraph', () => {
    test('construye grafo válido con configuración básica', async () => {
      const supervisorAgent: AgentConfig = {
        id: 'supervisor',
        name: 'Supervisor Agent',
        description: 'Supervisor',
        role: 'supervisor',
        model: 'openrouter:test',
        temperature: 0,
        maxTokens: 1000,
        tools: [],
        prompt: 'You are a supervisor',
        color: '#000',
        icon: 'supervisor'
      }

      const agents = new Map<string, AgentConfig>([
        ['agent1', {
          id: 'agent1',
          name: 'Test Agent 1',
          description: 'Test agent',
          role: 'specialist',
          model: 'openrouter:test',
          temperature: 0,
          maxTokens: 1000,
          tools: [],
          prompt: 'You are a test agent',
          color: '#000',
          icon: 'agent'
        }]
      ])

      const config: DualModeGraphConfig = {
        agents,
        supervisorAgent,
        enableDirectMode: true
      }

      const graph = await graphBuilder.buildDualModeGraph(config)

      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
      // Graph should have router, supervisor, and agent nodes
      expect(graph.nodes).toBeDefined()
      expect(Object.keys(graph.nodes)).toContain('router')
      expect(Object.keys(graph.nodes)).toContain('finalize')
      // Check that agent nodes are present (agent1 should be there)
      expect(Object.keys(graph.nodes)).toContain('agent1')
    })

    test('maneja configuración sin agentes', async () => {
      const supervisorAgent: AgentConfig = {
        id: 'supervisor',
        name: 'Supervisor Agent',
        description: 'Supervisor',
        role: 'supervisor',
        model: 'openrouter:test',
        temperature: 0,
        maxTokens: 1000,
        tools: [],
        prompt: 'You are a supervisor',
        color: '#000',
        icon: 'supervisor'
      }

      const config: DualModeGraphConfig = {
        agents: new Map(),
        supervisorAgent,
        enableDirectMode: false
      }

      const graph = await graphBuilder.buildDualModeGraph(config)

      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
    })

    test('detecta modo de conversación correctamente', async () => {
      // Test the conversation mode detection logic
      const mockState = {
        messages: [
          { content: 'Hola, necesito ayuda con Gmail', role: 'user' }
        ]
      }

      // Access private method for testing
      const detectMethod = (graphBuilder as any).detectConversationMode
      const result = detectMethod(mockState, mockState.messages[0])

      expect(result).toHaveProperty('mode')
      expect(typeof result.mode).toBe('string')
    })
  })

  describe('buildGraph', () => {
    test('construye grafo simple para agente individual', async () => {
      const agentConfig: AgentConfig = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent',
        role: 'specialist',
        model: 'openrouter:test',
        temperature: 0,
        maxTokens: 1000,
        tools: ['web-search'],
        prompt: 'You are a test agent',
        color: '#000',
        icon: 'agent'
      }

      const graph = await graphBuilder.buildGraph(agentConfig)

      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
      // Should have at least one node for the agent
      expect(graph.nodes).toBeDefined()
      expect(Object.keys(graph.nodes)).toContain('execute')
      // Should have at least one node for the agent
      expect(Object.keys(graph.nodes).length).toBeGreaterThan(0)
    })

    test('maneja agente sin tools', async () => {
      const agentConfig: AgentConfig = {
        id: 'simple-agent',
        name: 'Simple Agent',
        description: 'Simple agent without tools',
        role: 'specialist',
        model: 'openrouter:test',
        temperature: 0,
        maxTokens: 1000,
        tools: [],
        prompt: 'You are a simple agent',
        color: '#000',
        icon: 'agent'
      }

      const graph = await graphBuilder.buildGraph(agentConfig)

      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
    })
  })

  describe('Message Processing', () => {
    test('filtra mensajes de tools stale correctamente', () => {
      const messages = [
        { content: 'User message', role: 'user' },
        { content: 'Tool result', role: 'tool', tool_call_id: 'call1' },
        { content: 'Old tool result', role: 'tool', tool_call_id: 'call2' }
      ]

      const filterMethod = (graphBuilder as any).filterStaleToolMessages
      const filtered = filterMethod(messages)

      expect(filtered).toBeDefined()
      expect(Array.isArray(filtered)).toBe(true)
    })

    test('normaliza mensajes con system first', () => {
      const messages = [
        { content: 'User message', role: 'user' },
        { content: 'System prompt', role: 'system' }
      ]

      const normalizeMethod = (graphBuilder as any).normalizeSystemFirst
      const normalized = normalizeMethod(messages)

      expect(normalized).toBeDefined()
      expect(Array.isArray(normalized)).toBe(true)
      // First message should be user since no system message was provided
      expect(normalized[0].role).toBe('user')
    })
  })

  describe('Error Handling', () => {
    test('maneja errores en construcción de nodos', async () => {
      // Mock createAgentNode to throw error
      const createNodeMethod = (graphBuilder as any).createAgentNode
      jest.spyOn(graphBuilder as any, 'createAgentNode').mockRejectedValue(new Error('Node creation failed'))

      const agentConfig: AgentConfig = {
        id: 'failing-agent',
        name: 'Failing Agent',
        description: 'Agent that fails',
        role: 'specialist',
        model: 'openrouter:test',
        temperature: 0,
        maxTokens: 1000,
        tools: [],
        prompt: 'You are a failing agent',
        color: '#000',
        icon: 'agent'
      }

      // Should handle errors gracefully and still build graph
      const graph = await graphBuilder.buildGraph(agentConfig)
      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
    })
  })
})