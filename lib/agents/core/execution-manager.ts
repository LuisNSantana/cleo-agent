import logger from '@/lib/utils/logger'
/**
 * Simplified Execution Manager for Agent System
 * Handles basic execution coordination
 */

import { BaseMessage } from '@langchain/core/messages'
import { AgentConfig, AgentExecution, ExecutionResult, ExecutionOptions } from '../types'
import { logToolExecutionStart, logToolExecutionEnd, logToolInterrupt, logToolInterruptResume } from '@/lib/diagnostics/tool-selection-logger'
import { resolveNotionKey } from '@/lib/notion/credentials'
import { EventEmitter } from './event-emitter'
import { AgentErrorHandler } from './error-handler'
import { SystemMessage } from '@langchain/core/messages'
import { AsyncLocalStorage } from 'async_hooks'
import { withRequestContext, getRequestContext } from '@/lib/server/request-context'
import { MemorySaver } from '@langchain/langgraph'
import { InterruptManager } from './interrupt-manager'
import { isHumanInterrupt, type HumanInterrupt, type HumanResponse } from '../types/interrupt'

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
   * Updates the global execution registry with a new interrupt step
   * This allows pollLogic to detect interrupts via snapshot.steps
   */
  private updateExecutionSnapshot(executionId: string, step: any): void {
    try {
      const g = globalThis as any
      const execRegistry = g.__cleoExecRegistry as AgentExecution[] | undefined
      
      if (execRegistry) {
        const execution = execRegistry.find((e: AgentExecution) => e.id === executionId)
        if (execution) {
          if (!execution.snapshot) execution.snapshot = {}
          if (!execution.snapshot.steps) execution.snapshot.steps = []
          execution.snapshot.steps.push(step)
          console.log('✅ [EXECUTION-MANAGER] Updated snapshot with interrupt step:', {
            executionId,
            totalSteps: execution.snapshot.steps.length
          })
        }
      }
    } catch (error) {
      console.error('❌ [EXECUTION-MANAGER] Error updating snapshot:', error)
    }
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

      // Compile graph WITH checkpointer for interrupt() support (human-in-the-loop)
      // MemorySaver enables LangGraph to pause execution during interrupt() calls
      const checkpointer = new MemorySaver()
      const compiledGraph = graph.compile({ checkpointer })
      
      // Thread configuration for checkpointer (required for interrupt/resume)
      const threadConfig = {
        configurable: {
          thread_id: context.threadId || execution.id
        }
      }
      
      // CRITICAL: Use timeout from options if provided, otherwise 300s default  
      // This allows legacy orchestrator to control timeout properly
      const configuredTimeout = options.timeout ?? 300000; // 5 minutes default when undefined
      const hasTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0;
      const GRAPH_EXECUTION_TIMEOUT = hasTimeout ? configuredTimeout : null;

      logger.debug(
        `🚀 [EXECUTION] Starting graph execution for ${agentConfig.id} with timeout ${GRAPH_EXECUTION_TIMEOUT ?? 'disabled'}ms`,
        { 
          isScheduledTask: context.metadata?.isScheduledTask,
          timeoutSource: options.timeout ? 'options' : 'default',
          optionsTimeout: options.timeout,
          threadId: threadConfig.configurable.thread_id
        }
      );
      
      // Use stream() instead of invoke() to detect interrupts
      // Based on official LangGraph patterns from agent-chat-ui
      const graphPromise = withRequestContext(
        { userId: context.userId, model: agentConfig.id, requestId: execution.id }, 
        async () => {
          let result: any = null
          let interruptDetected: HumanInterrupt | null = null

          try {
            // Stream events from graph execution
            const stream = await compiledGraph.stream(initialState, {
              ...threadConfig,
              streamMode: 'values' // Get state updates
            })

            // Process stream events
            for await (const event of stream) {
              // Check for __interrupt__ event (human-in-the-loop)
              if (event && typeof event === 'object' && '__interrupt__' in event) {
                const interruptPayload = (event as any).__interrupt__
                
                console.log('🛑 [EXECUTION] Interrupt detected:', {
                  executionId: execution.id,
                  payload: interruptPayload
                })

                // Validate and store interrupt
                if (isHumanInterrupt(interruptPayload)) {
                  interruptDetected = interruptPayload
                  
                  const interruptStartTime = Date.now()
                  
                  // Log interrupt event
                  logToolInterrupt({
                    event: 'tool_interrupt',
                    agentId: agentConfig.id,
                    userId: context.userId,
                    executionId: execution.id,
                    tool: interruptPayload.action_request.action,
                    action: interruptPayload.action_request.action,
                    interruptType: 'approval_required',
                    config: interruptPayload.config,
                    description: interruptPayload.description,
                    args: interruptPayload.action_request.args
                  })
                  
                  // Store interrupt state for UI
                  await InterruptManager.storeInterrupt(
                    execution.id,
                    threadConfig.configurable.thread_id,
                    interruptPayload
                  )

                  // Create a synthetic step for the interrupt that will be picked up by pollLogic
                  const interruptStep = {
                    id: `interrupt-${execution.id}-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    agent: agentConfig.id,
                    action: 'interrupt',
                    content: interruptPayload.description || `Approval required for ${interruptPayload.action_request.action}`,
                    metadata: {
                      type: 'interrupt',
                      interruptType: 'approval_required',
                      executionId: execution.id,
                      threadId: threadConfig.configurable.thread_id,
                      interrupt: interruptPayload,
                      pipelineStep: true,
                      requiresApproval: true
                    }
                  }

                  // Store interrupt step in execution snapshot for polling detection
                  this.updateExecutionSnapshot(execution.id, interruptStep)

                  // Also emit event for immediate SSE streaming
                  this.eventEmitter.emit('execution.interrupted', {
                    executionId: execution.id,
                    threadId: threadConfig.configurable.thread_id,
                    interrupt: interruptPayload,
                    agentId: agentConfig.id,
                    userId: context.userId,
                    step: interruptStep // Include step for SSE handling
                  })

                  console.log('⏸️ [EXECUTION] Execution paused, waiting for user response...')
                  
                  // Wait for user response (with timeout)
                  const response = await InterruptManager.waitForResponse(
                    execution.id,
                    GRAPH_EXECUTION_TIMEOUT || 300000
                  )

                  if (!response) {
                    throw new Error('Timeout waiting for user approval')
                  }

                  const waitTimeMs = Date.now() - interruptStartTime
                  
                  // Log resume event
                  logToolInterruptResume({
                    event: 'tool_interrupt_resume',
                    agentId: agentConfig.id,
                    userId: context.userId,
                    executionId: execution.id,
                    tool: interruptPayload.action_request.action,
                    action: interruptPayload.action_request.action,
                    responseType: response.type,
                    waitTimeMs
                  })

                  console.log('▶️ [EXECUTION] Resuming execution with user response:', response.type)

                  // Resume execution with Command(resume=...)
                  // Based on LangGraph official pattern
                  const resumeStream = await compiledGraph.stream(null, {
                    ...threadConfig,
                    streamMode: 'values',
                    input: {
                      command: {
                        resume: [response]
                      }
                    }
                  })

                  // Continue processing resumed stream
                  for await (const resumeEvent of resumeStream) {
                    result = resumeEvent
                  }

                  // Clear interrupt after successful resume
                  InterruptManager.clearInterrupt(execution.id)
                } else {
                  console.warn('⚠️ [EXECUTION] Invalid interrupt payload, continuing:', interruptPayload)
                }
              }
              
              // Track latest state
              result = event
            }

            return result
          } catch (streamError) {
            // Clean up interrupt on error
            if (interruptDetected) {
              InterruptManager.clearInterrupt(execution.id)
            }
            throw streamError
          }
        }
      );

      let result;
      if (GRAPH_EXECUTION_TIMEOUT) {
        try {
          result = await Promise.race([
            graphPromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => {
                logger.error(`⏱️ [EXECUTION] Graph execution timeout for ${agentConfig.id} after ${GRAPH_EXECUTION_TIMEOUT}ms`);
                reject(new Error(`Graph execution timeout after ${GRAPH_EXECUTION_TIMEOUT}ms`));
              }, GRAPH_EXECUTION_TIMEOUT)
            ),
          ]);
        } catch (timeoutError) {
          logger.error(`🚨 [EXECUTION] Graph timeout caught for ${agentConfig.id}:`, timeoutError);
          throw timeoutError;
        }
      } else {
        result = await graphPromise;
      }

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
