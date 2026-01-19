import logger from '@/lib/utils/logger'
/**
 * Simplified Execution Manager for Agent System
 * Handles basic execution coordination
 * 
 * ✅ OPTIMIZED: Uses GraphCache to eliminate re-compilation (-150-300ms)
 * ✅ OPTIMIZED: Uses SupabaseCheckpointSaver for persistence
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
import { Command } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import { InterruptManager } from './interrupt-manager'
import { isHumanInterrupt, type HumanInterrupt, type HumanResponse } from '../types/interrupt'
import { GraphCache } from './graph-cache'

// AsyncLocalStorage for execution context
const executionContext = new AsyncLocalStorage<string>()

export interface ExecutionManagerConfig {
  eventEmitter: EventEmitter
  errorHandler: AgentErrorHandler
  checkpointer: BaseCheckpointSaver // ✅ Shared checkpointer (Supabase)
  graphCache: GraphCache // ✅ Shared graph cache
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
  private checkpointer: BaseCheckpointSaver
  private graphCache: GraphCache

  constructor(config: ExecutionManagerConfig) {
    this.eventEmitter = config.eventEmitter
    this.errorHandler = config.errorHandler
    this.checkpointer = config.checkpointer
    this.graphCache = config.graphCache
    
    logger.info('✅ ExecutionManager initialized', {
      checkpointerType: config.checkpointer.constructor.name,
      hasCacheStats: config.graphCache.getStats() !== undefined
    })
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
          // Ensure primary steps array includes the interrupt for pollers
          try {
            if (!Array.isArray(execution.steps)) (execution as any).steps = []
            ;(execution as any).steps.push(step)
          } catch {}

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

      // IMPORTANT: include metadata so parentExecutionId/rootExecutionId propagate into the graph state
      const computedRootExecutionId: string =
        (context.metadata?.rootExecutionId as string) ||
        (context.metadata?.parentExecutionId as string) ||
        execution.id

      const initialState = {
        messages: filteredMessages,
        executionId: execution.id,
        userId: context.userId,
        metadata: {
          ...(context.metadata || {}),
          executionId: execution.id,
          parentExecutionId: (context.metadata?.parentExecutionId as string) || undefined,
          rootExecutionId: computedRootExecutionId,
          threadId: context.threadId,
          userId: context.userId,
        },
      }

      // ✅ OPTIMIZED: Use cached compiled graph instead of recompiling
      // This eliminates 150-300ms latency per request
      const compiledGraph = this.graphCache.getOrCompile(
        agentConfig.id,
        () => graph
      )
      
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
      
      // Shared state for tracking approval wait (accessible from both timeout and stream)
      const approvalState = { isWaiting: false }
      
      // Use stream() instead of invoke() to detect interrupts
      // Based on official LangGraph patterns from agent-chat-ui
      const graphPromise = withRequestContext(
        { userId: context.userId, model: agentConfig.id, requestId: execution.id }, 
        async () => {
          let result: any = null
          let interruptDetected: HumanInterrupt | null = null

          try {
            // Stream events from graph execution
            // Use both 'values' for state updates AND 'messages' for token streaming
            const stream = await compiledGraph.stream(initialState, {
              ...threadConfig,
              streamMode: ['values', 'messages'] as any // Get state updates + token streaming
            })

            // Track streamed content for incremental emission
            // Track streamed content for incremental emission
            let lastStreamedContent = ''

            // Process stream events
            // IMPORTANT: With streamMode: ['values', 'messages'], events come as tuples [mode, chunk]
            // Per LangChain Dec 2025 docs:
            // - 'messages' mode: ['messages', [token, metadata]] - token is AIMessageChunk with contentBlocks
            // - 'values' mode: ['values', {messages: [...], metadata: {...}}] - full state after each step
            // - 'updates' mode: ['updates', {nodeName: {messages: [...]}}] - only node updates
            for await (const event of stream) {
              // DEBUG: Log raw event structure to diagnose message extraction issues
              if (process.env.DEBUG_STREAM_EVENTS === 'true') {
                console.log('🔍 [STREAM DEBUG] Raw event:', {
                  isArray: Array.isArray(event),
                  length: Array.isArray(event) ? event.length : 'N/A',
                  firstElement: Array.isArray(event) ? event[0] : 'N/A',
                  keys: event && typeof event === 'object' && !Array.isArray(event) ? Object.keys(event) : 'N/A'
                })
              }
              
              // Handle tuple events from multi-mode streaming
              if (Array.isArray(event) && event.length === 2 && typeof event[0] === 'string') {
                const [eventType, eventData] = event
                
                // Token streaming events: ['messages', [token, metadata]]
                // Dec 2025 format: token has .contentBlocks or .content property
                if (eventType === 'messages') {
                  // LangGraph formats vary:
                  // - ['messages', [AIMessageChunk, metadata]]
                  // - ['messages', [messageId, AIMessageChunk]]
                  // - ['messages', AIMessageChunk]
                  const first = Array.isArray(eventData) ? eventData[0] : eventData
                  const second = Array.isArray(eventData) ? eventData[1] : null

                  // Prefer the element that actually looks like a message chunk
                  const candidates = [first, second].filter(
                    (v) => v && typeof v === 'object'
                  ) as any[]
                  const chunk = candidates.find(
                    (c) =>
                      (typeof c?.content === 'string') ||
                      Array.isArray(c?.contentBlocks) ||
                      Array.isArray(c?.content)
                  )

                  if (chunk && typeof chunk === 'object') {
                    // Handle both .content (string) and .contentBlocks (array)
                    let newContent = ''
                    if ('content' in chunk && typeof (chunk as any).content === 'string') {
                      newContent = (chunk as any).content
                    } else if ('content' in chunk && Array.isArray((chunk as any).content)) {
                      // Some LC message chunks carry content as an array of parts
                      newContent = (chunk as any).content
                        .filter((p: any) => p && p.type === 'text')
                        .map((p: any) => p.text || '')
                        .join('')
                    } else if ('contentBlocks' in chunk && Array.isArray(chunk.contentBlocks)) {
                      // Extract text from content blocks
                      newContent = chunk.contentBlocks
                        .filter((b: any) => b.type === 'text')
                        .map((b: any) => b.text || '')
                        .join('')
                    }
                    
                    if (newContent && newContent !== lastStreamedContent) {
                      // Calculate the delta (new content since last emission)
                      const delta = newContent.startsWith(lastStreamedContent) 
                        ? newContent.slice(lastStreamedContent.length)
                        : newContent
                      
                      if (delta) {
                        // Emit streaming token event for SSE
                        this.eventEmitter.emit('execution.streaming', {
                          executionId: execution.id,
                          parentExecutionId: (context.metadata?.parentExecutionId as string) || undefined,
                          rootExecutionId: (initialState as any)?.metadata?.rootExecutionId || computedRootExecutionId,
                          agentId: agentConfig.id,
                          agentName: agentConfig.name,
                          delta,
                          content: newContent,
                          type: 'token'
                        })
                        lastStreamedContent = newContent
                      }
                    }
                  }
                  continue // Don't update result with messages events
                }
                
                // State update events: ['values', stateObject] or ['updates', {nodeName: {...}}]
                if ((eventType === 'values' || eventType === 'updates') && eventData && typeof eventData === 'object') {
                  // For 'values' mode: eventData IS the state object with messages[]
                  // For 'updates' mode: eventData is {nodeName: {messages: [...]}}
                  if (eventType === 'values') {
                    result = eventData
                    if (process.env.DEBUG_STREAM_EVENTS === 'true') {
                      console.log('📦 [STREAM] values event received:', {
                        hasMessages: 'messages' in eventData,
                        messagesCount: (eventData as any).messages?.length || 0
                      })
                    }
                  } else if (eventType === 'updates') {
                    // Merge updates into result
                    const nodeUpdates = Object.values(eventData)[0] as any
                    if (nodeUpdates && nodeUpdates.messages) {
                      result = result || { messages: [] }
                      if (!result.messages) result.messages = []
                      result.messages.push(...nodeUpdates.messages)
                      if (process.env.DEBUG_STREAM_EVENTS === 'true') {
                        console.log('📦 [STREAM] updates event received:', {
                          node: Object.keys(eventData)[0],
                          newMessages: nodeUpdates.messages?.length || 0
                        })
                      }
                    }
                  }
                  continue
                }
              }

              // Check for __interrupt__ event (human-in-the-loop)
              if (event && typeof event === 'object' && '__interrupt__' in event) {
                const rawInterruptPayload = (event as any).__interrupt__
                
                console.log('🛑 [EXECUTION] Interrupt detected:', {
                  executionId: execution.id,
                  payload: rawInterruptPayload
                })

                // Extract payload from LangGraph wrapper: [{ id: string, value: {...} }]
                let interruptPayload = rawInterruptPayload
                if (Array.isArray(interruptPayload) && interruptPayload.length > 0) {
                  const firstItem = interruptPayload[0]
                  if (firstItem && typeof firstItem === 'object' && 'value' in firstItem) {
                    interruptPayload = firstItem.value
                  }
                }

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
                  
                  // Store interrupt state for UI (with Supabase persistence)
                  await InterruptManager.storeInterrupt(
                    execution.id,
                    threadConfig.configurable.thread_id,
                    interruptPayload,
                    context.userId,
                    agentConfig.id
                  )

                  // Create a synthetic step for the interrupt that will be picked up by pollLogic
                  const interruptStep = {
                    id: `interrupt-${execution.id}-${Date.now()}`,
                    timestamp: new Date(), // Use Date object, not ISO string
                    agent: agentConfig.id,
                    action: 'interrupt' as const,
                    content: interruptPayload.description || `Approval required for ${interruptPayload.action_request.action}`,
                    progress: 0,
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

                  // Store interrupt step in active execution for polling detection
                  try {
                    if (!Array.isArray(execution.steps)) (execution as any).steps = []
                    ;(execution as any).steps.push(interruptStep)
                  } catch {}

                  // Also store in legacy snapshot for any consumers still reading snapshot
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
                  
                  // Mark that we're waiting for approval (used by timeout logic)
                  approvalState.isWaiting = true
                  
                  // Wait for user response with fixed 5-minute timeout
                  // CRITICAL: Do NOT use GRAPH_EXECUTION_TIMEOUT here - approval wait time
                  // should NOT count against execution timeout since user may take time to respond
                  console.log('⏳ [EXECUTION] Calling waitForResponse for:', execution.id)
                  const APPROVAL_TIMEOUT_MS = 300000 // Fixed 5 minutes for user to approve
                  const response = await InterruptManager.waitForResponse(
                    execution.id,
                    APPROVAL_TIMEOUT_MS
                  )
                  console.log('✅ [EXECUTION] Received response from waitForResponse:', response?.type || 'null')
                  
                  // Clear approval wait marker
                  approvalState.isWaiting = false

                  if (!response) {
                    console.error('❌ [EXECUTION] No response received, throwing timeout error')
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
                  // CRITICAL: Correct LangGraph syntax - pass Command as first argument, not in config
                  // See: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
                  const resumeCommand = new Command({
                    resume: response
                  })
                  
                  const resumeStream = await compiledGraph.stream(resumeCommand, {
                    ...threadConfig,
                    streamMode: ['values', 'messages'] as any // Get state updates + token streaming
                  })

                  // Continue processing resumed stream with token emission
                  let resumeLastContent = ''
                  for await (const resumeEvent of resumeStream) {
                    // Handle tuple events from multi-mode streaming
                    if (Array.isArray(resumeEvent) && resumeEvent.length === 2 && typeof resumeEvent[0] === 'string') {
                      const [eventType, eventData] = resumeEvent
                      
                      // Token streaming: ['messages', [token, metadata]] or ['messages', chunk]
                      if (eventType === 'messages') {
                        const first = Array.isArray(eventData) ? eventData[0] : eventData
                        const second = Array.isArray(eventData) ? eventData[1] : null
                        const candidates = [first, second].filter(
                          (v) => v && typeof v === 'object'
                        ) as any[]
                        const chunk = candidates.find(
                          (c) =>
                            (typeof c?.content === 'string') ||
                            Array.isArray(c?.contentBlocks) ||
                            Array.isArray(c?.content)
                        )
                        
                        if (chunk && typeof chunk === 'object') {
                          let newContent = ''
                          if ('content' in chunk && typeof (chunk as any).content === 'string') {
                            newContent = (chunk as any).content
                          } else if ('content' in chunk && Array.isArray((chunk as any).content)) {
                            newContent = (chunk as any).content
                              .filter((p: any) => p && p.type === 'text')
                              .map((p: any) => p.text || '')
                              .join('')
                          } else if ('contentBlocks' in chunk && Array.isArray(chunk.contentBlocks)) {
                            newContent = chunk.contentBlocks
                              .filter((b: any) => b.type === 'text')
                              .map((b: any) => b.text || '')
                              .join('')
                          }
                          
                          if (newContent && newContent !== resumeLastContent) {
                            const delta = newContent.startsWith(resumeLastContent) 
                              ? newContent.slice(resumeLastContent.length)
                              : newContent
                            if (delta) {
                              this.eventEmitter.emit('execution.streaming', {
                                executionId: execution.id,
                                parentExecutionId: (context.metadata?.parentExecutionId as string) || undefined,
                                rootExecutionId: (initialState as any)?.metadata?.rootExecutionId || computedRootExecutionId,
                                agentId: agentConfig.id,
                                agentName: agentConfig.name,
                                delta,
                                content: newContent,
                                type: 'token'
                              })
                              resumeLastContent = newContent
                            }
                          }
                        }
                        continue
                      }
                      
                      // State updates - extract state from tuple
                      if ((eventType === 'values' || eventType === 'updates') && eventData && typeof eventData === 'object') {
                        if (eventType === 'values') {
                          result = eventData
                        } else if (eventType === 'updates') {
                          const nodeUpdates = Object.values(eventData)[0] as any
                          if (nodeUpdates && nodeUpdates.messages) {
                            result = result || { messages: [] }
                            if (!result.messages) result.messages = []
                            result.messages.push(...nodeUpdates.messages)
                          }
                        }
                        continue
                      }
                    }
                    
                    // Non-tuple events (shouldn't happen in resume, but handle just in case)
                    if (!Array.isArray(resumeEvent) && resumeEvent && typeof resumeEvent === 'object') {
                      if ('messages' in resumeEvent || result === null) {
                        result = resumeEvent
                      }
                    }
                  }

                  // Clear interrupt after successful resume
                  InterruptManager.clearInterrupt(execution.id)
                } else {
                  console.warn('⚠️ [EXECUTION] Invalid interrupt payload, continuing:', interruptPayload)
                }
              }
              
              // Track latest state for non-tuple events (interrupts, etc.)
              // Note: Tuple events ['values', state] are handled above with continue
              if (!Array.isArray(event) && event && typeof event === 'object' && !('__interrupt__' in event)) {
                // Only update result if it's a state-like object (has messages or is the final state)
                if ('messages' in event || result === null) {
                  result = event
                }
              }
            }

            return result
          } catch (streamError) {
            // CRITICAL FIX: Only clean up interrupt if it's not still waiting for user response
            // If an error happens BEFORE the user responds, we should NOT clear the interrupt
            if (interruptDetected) {
              const currentInterruptState = await InterruptManager.getInterrupt(execution.id)
              if (currentInterruptState && currentInterruptState.status === 'pending') {
                console.warn('⚠️ [EXECUTION] Stream error occurred but interrupt still pending, NOT clearing:', {
                  executionId: execution.id,
                  error: (streamError as Error).message
                })
                // Do NOT clear - user may still want to approve
              } else {
                // Interrupt was already resolved or doesn't exist - safe to clear
                console.log('🧹 [EXECUTION] Clearing interrupt after stream error (already resolved)')
                InterruptManager.clearInterrupt(execution.id)
              }
            }
            throw streamError
          }
        }
      );

      let result;
      if (GRAPH_EXECUTION_TIMEOUT) {
        try {
          // Use a dynamic timeout that DISABLES while waiting for approval
          let timeoutId: NodeJS.Timeout | null = null
          const createDynamicTimeout = () => {
            return new Promise<never>((_, reject) => {
              const checkTimeout = () => {
                // Don't timeout if waiting for user approval
                if (approvalState.isWaiting) {
                  console.log('⏸️ [TIMEOUT] Waiting for approval, timeout paused')
                  timeoutId = setTimeout(checkTimeout, 1000)
                  return
                }
                
                const elapsed = Date.now() - startTime
                
                if (elapsed >= GRAPH_EXECUTION_TIMEOUT) {
                  logger.error(`⏱️ [EXECUTION] Graph execution timeout for ${agentConfig.id} after ${GRAPH_EXECUTION_TIMEOUT}ms`);
                  reject(new Error(`Graph execution timeout after ${GRAPH_EXECUTION_TIMEOUT}ms`));
                } else {
                  // Check again in 1 second
                  timeoutId = setTimeout(checkTimeout, 1000)
                }
              }
              checkTimeout()
            })
          }
          
          result = await Promise.race([
            graphPromise.finally(() => {
              if (timeoutId) clearTimeout(timeoutId)
            }),
            createDynamicTimeout()
          ]);
        } catch (timeoutError) {
          logger.error(`🚨 [EXECUTION] Graph timeout caught for ${agentConfig.id}:`, timeoutError);
          logger.error(`🚨 [EXECUTION] Full error stack:`, (timeoutError as Error).stack);
          logger.error(`🚨 [EXECUTION] Error name: ${(timeoutError as Error).name}, message: ${(timeoutError as Error).message}`);
          throw timeoutError;
        }
      } else {
        result = await graphPromise;
      }

      // Extract final response
      // CRITICAL: Handle different message types properly
      // 1. AIMessage with content (normal response)
      // 2. ToolMessage (tool execution result)
      // 3. AIMessage after tools (agent's interpretation of tool results)
      const finalMessages = result.messages || []
      const lastMessage = finalMessages[finalMessages.length - 1]
      
      // Calculate how many messages were NEW during this execution
      // initialState.messages was the history BEFORE this execution started
      const historyCount = filteredMessages.length
      const newMessagesCount = Math.max(0, finalMessages.length - historyCount)
      
      console.log('📋 [EXECUTION] Extracting final content from messages:', {
        totalMessages: finalMessages.length,
        historyCount,
        newMessagesCount,
        lastMessageType: lastMessage?.constructor?.name || lastMessage?._getType?.() || typeof lastMessage,
        lastMessageHasContent: !!lastMessage?.content,
        lastMessageContent: lastMessage?.content ? String(lastMessage.content).substring(0, 100) : 'EMPTY'
      })
      
      // CRITICAL FIX: Only search for content in NEWLY generated messages
      // This prevents using stale responses from conversation history
      const searchStartIndex = Math.max(0, finalMessages.length - newMessagesCount - 1)
      
      // Try to find the last AIMessage with actual content (only in new messages)
      let content = ''
      for (let i = finalMessages.length - 1; i >= searchStartIndex; i--) {
        const msg = finalMessages[i]
        const msgType = msg?.constructor?.name || msg?._getType?.() || ''
        
        // Check if it's an AI message with content
        if ((msgType === 'AIMessage' || msgType === 'ai') && msg.content) {
          const textContent = typeof msg.content === 'string' ? msg.content : String(msg.content)
          if (textContent.trim()) {
            content = textContent
            console.log(`✅ [EXECUTION] Found AIMessage with content at index ${i} (new message):`, content.substring(0, 100))
            break
          }
        }
      }
      
      // Fallback: If no AIMessage with content in new messages, try extracting from tool results
      if (!content && lastMessage) {
        const msgType = lastMessage?.constructor?.name || lastMessage?._getType?.() || ''
        if (msgType === 'ToolMessage' || msgType === 'tool') {
          try {
            const toolResult = JSON.parse(lastMessage.content as string)
            if (toolResult.success && toolResult.message) {
              content = toolResult.message
            } else if (toolResult.summary) {
              content = toolResult.summary
            }
            console.log('✅ [EXECUTION] Extracted content from ToolMessage:', content)
          } catch {
            // Not JSON, use raw content
            content = lastMessage.content as string || ''
            if (content) {
              console.log('✅ [EXECUTION] Using raw ToolMessage content:', content?.substring(0, 100))
            }
          }
        }
      }
      
      // CRITICAL: If NO new content was generated, provide a contextual fallback
      // instead of using stale content from conversation history
      if (!content) {
        // Check if the model was supposed to delegate but didn't
        const lastUserMessage = finalMessages.filter((m: any) => {
          const type = m?.constructor?.name || m?._getType?.() || ''
          return type === 'HumanMessage' || type === 'human'
        }).pop()
        
        const userQuery = lastUserMessage?.content 
          ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : String(lastUserMessage.content))
          : ''
        
        // Generate a contextually appropriate fallback
        if (userQuery.length > 10) {
          content = `Lo siento, no pude procesar tu solicitud completamente. Por favor, intenta reformular tu pregunta o ser más específico. Tu consulta fue: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"`
          console.log('⚠️ [EXECUTION] No new content generated, using contextual fallback')
        } else {
          content = 'Lo siento, no pude completar la tarea. Por favor, intenta de nuevo con más detalles.'
          console.log('⚠️ [EXECUTION] Using generic fallback content')
        }
      }
      
      // ✅ FIX: Strip <thinking> and <reflection> blocks from final content
      // These are model internal reasoning and should not be shown to users
      if (content) {
        const stripped = content
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
          .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
          .replace(/^\s*<thinking>[\s\S]*$/gi, '') // Unclosed thinking at start
          .trim()
        
        // Only use stripped if it has substantial content
        if (stripped.length > 20) {
          content = stripped
        } else if (content.includes('<thinking>')) {
          // Was only thinking block - use contextual fallback
          console.warn('⚠️ [EXECUTION] Content was only thinking blocks, applying fallback')
          content = 'Lo siento, no pude completar la tarea en modo profundo. Por favor, intenta reformular tu solicitud o usa el modo "Rápido" para respuestas directas.'
        }
      }
      
      console.log('📤 [EXECUTION] Final extracted content:', content.substring(0, 200))

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
