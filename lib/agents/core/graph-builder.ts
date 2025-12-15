/**
 * Graph Builder (2025 Refactor)
 *
 * Compact orchestrator for Cleo's dual-mode agent system with modular helpers:
 * - TimeoutManager: centralised budgets (time, tools, cycles)
 * - ToolExecutor: parallel tool execution with timeouts
 * - DelegationHandler: single-flight delegations + progress events
 * - ApprovalHandler: human-in-the-loop wrappers for sensitive tools
 * - MessageProcessor: shared message normalisation utilities
 */

import { StateGraph, MessagesAnnotation, START, END, Annotation } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { AgentConfig, ConversationMode } from '../types'
import { ModelFactory } from './model-factory'
import { EventEmitter } from './event-emitter'
import { ExecutionManager } from './execution-manager'
import { buildToolRuntime } from '@/lib/langchain/tooling'
import { applyToolHeuristics } from './tool-heuristics'
import { getRuntimeConfig, type RuntimeConfig } from '../runtime-config'
import { DelegationHandler } from './delegation-handler'
import { TimeoutManager, type ExecutionBudget } from './timeout-manager'
import { executeToolsInParallel, type ToolCall as ExecutorToolCall, type ToolExecutionResult } from './tool-executor'
import { createToolApprovalNode } from './approval-node'
import { getAgentDisplayName } from '../id-canonicalization' // Import display name helper
import { doesModelSupportDelegation, doesCurrentModelSupportDelegation, getNonDelegationReason } from '@/lib/models/delegation-support'
import { getCurrentModel } from '@/lib/server/request-context'
import {
  filterStaleToolMessages,
  normalizeSystemFirst,
  synthesizeFinalContent,
  convertMessagesToPromptFormat
} from './message-processor'
import logger from '@/lib/utils/logger'
import { withSpan, getTracer } from '@/lib/tracing/otel-setup'
import { SupabaseCheckpointSaver } from './checkpoint-manager'
import { StreamManager, StreamMode } from './stream-modes'

const TOOL_TIMEOUT_MS = 60_000
const SUPERVISOR_TOOL_LOOP_LIMIT = 5
const SPECIALIST_TOOL_LOOP_LIMIT = 3

export interface GraphBuilderConfig {
  modelFactory: ModelFactory
  eventEmitter: EventEmitter
  executionManager: ExecutionManager
  checkpointer?: any // ✅ Shared Supabase checkpointer (optional for backward compat)
  graphCache?: any   // ✅ Shared graph cache (optional for backward compat)
}

export interface DualModeGraphConfig {
  agents: Map<string, AgentConfig>
  supervisorAgent: AgentConfig
  enableDirectMode: boolean
}

// Extended state annotation that includes MessagesAnnotation + custom fields
// This ensures metadata and other fields are properly preserved across graph nodes
const GraphStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  userId: Annotation<string | undefined>,
  metadata: Annotation<Record<string, any> | undefined>({
    reducer: (left, right) => ({ ...left, ...right }), // Merge metadata objects
    default: () => ({})
  })
})

type GraphState = typeof GraphStateAnnotation.State

type BaseToolRuntime = ReturnType<typeof buildToolRuntime>

type ToolRuntimeWithApprovals = Omit<BaseToolRuntime, 'lcTools' | 'run'> & {
  lcTools: BaseToolRuntime['lcTools']
  run: (name: string, args: any) => Promise<string>
}

export class GraphBuilder {
  private modelFactory: ModelFactory
  private eventEmitter: EventEmitter
  private executionManager: ExecutionManager
  private runtime: RuntimeConfig
  private delegationHandler: DelegationHandler
  private checkpointSaver: SupabaseCheckpointSaver | null = null
  private streamManager: StreamManager

  constructor(config: GraphBuilderConfig) {
    this.modelFactory = config.modelFactory
    this.eventEmitter = config.eventEmitter
    this.executionManager = config.executionManager
    this.runtime = getRuntimeConfig()
    this.delegationHandler = new DelegationHandler(this.eventEmitter)
    this.streamManager = new StreamManager(['updates', 'checkpoints', 'tasks'])
    
    // Initialize checkpoint saver asynchronously
    this.initializeCheckpointSaver().catch(err => {
      logger.error('Failed to initialize checkpoint saver:', err)
    })
  }

  private async initializeCheckpointSaver() {
    try {
      // ✅ USE ADMIN CLIENT: Checkpoints are system data, bypass RLS
      // Checkpoints are internal LangGraph state, not user-facing data
      // Using admin client prevents RLS policy violations (error 42501)
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
      const adminClient = getSupabaseAdmin()
      
      if (adminClient) {
        this.checkpointSaver = new SupabaseCheckpointSaver(adminClient)
        logger.debug('✅ Checkpoint saver initialized with admin client (RLS bypassed)')
      } else {
        logger.warn('Supabase admin client not available, checkpoints disabled')
      }
    } catch (error) {
      logger.warn('Checkpoint saver initialization failed, checkpoints disabled:', error)
    }
  }

  /**
   * Save checkpoint after state update (if enabled)
   */
  private async saveCheckpoint(
    prevState: GraphState,
    newState: Partial<GraphState>,
    nodeId: string,
    executionId: string
  ) {
    if (!this.checkpointSaver) return

    try {
      const threadId = prevState.metadata?.threadId || executionId
      const checkpointId = `cp_${Date.now()}`
      const step = (prevState.metadata?.step || 0) + 1

      await this.checkpointSaver.putTuple(
        {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: nodeId,
            checkpoint_id: checkpointId
          }
        },
        {
          v: 1,
          id: checkpointId,
          ts: new Date().toISOString(),
          channel_values: {
            messages: newState.messages || prevState.messages,
            userId: prevState.userId,
            metadata: { ...prevState.metadata, ...newState.metadata }
          },
          channel_versions: {},
          versions_seen: {}
        },
        {
          source: 'loop',
          step,
          writes: newState,
          parents: {}
        }
      )

      // Emit checkpoint event to stream
      this.streamManager.emitCheckpoint({
        thread_id: threadId,
        checkpoint_id: checkpointId,
        node: nodeId,
        step
      }, {
        executionId,
        timestamp: new Date().toISOString()
      })

      logger.debug('💾 Checkpoint saved', { threadId, checkpointId, nodeId, step })
    } catch (error) {
      logger.warn('Failed to save checkpoint:', error)
    }
  }

  async buildDualModeGraph(config: DualModeGraphConfig): Promise<StateGraph<any>> {
    const graph = new StateGraph(GraphStateAnnotation)
    const { agents, supervisorAgent, enableDirectMode } = config

    logger.debug('🏗️ Building dual-mode graph', {
      agents: Array.from(agents.keys()),
      supervisor: supervisorAgent.id,
      enableDirectMode
    })

    graph.addNode('router' as any, async (state: GraphState) => {
      const lastMessage = state.messages[state.messages.length - 1]
      const conversationMode = this.detectConversationMode(lastMessage)
      const updatedMessages = this.preserveConversationMode(state.messages, conversationMode)

      logger.info('🎯 Router decision', conversationMode)
      return { messages: updatedMessages }
    })

    for (const [agentId, agentConfig] of agents.entries()) {
      if (agentId === supervisorAgent.id) continue

      const node = await this.createAgentNode(agentConfig)
      graph.addNode(agentId as any, node)

      if (enableDirectMode) {
        graph.addConditionalEdges(agentId as any, this.createDualModeRouter(agentId), {
          finalize: 'finalize' as any,
          __end__: END
        })
      } else {
        graph.addEdge(agentId as any, 'finalize' as any)
      }
    }

    if (supervisorAgent) {
      graph.addNode('finalize' as any, await this.createAgentNode(supervisorAgent))
      graph.addEdge('finalize' as any, END)
    }

    graph.addConditionalEdges('router' as any, this.createRouterFunction(agents), this.buildRouterConditionalMap(agents, supervisorAgent.id))
    graph.addEdge(START, 'router' as any)

    logger.debug('✅ Dual-mode graph ready')
    return graph
  }

  /**
   * Create a tool execution node
   * 
   * This node extracts tool calls from the last AI message and executes them.
   * It's separate from the agent node to allow the approval node to intercept.
   */
  private async createToolNode(agentConfig: AgentConfig) {
    return async (state: GraphState) => {
      return withSpan(`tools.${agentConfig.id}.execute`, async (span) => {
        const lastMessage = state.messages[state.messages.length - 1]
        
        if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
          logger.warn('🔧 [TOOL-NODE] No tool calls found, this should not happen (conditional edge failed)', { 
            agent: agentConfig.id 
          })
          // Return empty update - don't add any messages
          return {}
        }

        const toolCalls = lastMessage.tool_calls
        span.setAttribute('tool_calls.count', toolCalls.length)
        span.setAttribute('agent.id', agentConfig.id)

        if (state.metadata?.toolsEnabled === false) {
          const reason = 'Tools disabled for selected model'
          logger.info('🚫 [TOOL-NODE] Skipping tool execution (tools disabled)', {
            agent: agentConfig.id,
            model: state.metadata?.model || agentConfig.model
          })

          const blockedMessages = toolCalls.map((call: any) => new ToolMessage({
            tool_call_id: call.id || `blocked_${Date.now()}`,
            content: JSON.stringify({
              status: 'blocked',
              reason,
              message: 'Continuing without calling tools for this model.'
            })
          }))

          return { messages: blockedMessages }
        }

        // Get tool runtime from state metadata (passed from agent node)
        // CRITICAL FIX: Metadata may lose functions during serialization
        // Rebuild toolRuntime if it's missing the .run() method
        let toolRuntime = state.metadata?.toolRuntime
        
        if (!toolRuntime || typeof toolRuntime.run !== 'function') {
          logger.warn('🔧 [TOOL-NODE] toolRuntime missing or invalid, rebuilding from agent config')
          
          // Rebuild tool runtime for this agent
          const selectedTools = agentConfig.tools || []
          toolRuntime = buildToolRuntime(selectedTools, agentConfig.model)
        }

        const timeoutManager = new TimeoutManager(this.getExecutionBudget(agentConfig))

        // Filter delegation vs regular tools
        let delegationCalls = toolCalls.filter((call: any) => this.isDelegationTool(call.name))
        const regularCalls = toolCalls.filter((call: any) => !this.isDelegationTool(call.name))

        const resultMessages: BaseMessage[] = []

        // 🚫 Block delegation for free/uncensored models
        // These models have limited tooling support, so Ankie responds directly
        if (delegationCalls.length > 0 && !doesCurrentModelSupportDelegation()) {
          const currentModel = getCurrentModel() || state.metadata?.model || 'unknown'
          const reason = getNonDelegationReason(currentModel) || 'Model does not support delegation'
          logger.info(`🚫 [DELEGATION BLOCKED] ${reason}`, {
            agentId: agentConfig.id,
            model: currentModel,
            blockedTools: delegationCalls.map((c: any) => c.name)
          })
          
          // Emit event for observability
          this.eventEmitter.emit('delegation.blocked', {
            agentId: agentConfig.id,
            executionId: state.metadata?.executionId,
            model: currentModel,
            reason,
            blockedTools: delegationCalls.map((c: any) => c.name),
            timestamp: new Date().toISOString()
          })
          
          // Convert delegation calls to tool responses indicating they were blocked
          for (const call of delegationCalls) {
            resultMessages.push(new ToolMessage({
              tool_call_id: call.id || `blocked_${Date.now()}`,
              content: JSON.stringify({
                status: 'blocked',
                reason: reason,
                message: 'I\'ll handle this directly for you instead of delegating to a specialist.'
              })
            }))
          }
          
          // Clear delegation calls since we've handled them
          delegationCalls = []
        }

        span.setAttributes({
          'tool_calls.delegation': delegationCalls.length,
          'tool_calls.regular': regularCalls.length
        })

        // Execute regular tools in parallel
        if (regularCalls.length > 0) {
          // Setup tool execution listeners for pipeline visualization
          const toolStartHandler = (data: any) => {
            // Emit tool execution start event for pipeline
            this.eventEmitter.emit('tool.start', {
              agentId: agentConfig.id,
              executionId: state.metadata?.executionId,
              toolName: data.toolName,
              toolCallId: data.callId,
              parameters: data.args,
              timestamp: new Date().toISOString()
            })
          }

          const toolCompleteHandler = (data: any) => {
            // Emit tool execution complete event for pipeline  
            this.eventEmitter.emit('tool.result', {
              agentId: agentConfig.id,
              executionId: state.metadata?.executionId,
              toolName: data.toolName,
              toolCallId: data.callId,
              result: data.result,
              timestamp: new Date().toISOString()
            })
          }

          const toolFailHandler = (data: any) => {
            // Emit tool execution error event for pipeline
            this.eventEmitter.emit('tool.error', {
              agentId: agentConfig.id,
              executionId: state.metadata?.executionId,
              toolName: data.toolName,
              toolCallId: data.callId,
              error: data.error?.message || 'Unknown error',
              timestamp: new Date().toISOString()
            })
          }

          // Register listeners
          this.eventEmitter.on('tool.executing', toolStartHandler)
          this.eventEmitter.on('tool.completed', toolCompleteHandler)
          this.eventEmitter.on('tool.failed', toolFailHandler)

          try {
            const executionResults = await executeToolsInParallel(
              regularCalls,
              toolRuntime,
              {
                agentId: agentConfig.id,
                maxToolCalls: timeoutManager.getStats().budget.maxToolCalls,
                toolTimeoutMs: 60000
              },
              this.eventEmitter as unknown as any
            )

            for (const result of executionResults) {
              timeoutManager.recordToolCall()
              resultMessages.push(result.toolMessage)
            }
          } finally {
            // Cleanup listeners
            this.eventEmitter.off('tool.executing', toolStartHandler)
            this.eventEmitter.off('tool.completed', toolCompleteHandler)
            this.eventEmitter.off('tool.failed', toolFailHandler)
          }
        }

        // Execute delegation tools sequentially
        for (const call of delegationCalls) {
          timeoutManager.recordToolCall()
          const delegationMessage = await this.handleDelegationCall(call, agentConfig, state)
          resultMessages.push(delegationMessage)
        }

        span.setAttribute('results.count', resultMessages.length)

        // Emit node update
        this.streamManager.emitNodeUpdate('tools', {
          toolCalls: toolCalls.map((tc: any) => tc.name),
          resultCount: resultMessages.length
        })

        const newState = { messages: resultMessages }

        // Save checkpoint after tool execution
        await this.saveCheckpoint(state, newState, 'tools', state.metadata?.executionId || 'unknown')

        return newState
      })
    }
  }

  /**
   * Build a simple agent graph with tool approval support AND passthrough for forwarded messages
   * 
   * Pattern follows official LangGraph HITL guidelines + forward_message optimization:
   * agent -> check_approval -> (conditional) tools -> agent (loop)
   *                         -> passthrough (if forward_message used) -> END
   * 
   * The check_approval node uses interrupt() to pause execution when
   * tools requiring approval are detected. User can approve/reject/edit
   * via the resume endpoint.
   * 
   * The passthrough node bypasses synthesis when specialist response should
   * be forwarded directly (LangGraph best practice from benchmarking research).
   */
  async buildGraph(agentConfig: AgentConfig): Promise<StateGraph<any>> {
    const graph = new StateGraph(GraphStateAnnotation)
    
    // Add agent node (LLM with tools)
    graph.addNode('agent' as any, await this.createAgentNode(agentConfig))
    
    // Add approval checkpoint node (CRITICAL for HITL)
    graph.addNode('check_approval' as any, createToolApprovalNode())
    
    // Add tool execution node
    graph.addNode('tools' as any, await this.createToolNode(agentConfig))
    
    // Add passthrough node for forwarded messages (LangGraph best practice)
    graph.addNode('passthrough' as any, this.createPassthroughNode())
    
    // Routing: START -> agent
    graph.addEdge(START, 'agent' as any)
    
    // Routing: agent -> check_approval (always check after LLM response)
    graph.addEdge('agent' as any, 'check_approval' as any)
    
    // Routing: check_approval -> tools (if has tool calls) or passthrough (if forward_message) or END
    graph.addConditionalEdges(
      'check_approval' as any,
      (state: GraphState) => {
        const lastMessage = state.messages[state.messages.length - 1]
        const hasToolCalls = lastMessage && 
          'tool_calls' in lastMessage && 
          Array.isArray((lastMessage as any).tool_calls) &&
          (lastMessage as any).tool_calls.length > 0
        
        // Check if this is a forward_message call
        if (hasToolCalls) {
          const toolCalls = (lastMessage as any).tool_calls || []
          const hasForwardMessage = toolCalls.some((tc: any) => 
            tc?.name === 'forward_message' || tc?.function?.name === 'forward_message'
          )
          
          if (hasForwardMessage) {
            logger.info('📨 [GRAPH] Forward message detected -> passthrough', {
              toolCallsCount: toolCalls.length
            })
            return 'passthrough'
          }
        }
        
        logger.debug('🔀 [GRAPH] Conditional edge decision', {
          hasToolCalls,
          decision: hasToolCalls ? 'tools' : 'end'
        })
        
        return hasToolCalls ? 'tools' : '__end__'
      },
      {
        'tools': 'tools' as any,
        'passthrough': 'passthrough' as any,
        '__end__': END
      }
    )
    
    // Routing: tools -> agent (loop back for next iteration)
    graph.addEdge('tools' as any, 'agent' as any)
    
    // Routing: passthrough -> END (no further processing needed)
    graph.addEdge('passthrough' as any, END)
    
    logger.debug('✅ Agent graph built with approval + passthrough support', {
      agent: agentConfig.id,
      nodes: ['agent', 'check_approval', 'tools', 'passthrough']
    })
    
    return graph
  }

  /**
   * Create passthrough node for forwarded specialist messages
   * 
   * LangGraph Best Practice (from benchmark research):
   * When supervisor uses forward_message tool, extract the specialist's response
   * and return it directly WITHOUT synthesis/rewriting.
   * 
   * This prevents the "telephone game" translation loss that causes 50% performance drop.
   */
  private createPassthroughNode() {
    return async (state: GraphState) => {
      logger.info('📨 [PASSTHROUGH] Processing forwarded message')
      
      const lastMessage = state.messages[state.messages.length - 1]
      const toolCalls = (lastMessage as any)?.tool_calls || []
      
      // Find forward_message tool call
      const forwardCall = toolCalls.find((tc: any) => 
        tc?.name === 'forward_message' || tc?.function?.name === 'forward_message'
      )
      
      if (!forwardCall) {
        logger.warn('⚠️ [PASSTHROUGH] No forward_message call found, returning empty')
        return { messages: [] }
      }
      
      // Extract arguments
      const args = forwardCall.args || (forwardCall.function ? this.safeJsonParse(forwardCall.function.arguments) : {})
      const { message, sourceAgent, confidence } = args
      
      if (!message || typeof message !== 'string') {
        logger.error('❌ [PASSTHROUGH] Invalid message in forward_message call', { args })
        return { messages: [] }
      }
      
      logger.info('✅ [PASSTHROUGH] Forwarding specialist response', {
        sourceAgent,
        confidence,
        messagePreview: message.slice(0, 100)
      })
      
      // Create final AI message with the EXACT specialist response
      // No synthesis, no paraphrasing - direct passthrough
      const finalMessage = new AIMessage({
        content: message,
        additional_kwargs: {
          forwarded: true,
          sourceAgent,
          confidence,
          passthroughNode: true
        }
      })
      
      return { messages: [finalMessage] }
    }
  }

  /**
   * Creates the agent node following LangGraph HITL best practices.
   * 
   * Pattern: agent -> check_approval -> tools -> agent (loop via graph edges)
   * 
   * This node:
   * 1. Invokes the model ONCE with current messages
   * 2. Returns the AI response (may contain tool_calls)
   * 3. Passes toolRuntime in metadata for tools node
   * 4. Graph edges handle iteration, NOT internal loops
   * 
   * The check_approval node (after this) will use interrupt() if tool_calls need approval.
   * The tools node will execute approved tool_calls and return ToolMessages.
   * Graph edges route back to this agent node to continue the conversation.
   */
  private async createAgentNode(agentConfig: AgentConfig) {
    return async (state: GraphState) => {
      return withSpan(`agent.${agentConfig.id}.invoke`, async (span) => {
        const initialMessages = Array.isArray(state.messages) ? state.messages : []
        const filteredMessages = filterStaleToolMessages(initialMessages)
        const executionId = state.metadata?.executionId || ExecutionManager.getCurrentExecutionId()

        span.setAttributes({
          'agent.id': agentConfig.id,
          'agent.role': agentConfig.role || 'unknown',
          'messages.count': filteredMessages.length,
          'execution.id': executionId
        })

        this.eventEmitter.emit('node.entered', {
          nodeId: agentConfig.id,
          agentId: agentConfig.id,
          executionId
        })

        // Emit task start event
        const taskId = `task_${agentConfig.id}_${Date.now()}`
        const taskStartTime = Date.now()
        this.streamManager.emitTaskStart(taskId, `agent_${agentConfig.id}`, {
          messageCount: filteredMessages.length
        })

        try {
          const budget = this.getExecutionBudget(agentConfig)
          const timeoutManager = new TimeoutManager(budget)

          // Prepare model with tools bound
          const { model, toolRuntime, enhancedAgent } = await this.prepareModel(agentConfig, state, filteredMessages)
          agentConfig = enhancedAgent

          // Build message stack with system prompt
          const workingMessages = await this.initialiseMessageStack(agentConfig, filteredMessages, state)
          
          // Invoke model ONCE - no internal loop
          // Normalize multimodal parts for provider-specific schemas (e.g., OpenAI image_url)
          const { normalizeMultimodalForProvider } = await import('./message-processor')
          const providerAdjustedMessages = normalizeMultimodalForProvider(workingMessages, model)
          const response = await this.invokeModel(model, providerAdjustedMessages, timeoutManager, agentConfig)

          // Convert to AIMessage if needed
          const aiMessage = response instanceof AIMessage 
            ? response 
            : new AIMessage(response.content || '', {
                tool_calls: response.tool_calls || [],
                additional_kwargs: response.additional_kwargs || {}
              })

          const toolCalls = (aiMessage as any).tool_calls || []
          span.setAttribute('tool_calls.count', toolCalls.length)
          
          // ✅ Extract usage metadata for token tracking
          const usageMetadata = (aiMessage as any).usage_metadata || (aiMessage as any).response_metadata?.usage || null
          if (usageMetadata) {
            logger.debug('💰 [TOKENS] Captured usage metadata', {
              agent: agentConfig.id,
              input_tokens: usageMetadata.input_tokens,
              output_tokens: usageMetadata.output_tokens,
              total_tokens: usageMetadata.total_tokens
            })
            
            // ✅ Record credit usage (async, non-blocking)
            const threadId = (state.metadata as any)?.threadId || (state as any).threadId
            if (state.userId && threadId) {
              try {
                const { recordCreditUsage } = await import('../../credits/credit-tracker')
                recordCreditUsage({
                  userId: state.userId,
                  executionId,
                  threadId: threadId,
                  agentId: agentConfig.id,
                  modelName: agentConfig.model,
                  inputTokens: usageMetadata.input_tokens || 0,
                  outputTokens: usageMetadata.output_tokens || 0,
                }).catch(err => {
                  logger.warn('⚠️ [CREDITS] Failed to record usage (non-blocking):', err)
                })
              } catch (err) {
                // Don't block execution if credit tracking fails
                logger.warn('⚠️ [CREDITS] Credit tracking module error:', err)
              }
            }
          }

          this.eventEmitter.emit('node.completed', {
            nodeId: agentConfig.id,
            agentId: agentConfig.id,
            executionId,
            response: aiMessage.content
          })

          // Emit task completion
          this.streamManager.emitTaskComplete(taskId, `agent_${agentConfig.id}`, {
            toolCallCount: toolCalls.length,
            responseLength: aiMessage.content.length
          }, Date.now() - taskStartTime)

          // Emit node update for stream
          this.streamManager.emitNodeUpdate(agentConfig.id, {
            messages: [aiMessage],
            toolCalls: toolCalls.length
          })

          // ✅ EXTRACT AND EMIT REASONING for UI transparency
          try {
            const { extractReasoning, createReasoningStep, hasExtractableReasoning } = await import('../reasoning-extractor')
            
            if (hasExtractableReasoning(aiMessage)) {
              const reasoningBlocks = extractReasoning(aiMessage, agentConfig.id)
              
              logger.debug('💭 [REASONING] Extracted blocks', {
                agent: agentConfig.id,
                blockCount: reasoningBlocks.length,
                types: reasoningBlocks.map(b => b.type)
              })
              
              // Emit each reasoning block as a separate event for real-time UI updates
              reasoningBlocks.forEach((block, index) => {
                // ✅ Pass token usage to reasoning step
                const usage = usageMetadata ? {
                  input_tokens: usageMetadata.input_tokens || 0,
                  output_tokens: usageMetadata.output_tokens || 0,
                  total_tokens: usageMetadata.total_tokens || 0
                } : undefined
                
                const step = createReasoningStep(block, agentConfig.id, executionId, usage)
                
                // Emit to event emitter for SSE streaming
                this.eventEmitter.emit('execution.reasoning', {
                  executionId,
                  agentId: agentConfig.id,
                  step,
                  blockIndex: index,
                  totalBlocks: reasoningBlocks.length
                })
                
                logger.debug(`💭 [REASONING] Emitted step ${index + 1}/${reasoningBlocks.length}`, {
                  type: block.type,
                  content: step.content.slice(0, 80),
                  tokens: usage?.total_tokens || 0
                })
              })
            } else {
              logger.debug('💭 [REASONING] No extractable reasoning found', {
                agent: agentConfig.id,
                hasContent: !!aiMessage.content,
                hasToolCalls: toolCalls.length > 0
              })
            }
          } catch (error) {
            logger.error('❌ [REASONING] Extraction failed', {
              agent: agentConfig.id,
              error
            })
          }

          // MessagesAnnotation has a built-in reducer that APPENDS messages
          // So we only need to return the NEW message, not the full history
          const newState = {
            messages: [aiMessage],
            metadata: {
              ...state.metadata,
              toolRuntime, // CRITICAL: Pass toolRuntime to next nodes
              agentId: agentConfig.id,
              executionId,
              // ✅ Add usage metadata for token tracking in UI
              lastUsage: usageMetadata ? {
                input_tokens: usageMetadata.input_tokens || 0,
                output_tokens: usageMetadata.output_tokens || 0,
                total_tokens: usageMetadata.total_tokens || 0
              } : undefined
            }
          }

          // Save checkpoint after state update
          await this.saveCheckpoint(state, newState, agentConfig.id, executionId)

          return newState
        } catch (error) {
          span.recordException(error as Error)
          this.streamManager.emitTaskError(taskId, `agent_${agentConfig.id}`, error as Error)
          throw error
        }
      })
    }
  }

  private async prepareModel(agentConfig: AgentConfig, state: GraphState, filteredMessages: BaseMessage[]) {
    // Allow per-execution overrides (model/prompt/tools) passed via state metadata
    const modelOverride = state.metadata?.modelOverride || state.metadata?.model
    const promptOverride = state.metadata?.promptOverride
    const toolsEnabled = state.metadata?.toolsEnabled !== false

    // 🔍 DEBUG: Log model resolution for delegation blocking
    logger.info('🎯 [MODEL RESOLUTION] prepareModel called', {
      agentId: agentConfig.id,
      agentConfigModel: agentConfig.model,
      stateMetadataModel: state.metadata?.model,
      stateMetadataModelOverride: state.metadata?.modelOverride,
      resolvedModelOverride: modelOverride,
      willUseModel: modelOverride || agentConfig.model
    })

    let enhancedConfig = {
      ...agentConfig,
      ...(modelOverride ? { model: modelOverride } : {}),
      ...(promptOverride ? { prompt: promptOverride } : {}),
    }

    try {
      const { shouldUseDynamicDiscovery, enhanceAgentWithDynamicTools, registerDynamicTools } = await import('./dynamic-agent-enhancement')
      if (shouldUseDynamicDiscovery(agentConfig)) {
        await registerDynamicTools(state.userId)
        enhancedConfig = await enhanceAgentWithDynamicTools(enhancedConfig, state.userId)
        logger.info('🚀 Dynamic tool discovery applied', {
          agent: agentConfig.id,
          toolCount: enhancedConfig.tools.length
        })
      }
    } catch (error) {
      logger.warn('⚠️ Dynamic enhancement failed, continuing with static config', {
        agent: agentConfig.id,
        error
      })
    }

    const baseModel = await this.modelFactory.getModel(enhancedConfig.model, {
      temperature: enhancedConfig.temperature,
      maxTokens: enhancedConfig.maxTokens
    })

    // Check if the current model supports tools based on its configuration
    // Models like Dolphin Mistral (uncensored) don't support tool calling
    // Use the actual model being used (enhancedConfig.model), not the request context
    const modelSupportsTools = doesModelSupportDelegation(enhancedConfig.model)
    
    const selectedTools = toolsEnabled && modelSupportsTools
      ? await applyToolHeuristics({
          agentId: enhancedConfig.id,
          userId: state.userId,
          messages: filteredMessages,
          selectedTools: enhancedConfig.tools || [],
          executionId: state.metadata?.executionId
        })
      : []

    const toolRuntime = buildToolRuntime(selectedTools, enhancedConfig.model)
    
    // Only log tool counts, not full lists (reduce noise)
    const displayName = getAgentDisplayName(enhancedConfig.id)
    if (!modelSupportsTools) {
      logger.info(`🚫 ${displayName}: Tools disabled for this model (free/uncensored category)`)
    } else {
      logger.debug(`🛠️ ${displayName}: ${toolRuntime.lcTools.length} tools bound`)
    }
    
    // CRITICAL: Only bind tools if the model supports them AND we have tools to bind
    // Models in free/uncensored categories should NOT have tools bound
    const shouldBindTools = modelSupportsTools && 
                           toolRuntime.lcTools.length > 0 && 
                           typeof (baseModel as any).bindTools === 'function'
    
    const model = shouldBindTools
      ? (baseModel as any).bindTools(toolRuntime.lcTools, { tool_choice: 'auto' })
      : baseModel

    return { model, toolRuntime, enhancedAgent: enhancedConfig }
  }

  private async initialiseMessageStack(agentConfig: AgentConfig, filteredMessages: BaseMessage[], state: GraphState) {
    const systemMessage = await this.buildSystemMessage(agentConfig, filteredMessages, state)
    const combined = [systemMessage, ...filteredMessages.filter((msg) => msg.constructor.name !== 'SystemMessage')]
    
    return normalizeSystemFirst(combined)
  }

  private async buildSystemMessage(agentConfig: AgentConfig, filteredMessages: BaseMessage[], state: GraphState) {
    const isCleoSupervisor = (agentConfig.id === 'cleo-supervisor' || agentConfig.id === 'cleo')
    const isScheduledTask = state.metadata?.isScheduledTask === true

    const promptBase = state.metadata?.promptOverride || agentConfig.prompt

    if (!isCleoSupervisor || isScheduledTask) {
      return new SystemMessage(promptBase)
    }

    try {
      const { buildFinalSystemPrompt } = await import('@/lib/chat/prompt')
      const { createClient } = await import('@/lib/supabase/server')
      const { withRequestContext } = await import('@/lib/server/request-context')

      const promptMessages = convertMessagesToPromptFormat(filteredMessages)
      const result = await withRequestContext({
        userId: state.userId,
        model: agentConfig.model,
        requestId: state.metadata?.executionId || `exec_${Date.now()}`
      }, async () => {
        return buildFinalSystemPrompt({
          baseSystemPrompt: promptBase,
          model: agentConfig.model,
          messages: promptMessages,
          supabase: await createClient(),
          realUserId: state.userId ?? null,
          threadId: state.metadata?.threadId ?? null, // ✅ CRITICAL: Pass thread for RAG isolation
          enableSearch: true,
          debugRag: false
        })
      })

      const prompt = result?.finalSystemPrompt ?? agentConfig.prompt
      logger.debug('🧠 Dynamic system prompt built for Cleo')
      return new SystemMessage(prompt)
    } catch (error) {
      logger.warn('⚠️ Failed to build dynamic system prompt; using static prompt', error)
      return new SystemMessage(promptBase)
    }
  }

  private async invokeModel(model: any, messages: BaseMessage[], timeoutManager: TimeoutManager, agentConfig: AgentConfig) {
    timeoutManager.recordAgentCycle()
    const budgetStatus = timeoutManager.checkBudget()
    if (budgetStatus.exceeded) {
      throw new Error(`Agent cycle limit reached: ${budgetStatus.reason}`)
    }

    logger.debug('🤖 Invoking model', {
      agentId: agentConfig.id,
      messageCount: messages.length
    })

    try {
      return await model.invoke(messages)
    } catch (error: any) {
      // Defensive fallback for providers that don't accept structured multimodal parts
      const msg = (error && (error.message || String(error))) as string
      const looksLikeContentMappingIssue = /cannot read (properties of )?undefined \(reading 'map'\)/i.test(msg)
      if (looksLikeContentMappingIssue) {
        try {
          logger.warn('⚠️ Provider rejected structured parts; retrying with flattened text content', {
            agent: agentConfig.id,
            reason: msg
          })
          const flattened = messages.map((m: any) => {
            const t = typeof m?._getType === 'function' ? m._getType() : undefined
            const c = m?.content
            const toFlatText = (content: any): string => {
              if (typeof content === 'string') return content
              if (Array.isArray(content)) {
                return content.map((p: any) => {
                  if (p?.type === 'text' && typeof p.text === 'string') return p.text
                  if (p?.type === 'image' && (p.image || p.url)) return `[Imagen: ${p.image || p.url}]`
                  if (p?.type === 'image_url' && p.image_url) return `[Imagen: ${typeof p.image_url === 'string' ? p.image_url : (p.image_url?.url || 'url')}]`
                  return typeof p === 'string' ? p : ''
                }).join('\n\n')
              }
              if (c?.text) return String(c.text)
              return String(content || '')
            }
            const flat = toFlatText(c)
            if (t === 'human') return new HumanMessage(flat)
            if (t === 'ai') return new AIMessage(flat)
            if (t === 'system') return new SystemMessage(flat)
            return m
          })
          return await model.invoke(flattened)
        } catch (retryErr) {
          logger.error('💥 Model invocation failed after fallback', { agent: agentConfig.id, error: retryErr })
          throw retryErr
        }
      }
      logger.error('💥 Model invocation failed', { agent: agentConfig.id, error })
      throw error
    }
  }

  private extractToolCalls(response: any): ExecutorToolCall[] {
    const toolCalls = response?.tool_calls || response?.additional_kwargs?.tool_calls || []
    if (!Array.isArray(toolCalls)) return []
    return toolCalls as ExecutorToolCall[]
  }

  private async handleToolCalls(params: {
    toolCalls: ExecutorToolCall[]
    toolRuntime: ToolRuntimeWithApprovals
    agentConfig: AgentConfig
    state: GraphState
    timeoutManager: TimeoutManager
  }): Promise<BaseMessage[]> {
    const { toolCalls, toolRuntime, agentConfig, state, timeoutManager } = params
    const messages: BaseMessage[] = []

    if (state.metadata?.toolsEnabled === false) {
      const reason = 'Tools disabled for selected model'
      logger.info('🚫 [TOOLS] Skipping tool execution in handler (tools disabled)', {
        agent: agentConfig.id,
        model: state.metadata?.model || agentConfig.model
      })

      for (const call of toolCalls) {
        messages.push(new ToolMessage({
          tool_call_id: call.id || `blocked_${Date.now()}`,
          content: JSON.stringify({
            status: 'blocked',
            reason,
            message: 'Continuing without calling tools for this model.'
          })
        }))
      }
      return messages
    }

    let delegationCalls = toolCalls.filter((call) => this.isDelegationTool(call.name))
    const regularCalls = toolCalls.filter((call) => !this.isDelegationTool(call.name))

    // 🚫 Block delegation for free/uncensored models (same as tool-node)
    if (delegationCalls.length > 0 && !doesCurrentModelSupportDelegation()) {
      const currentModel = getCurrentModel() || state.metadata?.model || 'unknown'
      const reason = getNonDelegationReason(currentModel) || 'Model does not support delegation'
      logger.info(`🚫 [DELEGATION BLOCKED] ${reason}`, {
        agentId: agentConfig.id,
        model: currentModel,
        blockedTools: delegationCalls.map((c) => c.name)
      })
      
      // Convert delegation calls to blocked responses
      for (const call of delegationCalls) {
        messages.push(new ToolMessage({
          tool_call_id: call.id || `blocked_${Date.now()}`,
          content: JSON.stringify({
            status: 'blocked',
            reason: reason,
            message: 'I\'ll handle this directly for you instead of delegating to a specialist.'
          })
        }))
      }
      delegationCalls = []
    }
    if (regularCalls.length > 0) {
      logger.info('⚡ Executing regular tools in parallel', {
        agentId: agentConfig.id,
        count: regularCalls.length
      })

      const executionResults = await executeToolsInParallel(
        regularCalls,
        toolRuntime,
        {
          agentId: agentConfig.id,
          maxToolCalls: timeoutManager.getStats().budget.maxToolCalls,
          toolTimeoutMs: TOOL_TIMEOUT_MS
        },
        this.eventEmitter as unknown as any
      )

      for (let index = 0; index < executionResults.length; index++) {
        const result = executionResults[index]
        timeoutManager.recordToolCall()
        messages.push(result.toolMessage)
        this.emitToolResultEvent(agentConfig.id, regularCalls[index], result)
      }
    }

    for (const call of delegationCalls) {
      timeoutManager.recordToolCall()
      const delegationMessage = await this.handleDelegationCall(call, agentConfig, state)
      messages.push(delegationMessage)
    }

    return messages
  }

  private emitToolResultEvent(agentId: string, call: ExecutorToolCall, result: ToolExecutionResult) {
    const toolName = call?.name || call?.function?.name || 'unknown'
    if (result.success) {
      this.eventEmitter.emit('tool.completed', {
        agentId,
        toolName,
        result: result.toolMessage.content
      })
    } else {
      this.eventEmitter.emit('tool.failed', {
        agentId,
        toolName,
        error: result.error
      })
    }
  }

  private async handleDelegationCall(call: ExecutorToolCall, agentConfig: AgentConfig, state: GraphState): Promise<BaseMessage> {
    const rawArgs = typeof call.args === 'string' ? this.safeJsonParse(call.args) : call.args || {}
    const targetAgentId = this.deriveAgentIdFromToolName(call.name, rawArgs.agentId)
    const task = rawArgs.task || rawArgs.prompt || 'Tarea delegada'

    logger.info('🔄 Delegation requested', {
      sourceAgent: agentConfig.id,
      targetAgent: targetAgentId,
      taskPreview: task.slice(0, 120)
    })

    const result = await this.delegationHandler.delegateToAgent({
      sourceAgent: agentConfig.id,
      targetAgent: targetAgentId,
      task,
      context: rawArgs.context,
      handoffMessage: rawArgs.handoffMessage,
      priority: rawArgs.priority,
      sourceExecutionId: state.metadata?.executionId || ExecutionManager.getCurrentExecutionId(),
      userId: state.userId,
      conversationHistory: state.messages || []
    })

    if (!result.success) {
      const errorMessage = `❌ Delegation to ${targetAgentId} failed: ${result.error?.message || 'unknown error'}`
      logger.error('❌ Delegation failed', { agentId: agentConfig.id, error: result.error })
      return new ToolMessage({
        content: errorMessage,
        tool_call_id: String(call.id || call.tool_call_id || `delegation_${Date.now()}`)
      })
    }

    const continuation = result.continuationHint || 'Usa este resultado para continuar antes de finalizar.'
    const summary = `✅ Delegation result from ${targetAgentId}\n\nTask: ${task}\n\nOutput:\n${typeof result.result === 'string' ? result.result : JSON.stringify(result.result ?? {})}\n\n${continuation}`

    return new ToolMessage({
      content: summary,
      tool_call_id: String(call.id || call.tool_call_id || `delegation_${Date.now()}`)
    })
  }

  private buildFinalAssistantMessage(params: {
    response: any
    workingMessages: BaseMessage[]
    agentConfig: AgentConfig
    filteredMessages: BaseMessage[]
  }): AIMessage {
    const { response, workingMessages, agentConfig, filteredMessages } = params
    const text = this.extractResponseContent(response, workingMessages)

    logger.info('📝 Agent node completed', {
      agentId: agentConfig.id,
      responsePreview: text.slice(0, 200)
    })

    return new AIMessage({
      content: text,
      additional_kwargs: {
        sender: agentConfig.id,
        conversation_mode: filteredMessages[filteredMessages.length - 1]?.additional_kwargs?.conversation_mode
      }
    })
  }

  private extractResponseContent(response: any, workingMessages: BaseMessage[]): string {
    const content = typeof response?.content === 'string' ? response.content : ''
    if (content && content.trim().length > 0) return content.trim()

    const synthesis = synthesizeFinalContent(workingMessages)
    if (synthesis && synthesis.trim().length > 0) return synthesis.trim()

    return 'Task completed successfully.'
  }

  private forceFinalizationMessage(messages: BaseMessage[], reason?: string) {
    const instruction = reason
      ? `Presupuesto agotado (${reason}). Entrega un resumen conciso con los resultados disponibles y próximos pasos.`
      : 'Presupuesto agotado. Entrega un resumen conciso con los resultados disponibles.'

    return normalizeSystemFirst([
      ...messages,
      new HumanMessage({ content: instruction })
    ])
  }

  private detectConversationMode(lastMessage: BaseMessage | undefined): { mode: ConversationMode; targetAgent?: string } {
    const kwargs = (lastMessage as any)?.additional_kwargs || {}

    if (kwargs.conversation_mode) {
      return {
        mode: kwargs.conversation_mode,
        targetAgent: kwargs.target_agent_id
      }
    }

    if (kwargs.requested_agent_id) {
      return {
        mode: 'direct',
        targetAgent: kwargs.requested_agent_id
      }
    }

    return { mode: 'supervised' }
  }

  private preserveConversationMode(messages: BaseMessage[], conversationMode: { mode: ConversationMode; targetAgent?: string }): BaseMessage[] {
    return messages.map((msg, index) => {
      if (index !== messages.length - 1) return msg

      if (msg instanceof HumanMessage || msg instanceof AIMessage) {
        return new (msg.constructor as any)({
          content: msg.content,
          additional_kwargs: {
            ...msg.additional_kwargs,
            conversation_mode: conversationMode.mode,
            target_agent_id: conversationMode.targetAgent
          }
        })
      }

      return msg
    })
  }

  private createDualModeRouter(agentId: string) {
    return async (state: GraphState) => {
      const lastMessage = state.messages[state.messages.length - 1]
      const mode = (lastMessage as any)?.additional_kwargs?.conversation_mode
      logger.debug('🚦 Dual-mode routing', { agentId, mode })
      return mode === 'direct' ? '__end__' : 'finalize'
    }
  }

  private buildRouterConditionalMap(agents: Map<string, AgentConfig>, supervisorId: string): Record<string, any> {
    const map: Record<string, any> = {}
    for (const agentId of agents.keys()) {
      if (agentId !== supervisorId) {
        map[agentId] = agentId as any
      }
    }
    map.finalize = 'finalize' as any
    return map
  }

  private createRouterFunction(agents: Map<string, AgentConfig>) {
    return async (state: GraphState) => {
      const lastMessage = state.messages[state.messages.length - 1]
      const kwargs = (lastMessage as any)?.additional_kwargs || {}

      const directTarget = kwargs.conversation_mode === 'direct' ? kwargs.target_agent_id : undefined
      if (directTarget && agents.has(directTarget)) {
        logger.info('🎯 Router: direct target selected', { directTarget })
        return directTarget
      }

      if (kwargs.requested_agent_id && agents.has(kwargs.requested_agent_id)) {
        logger.info('🎯 Router: requested agent selected', { requested: kwargs.requested_agent_id })
        return kwargs.requested_agent_id
      }

      logger.info('🔀 Router: fallback to supervisor')
      return 'finalize'
    }
  }

  private getExecutionBudget(agentConfig: AgentConfig): ExecutionBudget {
    const maxExecutionMs = agentConfig.role === 'supervisor'
      ? this.runtime.maxExecutionMsSupervisor
      : this.runtime.maxExecutionMsSpecialist

    const maxToolCalls = agentConfig.role === 'supervisor'
      ? this.runtime.maxToolCallsSupervisor
      : this.runtime.maxToolCallsSpecialist

    const maxAgentCycles = agentConfig.role === 'supervisor' ? SUPERVISOR_TOOL_LOOP_LIMIT : SPECIALIST_TOOL_LOOP_LIMIT

    return {
      maxExecutionMs,
      maxToolCalls,
      maxAgentCycles
    }
  }

  private isDelegationTool(name?: string): boolean {
    if (!name) return false
    const toolName = name.toLowerCase()
    return toolName.startsWith('delegate_to_') || toolName.includes('delegation')
  }

  /**
   * Extract agent ID from delegation tool name
   * CRITICAL: Must match format from delegation/tools.ts (line 57): `delegate_to_${agentId}`
   * No longer converts underscores to hyphens - preserves original UUID format
   */
  private deriveAgentIdFromToolName(toolName?: string, explicit?: string): string {
    if (explicit && typeof explicit === 'string') return explicit
    if (!toolName) return 'unknown-agent'
    // Strip 'delegate_to_' prefix.
    // NOTE: Tool names are normalized in the registry (hyphens -> underscores) to satisfy provider constraints.
    // We must restore canonical agent ids for UI + metadata mapping.
    const raw = toolName.replace(/^delegate_to_/i, '').trim()
    if (!raw) return 'unknown-agent'

    // UUIDs are generated as delegate_to_<uuid_with_underscores>
    // Restore uuid hyphens.
    const looksLikeUuidUnderscored = /^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$/i.test(raw)
    if (looksLikeUuidUnderscored) return raw.replace(/_/g, '-')

    // Slugs (e.g. toby-technical) become toby_technical
    return raw.replace(/_/g, '-')
  }

  private safeJsonParse(value: string) {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
}
