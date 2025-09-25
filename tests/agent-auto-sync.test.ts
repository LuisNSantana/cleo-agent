import './setup/register-aliases'
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'

import { agentAutoSync, triggerAgentCreated } from '../lib/agents/auto-sync'
import type { AgentSyncEventData } from '../lib/agents/auto-sync'
import { agentRegistry } from '../lib/agents/registry'
import type { AgentConfig } from '../lib/agents/types'

function stubImmediateTimers() {
  const globalAny = globalThis as any
  const originalSetTimeout = globalAny.setTimeout
  const originalClearTimeout = globalAny.clearTimeout

  globalAny.setTimeout = ((fn: (...args: any[]) => any, _delay?: number, ...args: any[]) => {
    fn(...args)
    return {
      ref() {
        return this
      },
      unref() {
        return this
      },
      hasRef() {
        return false
      }
    } as NodeJS.Timeout
  }) as typeof setTimeout

  globalAny.clearTimeout = (() => undefined) as typeof clearTimeout

  return () => {
    globalAny.setTimeout = originalSetTimeout
    globalAny.clearTimeout = originalClearTimeout
  }
}

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

  const refreshMock = mock.method(agentRegistry, 'refresh', async (userId?: string) => {
    refreshCalls.push(userId)
  })
  const getAllMock = mock.method(agentRegistry, 'getAllAgentsForUser', async (_userId: string) => agentList)
  const updateMock = mock.method(agentRegistry, 'updateAgentDelegationTools', async (agentId: string, userId: string) => {
    updateCalls.push({ agentId, userId })
    return agentList.find(agent => agent.id === agentId) ?? null
  })

  const events: AgentSyncEventData[] = []
  const unsubscribe = agentAutoSync.subscribe(event => events.push(event))

  try {
    await triggerAgentCreated('new-sub-agent', 'user-123', 'New Specialist', true, 'ami-creative')

    assert.deepEqual(refreshCalls, ['user-123'])
    assert.equal(getAllMock.mock.calls.length, 1)
    assert.equal(updateCalls.length, 2, 'parent agents should receive delegation tool updates')
    assert.deepEqual(
      updateCalls.map(call => call.agentId).sort(),
      ['ami-creative', 'toby-technical']
    )
    assert.ok(updateCalls.every(call => call.userId === 'user-123'))

    const createdEvent = events.find(event => event.agentId === 'new-sub-agent')
    assert.ok(createdEvent, 'subscriber should receive created event')
    assert.equal(createdEvent.event, 'agent_created')
    assert.equal(createdEvent.isSubAgent, true)
    assert.equal(createdEvent.parentAgentId, 'ami-creative')
  } finally {
    unsubscribe()
    cleanupTimers()
    refreshMock.mock.restore()
    getAllMock.mock.restore()
    updateMock.mock.restore()
  }
})
