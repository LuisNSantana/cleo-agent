import { INSIGHTS_AGENT } from '@/lib/agents/predefined/insights'

describe('INSIGHTS_AGENT config', () => {
  it('has required fields and tools', () => {
    expect(INSIGHTS_AGENT.id).toBe('iris-insights')
    expect(INSIGHTS_AGENT.role).toBe('specialist')
    expect(Array.isArray(INSIGHTS_AGENT.tools)).toBe(true)
    // Core tools used by Insights
    const tools = new Set(INSIGHTS_AGENT.tools)
    ;['readGoogleDoc','openDocument','createDocument','extract_text_from_pdf','webSearch','complete_task']
      .forEach(t => expect(tools.has(t)).toBe(true))
  })
})
