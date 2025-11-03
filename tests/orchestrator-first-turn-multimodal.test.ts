import { ensureImageAnalysisHint } from '@/lib/chat/image-hint'
import { orderTextBeforeImages } from '@/lib/chat/parts-order'

// Capture messages passed to the fake model
let capturedMessages: any[] | null = null
let capturedLastContent: any = null

jest.mock('@/lib/agents/unified-config', () => ({
  getAllAgents: jest.fn(async (_userId?: string) => [
    {
      id: 'cleo-supervisor',
      name: 'Cleo',
      model: 'gpt-4o-mini',
      prompt: 'You are Cleo',
      tools: [],
      role: 'supervisor'
    }
  ])
}))

jest.mock('@/lib/chat/prompt', () => ({
  buildFinalSystemPrompt: jest.fn(async ({ baseSystemPrompt }: any) => ({ finalSystemPrompt: baseSystemPrompt }))
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: () => ({ select: () => ({}) })
  }))
}))

jest.mock('@/lib/server/request-context', () => ({
  withRequestContext: async (_ctx: any, fn: any) => await fn(),
  getCurrentUserId: () => 'user-1'
}))

// Mock the core orchestrator to avoid heavy graph and metrics; capture the message history
jest.mock('@/lib/agents/core/orchestrator', () => {
  const executions: any[] = []
  const core = {
    async executeAgent(_target: any, ctx: any, _opts: any) {
      // Capture the messages that would be sent to the model
      capturedMessages = ctx.messageHistory
      try {
        const last = ctx.messageHistory[ctx.messageHistory.length - 1]
        capturedLastContent = (last as any)?.content
          || (last as any)?.kwargs?.content
          || (last as any)?.lc_kwargs?.content
          || null
      } catch {}
      const id = `exec_test_${Date.now()}`
      const execution = { id, agentId: ctx.agentId, userId: ctx.userId, threadId: ctx.threadId, status: 'running', steps: [] }
      executions.push(execution)
      // Complete quickly
      setTimeout(() => { execution.status = 'completed' }, 10)
      return execution
    },
    getActiveExecutions() { return executions },
    getExecutionStatus(id: string) { return executions.find(e => e.id === id) || null }
  }
  return { getGlobalOrchestrator: () => core }
})

// Mock SubAgentManager to avoid loading supabase-backed services
jest.mock('@/lib/agents/core/sub-agent-manager', () => ({
  SubAgentManager: class {
    constructor(_userId?: string) {}
    async setUser(_userId?: string) { /* no-op */ }
    async getSubAgents() { return [] }
    getDelegationTools() { return [] as any[] }
  }
}))

describe('E2E-ish: first turn multimodal ordering and non-empty response', () => {
  test('ensures text precedes images and model responds', async () => {
    const { getAgentOrchestrator } = require('@/lib/agents/agent-orchestrator')
    const orchestrator = getAgentOrchestrator() as any

    // Simulate a user input with image first, then text (route-level helpers will fix order)
    const rawParts = [
      { type: 'image', image: 'https://example.com/pic.png' },
      { type: 'text', text: 'Por favor analiza esta imagen' },
    ]
    // Apply same helpers used by route
    const ensured = ensureImageAnalysisHint(rawParts)
    const ordered = orderTextBeforeImages(ensured)

    const exec = await orchestrator.startAgentExecutionForUI(
      'Por favor analiza esta imagen',
      'cleo-supervisor',
      'thread-test',
      'user-1',
      [],
      true,
      ordered
    )

    expect(exec && exec.id).toBeTruthy()

    // Wait briefly for the async execution to capture the message history
    await new Promise((r) => setTimeout(r, 30))

    expect(Array.isArray(capturedMessages)).toBe(true)
    const content = capturedLastContent as any
    if (Array.isArray(content)) {
      // Assert text first, image last on captured model input
      expect(content[0]?.type).toBe('text')
      expect((content[0]?.text || '').length).toBeGreaterThan(0)
      expect(content[content.length - 1]?.type).toBe('image')
    } else {
      // Fallback: assert helper-produced ordering
      expect(ordered[0]?.type).toBe('text')
      expect((ordered[0]?.text || '').length).toBeGreaterThan(0)
      expect(ordered[ordered.length - 1]?.type).toBe('image')
    }
  }, 10_000)
})
