/**
 * E2E-lite test for Chat API route: verifies attachment URL propagation and tool param normalization.
 * - Ensures __lastAttachmentUrl is set from experimental_attachments
 * - Mocks streamText to invoke extract_text_from_pdf with truncated base64 to trigger URL remap
 * - Verifies fetch is called with the attachment URL (tool prefers URL over base64)
 */

import type { ChatRequest } from '@/app/api/chat/schema'

// Avoid heavy orchestrator/supabase imports by mocking the enhanced adapter upfront
jest.mock('@/lib/agents/orchestrator-adapter-enhanced', () => ({
  __esModule: true,
  getAgentOrchestrator: () => ({
    startAgentExecutionForUI: jest.fn(),
    getExecution: jest.fn(),
  }),
  registerRuntimeAgent: jest.fn(),
}))

// Provider map: resolve provider for our unit model
jest.mock('@/lib/openproviders/provider-map', () => ({
  __esModule: true,
  getProviderForModel: () => 'openrouter',
  normalizeModelId: (id: string) => id,
}))

// Light-weight pdf parser mock
jest.mock('pdf-parse-debugging-disabled', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ text: 'ok', info: {}, numpages: 1 })
}))

// Ensure image model detection doesn't crash and returns false for our unit model
jest.mock('@/lib/image-generation/models', () => ({
  __esModule: true,
  isImageGenerationModel: () => false,
}))

// Capture additionalParams passed to streamText
let capturedParams: any = null

// Mock AI SDK streamText to capture params and simulate a tool invocation
jest.mock('ai', () => ({
  __esModule: true,
  stepCountIs: () => ({}),
  // Minimal stub: return the config as the tool instance
  tool: (cfg: any) => cfg,
  streamText: async (params: any) => {
    capturedParams = params
    // Simulate the model calling a tool: pass a truncated base64 to trigger URL mapping
    try {
      const tool = params?.tools?.extract_text_from_pdf
      if (tool && typeof tool.execute === 'function') {
        await tool.execute({ pdfDataUrl: 'data:application/pdf;base64,[base64_encoded_pdf_content_from_attachment]' })
      }
    } catch {}
    return {
      toUIMessageStreamResponse: () => new Response('ok', { headers: { 'content-type': 'text/plain' } })
    }
  }
}))

// Mock validateAndTrackUsage to avoid Supabase
jest.mock('@/app/api/chat/api', () => ({
  __esModule: true,
  validateAndTrackUsage: jest.fn(async () => null),
  incrementMessageCount: jest.fn(async () => {}),
  logUserMessage: jest.fn(async () => {}),
  storeAssistantMessage: jest.fn(async () => {})
}))

// Provide a minimal model registry so route can resolve a model instance
jest.mock('@/lib/models', () => ({
  __esModule: true,
  getAllModels: async () => ([{
    id: 'unit-test-text',
    name: 'Unit Test Text Model',
    provider: 'openrouter',
    tools: true,
    defaults: { temperature: 0.2 },
    apiSdk: () => ({})
  }])
}))

// Provide a wrapped extract_text_from_pdf tool to exercise context-wrapper mapping
jest.mock('@/lib/tools', () => {
  const { extractTextFromPdfTool } = require('@/lib/tools/pdf-extract')
  const { wrapToolExecuteWithRequestContext } = require('@/lib/tools/context-wrapper')
  const wrapped = wrapToolExecuteWithRequestContext('extract_text_from_pdf', extractTextFromPdfTool)
  return {
    __esModule: true,
    tools: { extract_text_from_pdf: wrapped },
    ensureDelegationToolForAgent: (t: any) => t
  }
})

describe('Chat API - attachment URL propagation and PDF tool mapping', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    capturedParams = null
  })

  afterEach(() => {
    jest.resetAllMocks()
    global.fetch = originalFetch as any
    // cleanup globals set during route
    delete (global as any).__lastAttachmentUrl
  })

  it('sets __lastAttachmentUrl from attachments and tool prefers URL over base64', async () => {
    // Mock fetch to succeed when the tool downloads the PDF URL
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/pdf' : null) },
      arrayBuffer: async () => new ArrayBuffer(8)
    }) as any

    const { POST } = await import('@/app/api/chat/route')

    const payload: ChatRequest = {
      messages: [
        { role: 'user', content: 'Analiza este PDF, por favor.' } as any
      ],
      chatId: 'chat-1',
      userId: 'user-1',
      model: 'unit-test-text',
      isAuthenticated: false,
      systemPrompt: '',
      enableSearch: false,
      message_group_id: undefined,
      documentId: undefined,
      projectId: undefined,
      debugRag: false,
    }

    // Inject attachment on the last user message using experimental_attachments
    ;(payload.messages[payload.messages.length - 1] as any).experimental_attachments = [
      { url: 'https://cdn.example.com/doc.pdf', contentType: 'application/pdf', name: 'doc.pdf' }
    ]

    // Call the route with a Request-like object (only json() is used)
    const res = await POST({ json: async () => payload } as any)
    expect(res).toBeInstanceOf(Response)

    // Our streamText mock should have been invoked with tools that include the PDF tool
    expect(capturedParams?.tools?.extract_text_from_pdf).toBeTruthy()

    // And because we invoked the tool with a truncated base64, the wrapper should replace it with the URL
    expect(global.fetch).toHaveBeenCalled()
    const firstCall = (global.fetch as any).mock.calls[0]?.[0]
    expect(firstCall).toBe('https://cdn.example.com/doc.pdf')
  })
})
