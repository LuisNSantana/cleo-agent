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

import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph'
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
import { applyApprovalWrappers } from './approval-handler'
import { TOOL_APPROVAL_CONFIG } from '@/lib/tools/tool-config'
import {
  filterStaleToolMessages,
  normalizeSystemFirst,
  synthesizeFinalContent,
  convertMessagesToPromptFormat
} from './message-processor'
import logger from '@/lib/utils/logger'

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

type GraphState = {
  messages: BaseMessage[]
  userId?: string
  metadata?: Record<string, any>
}

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

  constructor(config: GraphBuilderConfig) {
    this.modelFactory = config.modelFactory
    this.eventEmitter = config.eventEmitter
    this.executionManager = config.executionManager
    this.runtime = getRuntimeConfig()
    this.delegationHandler = new DelegationHandler(this.eventEmitter)
  }

  async buildDualModeGraph(config: DualModeGraphConfig): Promise<StateGraph<any>> {
    const graph = new StateGraph(MessagesAnnotation)
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

  async buildGraph(agentConfig: AgentConfig): Promise<StateGraph<any>> {
    const graph = new StateGraph(MessagesAnnotation)
    graph.addNode('execute' as any, await this.createAgentNode(agentConfig))
    graph.addEdge(START, 'execute' as any)
    graph.addEdge('execute' as any, END)
    return graph
  }

  private async createAgentNode(agentConfig: AgentConfig) {
    return async (state: GraphState) => {
      const initialMessages = Array.isArray(state.messages) ? state.messages : []
      const filteredMessages = filterStaleToolMessages(initialMessages)
      const executionId = state.metadata?.executionId || ExecutionManager.getCurrentExecutionId()

      this.eventEmitter.emit('node.entered', {
        nodeId: agentConfig.id,
        agentId: agentConfig.id,
        executionId
      })

      const budget = this.getExecutionBudget(agentConfig)
      const timeoutManager = new TimeoutManager(budget)

      const { model, toolRuntime, enhancedAgent } = await this.prepareModel(agentConfig, state, filteredMessages)
      agentConfig = enhancedAgent

      let workingMessages = await this.initialiseMessageStack(agentConfig, filteredMessages, state)
      let response = await this.invokeModel(model, workingMessages, timeoutManager, agentConfig)

      const toolLoopLimit = agentConfig.role === 'supervisor' ? SUPERVISOR_TOOL_LOOP_LIMIT : SPECIALIST_TOOL_LOOP_LIMIT

      for (let cycle = 0; cycle < toolLoopLimit; cycle++) {
        const toolCalls = this.extractToolCalls(response)
        if (toolCalls.length === 0) break

        const budgetStatus = timeoutManager.checkBudget()
        if (budgetStatus.exceeded) {
          logger.warn('⏱️ Budget exceeded before tool execution', {
            agentId: agentConfig.id,
            reason: budgetStatus.reason
          })
          workingMessages = this.forceFinalizationMessage(workingMessages, budgetStatus.reason)
          break
        }

        const toolMessages = await this.handleToolCalls({
          toolCalls,
          toolRuntime,
          agentConfig,
          state,
          timeoutManager
        })

        workingMessages = normalizeSystemFirst([...workingMessages, ...toolMessages])
        response = await this.invokeModel(model, workingMessages, timeoutManager, agentConfig)
      }

      const finalMessage = this.buildFinalAssistantMessage({
        response,
        workingMessages,
        agentConfig,
        filteredMessages
      })

      this.eventEmitter.emit('node.completed', {
        nodeId: agentConfig.id,
        agentId: agentConfig.id,
        executionId,
        response: finalMessage.content
      })

      return {
        messages: [...filteredMessages, finalMessage]
      }
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

  const rawRuntime = buildToolRuntime(selectedTools, enhancedConfig.model)
  const approvedTools = applyApprovalWrappers(rawRuntime.lcTools, TOOL_APPROVAL_CONFIG) as unknown as typeof rawRuntime.lcTools
    const runtimeWithApprovals: ToolRuntimeWithApprovals = {
      ...rawRuntime,
      lcTools: approvedTools,
      run: async (name: string, args: any) => {
        const tool = approvedTools.find((t) => t.name === name)
        if (!tool) {
          return rawRuntime.run(name, args)
        }
        const result = await tool.invoke(args ?? {})
        if (typeof result === 'string') return result
        try {
          return JSON.stringify(result)
        } catch {
          return String(result)
        }
      }
    }

    const model = typeof (baseModel as any).bindTools === 'function'
      ? (baseModel as any).bindTools(runtimeWithApprovals.lcTools)
      : baseModel

    return { model, toolRuntime: runtimeWithApprovals, enhancedAgent: enhancedConfig }
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
    } catch (error) {
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
