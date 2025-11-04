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
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      if (supabase) {
        this.checkpointSaver = new SupabaseCheckpointSaver(supabase)
        logger.debug('✅ Checkpoint saver initialized')
      } else {
        logger.warn('Supabase not available, checkpoints disabled')
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
        const delegationCalls = toolCalls.filter((call: any) => this.isDelegationTool(call.name))
        const regularCalls = toolCalls.filter((call: any) => !this.isDelegationTool(call.name))

        span.setAttributes({
          'tool_calls.delegation': delegationCalls.length,
          'tool_calls.regular': regularCalls.length
        })

        const resultMessages: BaseMessage[] = []

        // Execute regular tools in parallel
        if (regularCalls.length > 0) {
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
   * Build a simple agent graph with tool approval support
   * 
   * Pattern follows official LangGraph HITL guidelines:
   * agent -> check_approval -> (conditional) tools -> agent (loop)
   * 
   * The check_approval node uses interrupt() to pause execution when
   * tools requiring approval are detected. User can approve/reject/edit
   * via the resume endpoint.
   */
  async buildGraph(agentConfig: AgentConfig): Promise<StateGraph<any>> {
    const graph = new StateGraph(GraphStateAnnotation)
    
    // Add agent node (LLM with tools)
    graph.addNode('agent' as any, await this.createAgentNode(agentConfig))
    
    // Add approval checkpoint node (CRITICAL for HITL)
    graph.addNode('check_approval' as any, createToolApprovalNode())
    
    // Add tool execution node
    graph.addNode('tools' as any, await this.createToolNode(agentConfig))
    
    // Routing: START -> agent
    graph.addEdge(START, 'agent' as any)
    
    // Routing: agent -> check_approval (always check after LLM response)
    graph.addEdge('agent' as any, 'check_approval' as any)
    
    // Routing: check_approval -> tools (if has tool calls) or END (if done)
    graph.addConditionalEdges(
      'check_approval' as any,
      (state: GraphState) => {
        const lastMessage = state.messages[state.messages.length - 1]
        const hasToolCalls = lastMessage && 
          'tool_calls' in lastMessage && 
          Array.isArray((lastMessage as any).tool_calls) &&
          (lastMessage as any).tool_calls.length > 0
        
        logger.debug('🔀 [GRAPH] Conditional edge decision', {
          hasToolCalls,
          decision: hasToolCalls ? 'tools' : 'end'
        })
        
        return hasToolCalls ? 'tools' : '__end__'
      },
      {
        'tools': 'tools' as any,
        '__end__': END
      }
    )
    
    // Routing: tools -> agent (loop back for next iteration)
    graph.addEdge('tools' as any, 'agent' as any)
    
    logger.debug('✅ Agent graph built with approval support', {
      agent: agentConfig.id,
      nodes: ['agent', 'check_approval', 'tools']
    })
    
    return graph
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
                const step = createReasoningStep(block, agentConfig.id, executionId)
                
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
                  content: step.content.slice(0, 80)
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
              executionId
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
    let enhancedConfig = agentConfig

    try {
      const { shouldUseDynamicDiscovery, enhanceAgentWithDynamicTools, registerDynamicTools } = await import('./dynamic-agent-enhancement')
      if (shouldUseDynamicDiscovery(agentConfig)) {
        await registerDynamicTools(state.userId)
        enhancedConfig = await enhanceAgentWithDynamicTools(agentConfig, state.userId)
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

    const selectedTools = await applyToolHeuristics({
      agentId: enhancedConfig.id,
      userId: state.userId,
      messages: filteredMessages,
      selectedTools: enhancedConfig.tools || [],
      executionId: state.metadata?.executionId
    })

    const toolRuntime = buildToolRuntime(selectedTools, enhancedConfig.model)
    
    // Only log tool counts, not full lists (reduce noise)
    const displayName = getAgentDisplayName(enhancedConfig.id)
    logger.debug(`🛠️ ${displayName}: ${toolRuntime.lcTools.length} tools bound`)
    
    // CRITICAL: Force tool usage with tool_choice for models that support it
    // This prevents models from returning XML <function_call> instead of native tool calls
    const model = typeof (baseModel as any).bindTools === 'function'
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

    if (!isCleoSupervisor || isScheduledTask) {
      return new SystemMessage(agentConfig.prompt)
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
          baseSystemPrompt: agentConfig.prompt,
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
      return new SystemMessage(agentConfig.prompt)
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

    const delegationCalls = toolCalls.filter((call) => this.isDelegationTool(call.name))
    const regularCalls = toolCalls.filter((call) => !this.isDelegationTool(call.name))

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

  private deriveAgentIdFromToolName(toolName?: string, explicit?: string): string {
    if (explicit && typeof explicit === 'string') return explicit
    if (!toolName) return 'unknown-agent'
    return toolName.replace(/^delegate_to_/, '').replace(/_/g, '-').trim() || 'unknown-agent'
  }

  private safeJsonParse(value: string) {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
}
