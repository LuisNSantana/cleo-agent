/**
 * Forward Message Tool - LangGraph Supervisor Best Practice
 * 
 * Based on LangChain official benchmarks (June 2025):
 * https://blog.langchain.com/benchmarking-multi-agent-architectures/
 * 
 * Key insight: Supervisor "translation" layer causes 50% performance drop.
 * Solution: forward_message tool lets supervisor pass specialist responses
 * directly to user without paraphrasing/rewriting.
 * 
 * Use case: When specialist's response is complete, accurate, and well-formatted.
 * DO NOT use: When combining multiple agent results or fixing errors.
 */

import { tool } from 'ai'
import { z } from 'zod'
import logger from '@/lib/utils/logger'

const forwardMessageSchema = z.object({
  message: z.string().describe('The exact message from the specialist agent to forward to the user'),
  sourceAgent: z.string().describe('ID of the specialist agent who generated this response'),
  confidence: z.enum(['high', 'medium', 'low']).default('high')
    .describe('Confidence that this response fully addresses the user request'),
  reasoning: z.string().optional()
    .describe('Brief explanation of why forwarding is appropriate (internal only)')
})

export const forwardMessageTool = tool({
  description: `Forward a specialist agent's response directly to the user WITHOUT modification.
  
  Use this tool when:
  - The specialist's response is complete, accurate, and well-formatted
  - No additional context or synthesis is needed
  - The response directly answers the user's question
  - Preserving the specialist's tone and style is important
  
  DO NOT use when:
  - Combining results from multiple agents
  - Response needs reformatting or additional explanation
  - Error handling or clarification required
  - User asked for a summary or synthesis`,
  inputSchema: forwardMessageSchema,
  execute: async ({ message, sourceAgent, confidence, reasoning }) => {
    logger.info('📨 Forward message tool invoked', {
      sourceAgent,
      confidence,
      messagePreview: message?.slice?.(0, 100) || '',
      reasoning: reasoning || 'not provided'
    })

    // Validation: Don't forward empty/invalid messages
    if (!message || message.trim().length === 0) {
      return JSON.stringify({
        status: 'rejected',
        reason: 'Cannot forward empty message. Please synthesize a response instead.',
        action: 'rewrite_required'
      })
    }

    // Validation: Check confidence threshold
    if (confidence === 'low') {
      logger.warn('⚠️ Low confidence forward attempt', { sourceAgent, reasoning })
      return JSON.stringify({
        status: 'warning',
        reason: 'Low confidence - consider adding context or synthesis',
        message,
        sourceAgent
      })
    }

    // Success case: Mark message for passthrough
    return JSON.stringify({
      status: 'forwarded',
      message,
      sourceAgent,
      confidence,
      // Special marker for graph router to trigger passthrough node
      __passthrough: true,
      timestamp: new Date().toISOString()
    })
  }
})

export default forwardMessageTool
