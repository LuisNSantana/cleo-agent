import logger from '@/lib/utils/logger'
/**
 * Simplified Execution Manager for Agent System
 * Handles basic execution coordination
 */

import { BaseMessage } from '@langchain/core/messages'
import { AgentConfig, AgentExecution, ExecutionResult, ExecutionOptions } from '../types'
import { logToolExecutionStart, logToolExecutionEnd } from '@/lib/diagnostics/tool-selection-logger'
import { resolveNotionKey } from '@/lib/notion/credentials'
import { EventEmitter } from './event-emitter'
import { AgentErrorHandler } from './error-handler'
import { SystemMessage } from '@langchain/core/messages'
import { AsyncLocalStorage } from 'async_hooks'
import { withRequestContext, getRequestContext } from '@/lib/server/request-context'

// AsyncLocalStorage for execution context
const executionContext = new AsyncLocalStorage<string>()

export interface ExecutionManagerConfig {
  eventEmitter: EventEmitter
  errorHandler: AgentErrorHandler
}

export interface ExecutionContext {
  threadId: string
  userId: string
  agentId: string
  messageHistory: BaseMessage[]
  metadata?: Record<string, any>
}

export interface ToolResult {
  tool_call_id: string
  tool_name: string
  output: any
  error?: string
}

export class ExecutionManager {
  private eventEmitter: EventEmitter
  private errorHandler: AgentErrorHandler

  constructor(config: ExecutionManagerConfig) {
    this.eventEmitter = config.eventEmitter
    this.errorHandler = config.errorHandler
  }

  /**
   * Get current execution ID from AsyncLocalStorage
   */
  static getCurrentExecutionId(): string | undefined {
    return executionContext.getStore()
  }

  /**
   * Set execution context using AsyncLocalStorage
   */
  static runWithExecutionId<T>(executionId: string, fn: () => T): T {
    return executionContext.run(executionId, fn)
  }

  async executeWithHistory(
    agentConfig: AgentConfig,
    graph: any, // Use any for compatibility
    context: ExecutionContext,
    execution: AgentExecution,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      this.eventEmitter.emit('execution.started', execution)

      // Filter out standalone ToolMessages which cause LangChain errors
      // ToolMessages must only follow same-turn tool_calls
      const filteredMessages = this.filterStaleToolMessages(context.messageHistory)

      // Prepare initial state compatible with MessagesAnnotation
      // IMPORTANT: include metadata so parentExecutionId and other flags propagate into the graph state
      const initialState = {
        messages: filteredMessages,
        executionId: execution.id,
        userId: context.userId, // Include userId for tool context propagation
        metadata: context.metadata || {}
      }

      // Compile graph and execute within request context so tools can read userId
      const compiledGraph = graph.compile()
      
      // CRITICAL: Add timeout at graph execution level to prevent indefinite hangs
      // This prevents the graph from hanging if LLM API is slow or tools get stuck
      const GRAPH_EXECUTION_TIMEOUT = options.timeout || 300000; // 5 minutes default, respects options.timeout
      
      logger.debug(`🚀 [EXECUTION] Starting graph execution for ${agentConfig.id} with timeout ${GRAPH_EXECUTION_TIMEOUT}ms`);
      
      const graphPromise = withRequestContext(
        { userId: context.userId, model: agentConfig.id, requestId: execution.id }, 
        async () => {
          return compiledGraph.invoke(initialState)
        }
      );
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          logger.error(`⏱️ [EXECUTION] Graph execution timeout for ${agentConfig.id} after ${GRAPH_EXECUTION_TIMEOUT}ms`);
          reject(new Error(`Graph execution timeout after ${GRAPH_EXECUTION_TIMEOUT}ms`));
        }, GRAPH_EXECUTION_TIMEOUT)
      );
      
      const result = await Promise.race([graphPromise, timeoutPromise]);

      // Extract final response
      const finalMessages = result.messages || []
      const lastMessage = finalMessages[finalMessages.length - 1]
      const content = lastMessage?.content || 'No response generated'

      const executionResult: ExecutionResult = {
        content: content as string,
        // Preserve sender attribution from the last AIMessage for UI and adapters
        metadata: {
          ...(result.metadata || {}),
          sender: (lastMessage as any)?.additional_kwargs?.sender
        },
        toolCalls: lastMessage?.tool_calls || [],
        executionTime: Date.now() - startTime,
        tokensUsed: this.estimateTokens(finalMessages),
        messages: finalMessages // Include all messages from graph execution
      }

      // Update execution metrics
      execution.metrics.executionTime = executionResult.executionTime!
      execution.metrics.executionTimeMs = executionResult.executionTime!
      execution.metrics.tokensUsed = executionResult.tokensUsed!
      execution.metrics.totalTokens = executionResult.tokensUsed!

  this.eventEmitter.emit('execution.completed', execution)

  return executionResult
    } catch (error) {
      await this.errorHandler.handleExecutionError(execution, error as Error)
      
  throw error
    }
  }

  async executeTools(toolCalls: any[], agentConfig: AgentConfig): Promise<ToolResult[]> {
    const results: ToolResult[] = []
    const requestContext = getRequestContext()

    for (const toolCall of toolCalls) {
      try {
        const execStart = Date.now()
        let notionCredentialPresent: boolean | undefined
        if (toolCall.name?.startsWith('notion_')) {
          // Best-effort credential resolution (no throw)
          try {
            const userId = requestContext?.userId || agentConfig.userId
            console.log('[Notion][ToolExec] Checking credentials for userId:', userId)
            const key = await resolveNotionKey(userId)
            notionCredentialPresent = !!key
            console.log('[Notion][ToolExec] notionCredentialPresent:', notionCredentialPresent)
          } catch (err) {
            console.error('[Notion][ToolExec] Error resolving Notion key:', err)
            notionCredentialPresent = false
          }
        }

        logToolExecutionStart({
            event: 'tool_start',
            agentId: agentConfig.id,
            userId: requestContext?.userId || agentConfig.userId,
            executionId: requestContext?.requestId,
            tool: toolCall.name,
            argsShape: toolCall.args ? Object.keys(toolCall.args) : [],
            notionCredentialPresent
        })
        this.eventEmitter.emit('tool.executing', {
          toolName: toolCall.name,
          agentId: agentConfig.id,
          args: toolCall.args
        })

        // Here you would integrate with your actual tool system
        // For now, returning a mock result
        const result: ToolResult = {
          tool_call_id: toolCall.id,
          tool_name: toolCall.name,
          output: `Tool ${toolCall.name} executed successfully`,
          error: undefined
        }

        results.push(result)

        this.eventEmitter.emit('tool.completed', {
          toolName: toolCall.name,
          agentId: agentConfig.id,
          result: result.output
        })
        logToolExecutionEnd({
          event: 'tool_end',
          agentId: agentConfig.id,
          userId: requestContext?.userId || agentConfig.userId,
          executionId: requestContext?.requestId,
          tool: toolCall.name,
          success: true,
          durationMs: Date.now() - execStart,
          notionCredentialPresent
        })
      } catch (error) {
        const errorResult: ToolResult = {
          tool_call_id: toolCall.id,
          tool_name: toolCall.name,
          output: null,
          error: (error as Error).message
        }

        results.push(errorResult)

        this.eventEmitter.emit('tool.failed', {
          toolName: toolCall.name,
          agentId: agentConfig.id,
          error: error
        })
        logToolExecutionEnd({
          event: 'tool_end',
          agentId: agentConfig.id,
          userId: requestContext?.userId || agentConfig.userId,
          executionId: requestContext?.requestId,
          tool: toolCall.name,
          success: false,
          durationMs: 0,
          error: (error as Error).message
        })
      }
    }

    return results
  }

  private estimateTokens(messages: BaseMessage[]): number {
    // Simple token estimation (4 characters ≈ 1 token)
    const totalChars = messages.reduce((sum, msg) => {
      return sum + (typeof msg.content === 'string' ? msg.content.length : 0)
    }, 0)
    return Math.ceil(totalChars / 4)
  }

  /**
   * Filter out standalone ToolMessages which cause LangChain errors.
   * ToolMessages must only follow same-turn tool_calls.
   * Convert to system breadcrumbs to preserve context.
   */
  private filterStaleToolMessages(messages: BaseMessage[]): BaseMessage[] {
    return messages.map(msg => {
      if (msg._getType() === 'tool') {
        // Convert stale ToolMessage to SystemMessage breadcrumb
        return new SystemMessage({
          content: `[Tool result from previous session: ${msg.content}]`
        })
      }
      return msg
    })
  }

  /**
   * Clean up execution context when all delegations are complete
   * Only cleanup when explicitly called by orchestrator
   */
  cleanupExecutionContext(executionId: string): void {
    // Execution context is now handled by AsyncLocalStorage
    logger.debug(`🧹 [EXECUTION] Execution context cleaned up for: ${executionId}`)
  }

  /**
   * Set execution context for delegation tracking
   * @deprecated Use withRequestContext instead for proper isolation
   */
  setExecutionContext(executionId: string): void {
    // No longer using global variables for context
    logger.debug(`🔄 [EXECUTION] Set execution context deprecated for: ${executionId}`)
  }
}
