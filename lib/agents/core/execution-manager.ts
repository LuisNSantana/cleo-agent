/**
 * Simplified Execution Manager for Agent System
 * Handles basic execution coordination
 */

import { BaseMessage } from '@langchain/core/messages'
import { AgentConfig, AgentExecution, ExecutionResult, ExecutionOptions } from '../types'
import { EventEmitter } from './event-emitter'
import { AgentErrorHandler } from './error-handler'
import { SystemMessage } from '@langchain/core/messages'

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
      const initialState = {
        messages: filteredMessages
      }

      // Compile and execute graph
      const compiledGraph = graph.compile()
      const result = await compiledGraph.invoke(initialState)

      // Extract final response
      const finalMessages = result.messages || []
      const lastMessage = finalMessages[finalMessages.length - 1]
      const content = lastMessage?.content || 'No response generated'

      const executionResult: ExecutionResult = {
        content: content as string,
        metadata: result.metadata || {},
        toolCalls: lastMessage?.tool_calls || [],
        executionTime: Date.now() - startTime,
        tokensUsed: this.estimateTokens(finalMessages)
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

    for (const toolCall of toolCalls) {
      try {
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
}
