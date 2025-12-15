/**
 * Delegation detection service
 * Analyzes user messages to detect delegation intent and route to appropriate agents
 */

import type { CoreMessage } from 'ai'
import { scoreDelegationIntent } from '@/lib/delegation/intent-heuristics'
import { enrichKeywordsWithAgents } from '@/lib/delegation/intent-heuristics'
import { analyzeDelegationIntent } from '@/lib/agents/delegation'
import { chatLogger } from './logger'

export interface DelegationIntent {
  detected: boolean
  quickCheck: boolean
  heuristicScore?: {
    target: string | null
    score: number
  } | null
  intelligentAnalysis?: {
    agentId: string
    toolName: string
    confidence: number
  } | null
}

export class DelegationDetectionService {
  private readonly QUICK_DELEGATION_REGEX =
    /\b(delega|delegate|ask|pregunta|call|llama|usa|use|pídele|with|encárgalo|handoff|sub[- ]?agent|agente)\b/i

  /**
   * Detect delegation intent from user message
   */
  async detectIntent(
    messages: CoreMessage[],
    userId: string,
    debugMode = false
  ): Promise<DelegationIntent> {
    const lastUserText = this.extractLastUserText(messages)

    if (!lastUserText.trim()) {
      return { detected: false, quickCheck: false }
    }

    // Quick pattern check first
    const quickCheck = this.QUICK_DELEGATION_REGEX.test(lastUserText)

    if (!quickCheck) {
      return { detected: false, quickCheck: false }
    }

    chatLogger.debug('Delegation keywords detected, running full analysis')

    try {
      // Load agents and enrich keywords
      const { agentLoader } = await import('@/lib/agents/agent-loader')
      const availableAgents = await agentLoader.loadAgents({ userId })

      enrichKeywordsWithAgents(
        availableAgents.map((a) => ({
          id: a.id,
          name: a.name,
          tags: a.tags,
          description: a.description,
        }))
      )

      const availableAgentIds = availableAgents.filter((a) => a.role !== 'supervisor').map((a) => a.id)

      // Run heuristic scoring
      const heuristicResult = scoreDelegationIntent(lastUserText, {
        debug: debugMode,
        availableAgents: availableAgentIds,
      })

      // Run intelligent analysis
      const intelligentResult = analyzeDelegationIntent(lastUserText)

      const detected = Boolean(
        (heuristicResult?.score && heuristicResult.score > 0) ||
        (intelligentResult?.confidence && intelligentResult.confidence >= 0.6)
      )

      if (detected) {
        chatLogger.info('Delegation intent detected', {
          heuristic: heuristicResult,
          intelligent: intelligentResult,
        })
      }

      return {
        detected,
        quickCheck: true,
        heuristicScore: heuristicResult || undefined,
        intelligentAnalysis: intelligentResult || undefined,
      }
    } catch (error) {
      chatLogger.error('Delegation detection failed', { error })
      return { detected: false, quickCheck: true }
    }
  }

  /**
   * Extract text content from last user message
   */
  private extractLastUserText(messages: CoreMessage[]): string {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user') as any

    if (!lastUser) return ''

    // Handle AI SDK v5 structure (parts)
    if (Array.isArray(lastUser.parts)) {
      return lastUser.parts
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => p.text || p.content || '')
        .join('\n')
    }

    // Handle legacy structure (content)
    if (typeof lastUser.content === 'string') {
      return lastUser.content
    }

    if (Array.isArray(lastUser.content)) {
      return lastUser.content
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => p.text || p.content || '')
        .join('\n')
    }

    return ''
  }

  /**
   * Create delegation hint for system prompt
   * CRITICAL: This hint must be strong enough to override model's tendency to answer directly
   */
  createDelegationHint(intent: DelegationIntent): string {
    if (!intent.detected || !intent.heuristicScore?.target || intent.heuristicScore.score < 0.55) {
      return ''
    }

    const agentKey = intent.heuristicScore.target
    const normalized = agentKey.replace(/[^a-z0-9]+/g, '_')
    const toolName = `delegate_to_${normalized}`
    const confidence = Math.round(intent.heuristicScore.score * 100)

    // Use stronger language when confidence is high
    if (confidence >= 80) {
      return `\n\n**MANDATORY DELEGATION** (${confidence}% confidence): The user's request REQUIRES specialist agent '${agentKey}'. You MUST call tool \`${toolName}\` immediately. DO NOT attempt to answer directly - this task requires specialized capabilities that only ${agentKey} can provide. Call the delegation tool NOW with the user's request as the task parameter.`
    } else if (confidence >= 65) {
      return `\n\n**STRONG DELEGATION RECOMMENDATION** (${confidence}% confidence): This request maps to specialist agent '${agentKey}'. Call tool \`${toolName}\` to provide the best response. The specialist has unique capabilities for this type of request. Delegate first, do not answer directly.`
    } else {
      return `\n\n**Delegation Hint** (${confidence}% confidence): The request likely maps to specialist '${agentKey}'. Consider calling \`${toolName}\` for specialized handling.`
    }
  }
}

export const delegationDetectionService = new DelegationDetectionService()
