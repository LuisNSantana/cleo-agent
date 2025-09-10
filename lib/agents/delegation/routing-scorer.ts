/**
 * Routing Scorer (Phase 1)
 * 
 * Picks the best agent based on:
 * - Tag/keyword overlap with the user request
 * - Optional recent average latency (prefer lower)
 */

import type { AgentConfig } from '../types'

export interface RoutingCandidate {
  agent: AgentConfig
  score: number
  reasons: string[]
  avgLatencyMs?: number
}

export type LatencyMap = Record<string, number | undefined>

export function scoreAgentsForRequest(
  userText: string,
  candidates: AgentConfig[],
  latencyMap: LatencyMap = {}
): RoutingCandidate[] {
  const text = (userText || '').toLowerCase()
  const tokens = tokenize(text)

  const results: RoutingCandidate[] = candidates.map(agent => {
    let score = 0
    const reasons: string[] = []

    const haystack = buildHaystack(agent)

    // Base score: token overlap
    let tokenHits = 0
    for (const t of tokens) {
      if (haystack.includes(t)) tokenHits++
    }
    if (tokenHits > 0) {
      score += tokenHits
      reasons.push(`token_hits:${tokenHits}`)
    }

    // Tag boost
    const tagSet = new Set((agent.tags || []).map(s => s.toLowerCase()))
    let tagBoosts = 0
    for (const t of tokens) {
      if (tagSet.has(t)) {
        score += 2
        tagBoosts++
      }
    }
    if (tagBoosts > 0) reasons.push(`tag_boosts:${tagBoosts}`)

    // Latency preference (lower is better)
    const avgLatencyMs = latencyMap[agent.id]
    if (typeof avgLatencyMs === 'number' && avgLatencyMs > 0) {
      // Normalize: subtract up to 1.0 points for faster agents
      const latencyFactor = Math.min(1, 5000 / (avgLatencyMs + 1)) // 0..5 range → cap to 1
      score += latencyFactor
      reasons.push(`latency_bonus:${latencyFactor.toFixed(2)}`)
    }

    return { agent, score, reasons, avgLatencyMs }
  })

  // Sort by score desc, then by latency asc if available
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const la = a.avgLatencyMs ?? Infinity
    const lb = b.avgLatencyMs ?? Infinity
    return la - lb
  })
}

export function pickBestAgent(
  userText: string,
  candidates: AgentConfig[],
  latencyMap: LatencyMap = {}
): RoutingCandidate | null {
  if (!candidates.length) return null
  const ranked = scoreAgentsForRequest(userText, candidates, latencyMap)
  const top = ranked[0]
  // Require minimal positive evidence
  return top && top.score > 0 ? top : null
}

function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 3)
}

function buildHaystack(agent: AgentConfig): string {
  const parts = [agent.name, agent.description, agent.objective || '']
  if (agent.tags && agent.tags.length) parts.push(agent.tags.join(' '))
  return parts
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
