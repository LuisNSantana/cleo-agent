describe('openrouter alias normalization', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let openproviders: typeof import('@/lib/openproviders').openproviders
  let chatMock: jest.Mock
  let createOpenRouterMock: jest.Mock

  beforeEach(async () => {
    jest.resetModules()
    chatMock = jest.fn().mockReturnValue('mock-model')
    createOpenRouterMock = jest.fn(() => ({ chat: chatMock }))

    jest.doMock('@openrouter/ai-sdk-provider', () => ({
      createOpenRouter: createOpenRouterMock,
    }))

    ;({ openproviders } = await import('@/lib/openproviders'))
  })

  it('maps bare grok-4-fast id to canonical OpenRouter slug', () => {
    const model = openproviders('grok-4-fast' as any)

    expect(createOpenRouterMock).toHaveBeenCalledTimes(1)
    expect(chatMock).toHaveBeenCalledWith('x-ai/grok-4-fast')
    expect(model).toBe('mock-model')
  })

  it('preserves prefixed openrouter:x-ai/grok-4-fast slug', () => {
    openproviders('openrouter:x-ai/grok-4-fast' as any)

    expect(createOpenRouterMock).toHaveBeenCalledTimes(1)
    expect(chatMock).toHaveBeenCalledWith('x-ai/grok-4-fast')
  })

  it('passes through other OpenRouter models without rewriting', () => {
    openproviders('openrouter:qwen/qwen3-next-80b-a3b-thinking' as any)

    expect(createOpenRouterMock).toHaveBeenCalledTimes(1)
    expect(chatMock).toHaveBeenCalledWith('qwen/qwen3-next-80b-a3b-thinking')
  })
})