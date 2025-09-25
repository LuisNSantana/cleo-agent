test('triggerAgentCreated maneja error en updateAgentDelegationTools', async () => {
  const cleanupTimers = stubImmediateTimers()
  const refreshMock = jest.spyOn(agentRegistry, 'refresh').mockImplementation(async () => {})
  // Mock to return a parent agent so updateAgentDelegationTools gets called
  const getAllMock = jest.spyOn(agentRegistry, 'getAllAgentsForUser').mockImplementation(async (_userId: string) => [{
    id: 'parent-agent',
    name: 'Parent Agent',
    description: 'desc',
    role: 'specialist',
    model: 'test',
    temperature: 0,
    maxTokens: 100,
    tools: [],
    prompt: '',
    color: '#000',
    icon: 'agent',
    isSubAgent: false
  }])
  const updateMock = jest.spyOn(agentRegistry, 'updateAgentDelegationTools').mockImplementation(async () => { throw new Error('fail') })
  const events: AgentSyncEventData[] = []
  const unsubscribe = agentAutoSync.subscribe(event => events.push(event))
  try {
    // Should resolve successfully even when updateAgentDelegationTools fails (errors are handled gracefully)
    await expect(triggerAgentCreated('new-sub-agent', 'user-123', 'New Specialist', true, 'ami-creative')).resolves.toBeUndefined()
    expect(updateMock).toHaveBeenCalled()
  } finally {
    unsubscribe()
    cleanupTimers()
    refreshMock.mockRestore()
    getAllMock.mockRestore()
    updateMock.mockRestore()
  }
})
afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
// Utilidad para stubbear timers en tests async
function stubImmediateTimers() {
  const globalAny = globalThis as any
  const originalSetTimeout = globalAny.setTimeout
  const originalClearTimeout = globalAny.clearTimeout

  globalAny.setTimeout = ((fn: (...args: any[]) => any, _delay?: number, ...args: any[]) => {
    fn(...args)
    return {
      ref() { return this },
      unref() { return this },
      hasRef() { return false }
    } as NodeJS.Timeout
  }) as typeof setTimeout

  globalAny.clearTimeout = (() => undefined) as typeof clearTimeout

  return () => {
    globalAny.setTimeout = originalSetTimeout
    globalAny.clearTimeout = originalClearTimeout
  }
}
import { agentAutoSync, triggerAgentCreated } from '../lib/agents/auto-sync'
import type { AgentSyncEventData } from '../lib/agents/auto-sync'
import { agentRegistry } from '../lib/agents/registry'
import type { AgentConfig } from '../lib/agents/types'

function createAgent(partial: Partial<AgentConfig>): AgentConfig {
  return {
    id: 'agent-id',
    name: 'Agent',
    description: 'Test agent',
    role: 'specialist',
    model: 'openrouter:test',
    temperature: 0,
    maxTokens: 8192,
    tools: [],
    prompt: 'You are a helper.',
    color: '#000000',
    icon: 'agent',
    ...partial
  }
}

describe('Agent Auto Sync', () => {
  test('dummy', () => {
    expect(true).toBe(true)
  })
})

test('triggerAgentCreated refreshes registry, updates delegation tools, and notifies subscribers', async () => {
  const cleanupTimers = stubImmediateTimers()
  const refreshCalls: Array<string | undefined> = []
  const updateCalls: Array<{ agentId: string; userId: string }> = []
  const agentList: AgentConfig[] = [
    createAgent({ id: 'ami-creative', name: 'Ami', userId: 'user-123' }),
    createAgent({ id: 'toby-technical', name: 'Toby', userId: 'user-123' }),
    createAgent({
      id: 'astra-email',
      name: 'Astra',
      userId: 'user-123',
      isSubAgent: true,
      parentAgentId: 'ami-creative'
    })
  ]

  const refreshMock = jest.spyOn(agentRegistry, 'refresh').mockImplementation(async (userId?: string) => {
    refreshCalls.push(userId)
  })
  const getAllMock = jest.spyOn(agentRegistry, 'getAllAgentsForUser').mockImplementation(async (_userId: string) => agentList)
  const updateMock = jest.spyOn(agentRegistry, 'updateAgentDelegationTools').mockImplementation(async (agentId: string, userId: string) => {
    updateCalls.push({ agentId, userId })
    return agentList.find(agent => agent.id === agentId) ?? null
  })

  const events: AgentSyncEventData[] = []
  const unsubscribe = agentAutoSync.subscribe(event => events.push(event))

  try {
    await triggerAgentCreated('new-sub-agent', 'user-123', 'New Specialist', true, 'ami-creative')

    expect(refreshCalls).toEqual(['user-123'])
    expect(getAllMock).toHaveBeenCalledTimes(1)
    expect(updateCalls.length).toBe(2)
    expect(updateCalls.map(call => call.agentId).sort()).toEqual(['ami-creative', 'toby-technical'])
    expect(updateCalls.every(call => call.userId === 'user-123')).toBe(true)

  const createdEvent = events.find(event => event.agentId === 'new-sub-agent')
  expect(createdEvent).toBeDefined()
  if (!createdEvent) throw new Error('createdEvent is undefined')
  expect(createdEvent.event).toBe('agent_created')
  expect(createdEvent.isSubAgent).toBe(true)
  expect(createdEvent.parentAgentId).toBe('ami-creative')
  } finally {
    unsubscribe()
    cleanupTimers()
    refreshMock.mockRestore()
    getAllMock.mockRestore()
    updateMock.mockRestore()
  }
})
