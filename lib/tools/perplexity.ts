import { tool } from 'ai'
import { z } from 'zod'

/**
 * Perplexity Research Tool
 * Wraps Perplexity /chat/completions endpoint (sonar-deep-research or sonar) and returns
 * structured research output: sources, summary, followups.
 * Uses streaming internally later (MVP non-stream for tool call simplicity).
 */

interface PerplexitySource {
  url: string
  title?: string
}

interface PerplexityAPIResponse {
  id: string
  model: string
  created: number
  citations?: string[]
  choices: Array<{
    message: { role: string; content: string }
  }>
  sources?: PerplexitySource[]
}

function extractSections(raw: string) {
  // Heuristic parsing: look for headings or numbered lists
  const followups: string[] = []
  const lines = raw.split(/\n+/)
  for (const l of lines) {
    if (/^\d+\./.test(l.trim()) && l.length < 180) {
      followups.push(l.replace(/^\d+\.\s*/, '').trim())
    }
  }
  return { followups: [...new Set(followups)].slice(0, 6) }
}

export const perplexityResearchTool = tool({
  description: 'Deep web research via Perplexity (multi-source). Returns synthesized summary, cited sources, and follow-up questions.',
  inputSchema: z.object({
    query: z.string().min(4).max(500).describe('Research question or topic in natural language'),
    focus: z.string().optional().describe('Optional angle or focus area (e.g., SEO, competitive, technical)'),
    model: z.enum(['sonar-deep-research','sonar','sonar-pro','sonar-reasoning','sonar-reasoning-pro']).optional().default('sonar-deep-research').describe('Perplexity model variant.')
  }),
  execute: async (params) => {
    const { query, focus, model = 'sonar-deep-research' } = params as { query: string; focus?: string; model?: string }
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      return { success: false, summary: 'Perplexity API key not configured', sources: [], followups: [], model, raw: '' }
    }

    const prompt = focus ? `${query}\n\nFocus: ${focus}\nProvide sources.` : `${query}\nProvide sources.`
    try {
      const resp = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
            messages: [
            { role: 'system', content: 'You are an expert research assistant. Always cite sources.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      })
      if (!resp.ok) {
        return { success: false, summary: `Perplexity API error ${resp.status}`, sources: [], followups: [], model, raw: '' }
      }
  const data: PerplexityAPIResponse = await resp.json()
      const content = data.choices?.[0]?.message?.content || ''
      const { followups } = extractSections(content)
      // Basic source extraction (citations field OR regex of URLs)
      const sources: PerplexitySource[] = []
      if (Array.isArray(data.citations)) {
        for (const c of data.citations.slice(0, 12)) {
          sources.push({ url: c })
        }
      } else {
        const urlMatches = [...new Set(content.match(/https?:\/\/[^\s)\]]+/g) || [])].slice(0, 12)
        urlMatches.forEach(u => sources.push({ url: u }))
      }
      return { success: true, summary: content.slice(0, 4000), sources, followups, model: data.model || model, raw: content }
    } catch (e: any) {
      return { success: false, summary: 'Perplexity request failed', sources: [], followups: [], model, raw: String(e) }
    }
  }
})

export const perplexityTools = {
  perplexity_research: perplexityResearchTool
}
