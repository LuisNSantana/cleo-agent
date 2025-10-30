/**
 * Tool Executor Module
 * 
 * Handles parallel tool execution with timeouts and proper error handling.
 * Extracted from GraphBuilder to reduce complexity.
 */

import type { StructuredToolInterface } from '@langchain/core/tools'
import { ToolMessage } from '@langchain/core/messages'
import { logger } from '@/lib/logger'
import { EventEmitter } from 'events'

export interface ToolExecutionConfig {
  maxToolCalls: number
  toolTimeoutMs: number
  agentId: string
}

export interface ToolCall {
  id?: string
  tool_call_id?: string
  name?: string
  function?: {
    name: string
    arguments: string | Record<string, any>
  }
  args?: Record<string, any>
}

export interface ToolExecutionResult {
  toolMessage: ToolMessage
  success: boolean
  error?: Error
}

/**
 * Execute multiple tools in parallel with timeout protection
 */
export async function executeToolsInParallel(
  toolCalls: ToolCall[],
  toolRuntime: any,
  config: ToolExecutionConfig,
  eventEmitter?: EventEmitter
): Promise<ToolExecutionResult[]> {
  
  logger.debug('TOOL-EXECUTOR', `Executing ${toolCalls.length} tools in parallel`, {
    agentId: config.agentId,
    toolNames: toolCalls.map(tc => tc.name || tc.function?.name).join(', ')
  })

  const toolPromises = toolCalls.map(async (call): Promise<ToolExecutionResult> => {
    const callId = call?.id || call?.tool_call_id || `tool_${Date.now()}_${Math.random()}`
    const name = call?.name || call?.function?.name
    let args = call?.args || call?.function?.arguments || {}
    
    // Emit executing event
    eventEmitter?.emit('tool.executing', {
      agentId: config.agentId,
      toolName: name,
      callId: callId,
      args: args
    })
    
    try {
      // Parse args if string
      if (typeof args === 'string') {
        try { 
          args = JSON.parse(args) 
        } catch (parseError) {
          logger.warn('TOOL-EXECUTOR', `Failed to parse args for ${name}`, parseError)
        }
      }
      
      // Execute with timeout
      const toolPromise = toolRuntime.run(String(name), args)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool ${name} timed out after ${config.toolTimeoutMs/1000}s`)),
          config.toolTimeoutMs
        )
      )
      
      const output = await Promise.race([toolPromise, timeoutPromise])
      
      // Create success ToolMessage
      const toolMessage = new ToolMessage({
        content: typeof output === 'string' ? output : JSON.stringify(output),
        tool_call_id: callId
      })
      
      eventEmitter?.emit('tool.completed', {
        agentId: config.agentId,
        toolName: name,
        callId,
        result: output
      })
      
      return {
        toolMessage,
        success: true
      }
      
    } catch (error) {
      logger.error('TOOL-EXECUTOR', `Tool ${name} failed`, error)
      
      // Create error ToolMessage
      const toolMessage = new ToolMessage({
        content: `Error: ${(error as Error).message}`,
        tool_call_id: callId
      })
      
      eventEmitter?.emit('tool.failed', {
        agentId: config.agentId,
        toolName: name,
        callId,
        error: error
      })
      
      return {
        toolMessage,
        success: false,
        error: error as Error
      }
    }
  })

  // Execute all in parallel
  const results = await Promise.allSettled(toolPromises)
  
  // Convert to ToolExecutionResult[]
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      // Fallback error message
      const callId = toolCalls[index]?.id || `tool_error_${Date.now()}`
      return {
        toolMessage: new ToolMessage({
          content: `Unexpected error: ${result.reason}`,
          tool_call_id: callId
        }),
        success: false,
        error: new Error(String(result.reason))
      }
    }
  })
}

/**
 * Execute tools sequentially (for dependencies)
 */
export async function executeToolsSequentially(
  toolCalls: ToolCall[],
  toolRuntime: any,
  config: ToolExecutionConfig,
  eventEmitter?: EventEmitter
): Promise<ToolExecutionResult[]> {
  
  logger.debug('TOOL-EXECUTOR', `Executing ${toolCalls.length} tools sequentially`, {
    agentId: config.agentId
  })

  const results: ToolExecutionResult[] = []
  
  for (const call of toolCalls) {
    const result = await executeToolsInParallel([call], toolRuntime, config, eventEmitter)
    results.push(result[0])
    
    // Stop on first failure if needed
    if (!result[0].success) {
      logger.warn('TOOL-EXECUTOR', 'Sequential execution stopped due to failure', {
        failedTool: call.name || call.function?.name
      })
      break
    }
  }
  
  return results
}

/**
 * Check if tool execution budget is exceeded
 */
export function isToolBudgetExceeded(
  totalToolCalls: number,
  executionStartMs: number,
  config: { maxToolCalls: number; maxExecutionMs: number }
): { exceeded: boolean; reason?: string } {
  
  if (totalToolCalls >= config.maxToolCalls) {
    return {
      exceeded: true,
      reason: `Tool call limit reached (${config.maxToolCalls})`
    }
  }
  
  const elapsedMs = Date.now() - executionStartMs
  if (elapsedMs > config.maxExecutionMs) {
    return {
      exceeded: true,
      reason: `Execution time limit reached (${config.maxExecutionMs / 1000}s)`
    }
  }
  
  return { exceeded: false }
}
