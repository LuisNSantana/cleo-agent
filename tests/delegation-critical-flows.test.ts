
describe('Delegación - Flujos críticos', () => {
  const originalGetOrchestrator = (global as any).__getAgentOrchestrator

  afterEach(() => {
    ;(global as any).__cleoOrchestrator = undefined
    ;(global as any).__getAgentOrchestrator = originalGetOrchestrator
    jest.resetModules()
    jest.clearAllMocks()
  })

  test('delegation: ejecuta correctamente una tool delegada (happy path)', async () => {
    // Mock orchestrator to simulate a fast completion
    const execId = 'exec-123'
    const snapshots: Record<string, any> = {
      [execId]: { id: execId, status: 'completed', result: 'OK from sub-agent', messages: [{ role: 'assistant', content: 'OK from sub-agent' }] }
    }
    const orchestratorMock = {
      startAgentExecutionForUI: jest.fn(async () => ({ id: execId, status: 'running' })),
      getExecution: jest.fn((id: string) => snapshots[id] || { id, status: 'running' }),
      onEvent: jest.fn((handler: any) => {
        // emit completion shortly
        setTimeout(() => handler({ type: 'execution_completed', data: { executionId: execId }, agentId: 'toby-technical' }), 5)
      }),
      offEvent: jest.fn()
    }
    ;(global as any).__cleoOrchestrator = orchestratorMock
    jest.doMock('@/lib/agents/agent-orchestrator', () => ({
      __esModule: true,
      getAgentOrchestrator: () => orchestratorMock
    }))

    // Import tools after mocks are set
    const { delegationTools } = await import('@/lib/tools/delegation')
    const res = await (delegationTools as any).delegate_to_toby.execute({ taskDescription: 'Build and test the project' }, {})
    expect(res.status).toBe('delegated')
    expect(res.executionId).toBe(execId)
    expect(res.result).toContain('OK from sub-agent')
  })

  test('delegation: timeout returns partial result message', async () => {
    // Mock orchestrator that never completes
    const execId = 'exec-stuck'
    const orchestratorMock = {
      startAgentExecutionForUI: jest.fn(async () => ({ id: execId, status: 'running' })),
      // Keep progress at 0 to avoid timeout extensions in the loop
      getExecution: jest.fn(() => ({ id: execId, status: 'running', progress: 0 })),
      onEvent: jest.fn(),
      offEvent: jest.fn()
    }
    ;(global as any).__cleoOrchestrator = orchestratorMock
    jest.doMock('@/lib/agents/agent-orchestrator', () => ({
      __esModule: true,
      getAgentOrchestrator: () => orchestratorMock
    }))
    // Reduce timeout via env before importing module
  process.env.DELEGATION_TIMEOUT_MS = '20'
  process.env.DELEGATION_POLL_MS = '5'
  process.env.DELEGATION_EXTEND_ON_PROGRESS_MS = '0'
  process.env.DELEGATION_MAX_EXTENSION_MS = '0'
  process.env.PROGRESS_MIN_DELTA = '100'
  process.env.NO_PROGRESS_NO_EXTEND_MS = '0'

    const { delegationTools: toolsReloaded } = await import('@/lib/tools/delegation')
    const res = await (toolsReloaded as any).delegate_to_toby.execute({ taskDescription: 'Never finishes' }, {})
    expect(res.status).toBe('delegated')
    expect(res.executionId).toBe(execId)
    // Updated: The timeout message changed to "did not respond" instead of "timed out"
    expect(String(res.result)).toMatch(/did not respond|timed out/i)
  })
})
