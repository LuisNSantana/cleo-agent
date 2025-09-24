/**
 * Enhanced Graph Builder for Dual-Mode Agent System
 * Supports both direct and supervised execution modes
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
import { logToolExecutionStart, logToolExecutionEnd } from '@/lib/diagnostics/tool-selection-logger'
import { resolveNotionKey } from '@/lib/notion/credentials'
import logger from '@/lib/utils/logger'

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

/**
 * Enhanced Graph Builder with Dual-Mode Support
 * 
 * Builds LangGraph workflows that support:
 * - Direct mode: User → Agent → Response
 * - Supervised mode: User → Router → Agent → Supervisor → Response
 */
export class GraphBuilder {
  private modelFactory: ModelFactory
  private eventEmitter: EventEmitter
  private executionManager: ExecutionManager
  private runtime: RuntimeConfig

  constructor(config: GraphBuilderConfig) {
    this.modelFactory = config.modelFactory
    this.eventEmitter = config.eventEmitter
    this.executionManager = config.executionManager
  this.runtime = getRuntimeConfig()
  }

  /**
   * Filter out stale ToolMessages that would cause LangChain errors
   * ToolMessages must immediately follow AIMessages with tool_calls
   */
  private filterStaleToolMessages(messages: BaseMessage[]): BaseMessage[] {
    const result: BaseMessage[] = []
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      
    if (msg.constructor.name === 'ToolMessage') {
        // Check if previous message is AIMessage with tool_calls
        const prevMsg = result[result.length - 1]
        if (prevMsg && prevMsg.constructor.name === 'AIMessage' && (prevMsg as any).tool_calls?.length > 0) {
          // Valid ToolMessage - keep it
          result.push(msg)
        } else {
      // Invalid/stale ToolMessage - convert to AIMessage text to preserve order
      // Avoid inserting SystemMessage mid-conversation (Anthropic constraint)
      const text = `[tool:${(msg as any).tool_call_id || 'unknown'}] ${msg.content?.toString?.().slice(0, 400) || ''}`
      result.push(new AIMessage({ content: text }))
        }
      } else {
        result.push(msg)
      }
    }
    
    return result
  }

  /**
   * Ensure only the first SystemMessage remains and is placed at the beginning.
   * Prevents provider errors like "System messages are only permitted as the first passed message."
   */
  private normalizeSystemFirst(messages: BaseMessage[]): BaseMessage[] {
    const system: BaseMessage[] = []
    const rest: BaseMessage[] = []
    for (const m of messages) {
      const t = (m as any)?._getType ? (m as any)._getType() : undefined
      if (t === 'system') {
        if (system.length === 0) system.push(m)
        // skip duplicates
      } else {
        rest.push(m)
      }
    }
    return system.length > 0 ? [system[0], ...rest] : rest
  }

  /**
   * Build a dual-mode agent graph
   */
  async buildDualModeGraph(config: DualModeGraphConfig): Promise<StateGraph<any>> {
    const graphBuilder = new StateGraph(MessagesAnnotation)
    const { agents, supervisorAgent, enableDirectMode } = config

  logger.debug('🏗️ Building dual-mode graph with agents:', Array.from(agents.keys()))

    // Add router node for conversation mode detection
    graphBuilder.addNode('router' as any, async (state: any) => {
  logger.debug('🧭 Router: Analyzing conversation mode...')
      
      const lastMessage = state.messages[state.messages.length - 1]
      const conversationMode = this.detectConversationMode(state, lastMessage)
      
      // Create proper LangChain message with mode metadata
      const updatedMessages = this.preserveConversationMode(state.messages, conversationMode)
      
  logger.info(`🎯 Router: Mode detected - ${conversationMode.mode} (target: ${conversationMode.targetAgent})`)
      
      return { messages: updatedMessages }
    })

    // Add agent nodes
    for (const [agentId, agentConfig] of agents) {
      if (agentId === supervisorAgent.id) continue // Skip supervisor in agent nodes
      
      graphBuilder.addNode(agentId as any, await this.createAgentNode(agentConfig))
      
      // Add conditional edges for dual-mode routing
      if (enableDirectMode) {
        graphBuilder.addConditionalEdges(
          agentId as any,
          this.createDualModeRouter(agentId),
          {
            'finalize': 'finalize' as any,
            '__end__': END
          }
        )
      } else {
        // Standard supervised mode only
        graphBuilder.addEdge(agentId as any, 'finalize' as any)
      }
    }

    // Add finalize node (supervisor)
    if (supervisorAgent) {
      graphBuilder.addNode('finalize' as any, await this.createAgentNode(supervisorAgent))
      graphBuilder.addEdge('finalize' as any, END)
    }

    // Router conditional edges to agents
    const routerConditionalMap = this.buildRouterConditionalMap(agents, supervisorAgent.id)
    graphBuilder.addConditionalEdges('router' as any, this.createRouterFunction(agents), routerConditionalMap)

    // Set entry point
    graphBuilder.addEdge(START, 'router' as any)

  logger.debug('✅ Dual-mode graph built successfully')
    return graphBuilder
  }

  /**
   * Detect conversation mode from state and message
   */
  private detectConversationMode(state: any, lastMessage: any): { mode: ConversationMode, targetAgent?: string } {
    // Check for explicit mode in message metadata
    if (lastMessage?.additional_kwargs?.conversation_mode) {
      return {
        mode: lastMessage.additional_kwargs.conversation_mode,
        targetAgent: lastMessage.additional_kwargs.target_agent_id
      }
    }

    // Check for requested agent (implies direct mode)
    if (lastMessage?.additional_kwargs?.requested_agent_id) {
      return {
        mode: 'direct',
        targetAgent: lastMessage.additional_kwargs.requested_agent_id
      }
    }

    // Default to supervised mode
    return { mode: 'supervised' }
  }

  /**
   * Preserve conversation mode in messages
   */
  private preserveConversationMode(messages: any[], conversationMode: { mode: ConversationMode, targetAgent?: string }): any[] {
    return messages.map((msg: any, index: number) => {
      if (index === messages.length - 1) {
        // Update the last message with conversation mode
        if (msg instanceof HumanMessage) {
          return new HumanMessage({
            content: msg.content,
            additional_kwargs: {
              ...msg.additional_kwargs,
              conversation_mode: conversationMode.mode,
              target_agent_id: conversationMode.targetAgent
            }
          })
        } else if (msg instanceof AIMessage) {
          return new AIMessage({
            content: msg.content,
            additional_kwargs: {
              ...msg.additional_kwargs,
              conversation_mode: conversationMode.mode,
              target_agent_id: conversationMode.targetAgent
            }
          })
        }
      }
      return msg
    })
  }

  /**
   * Create an agent execution node
   */
  private async createAgentNode(agentConfig: AgentConfig) {
    return async (state: any) => {
      this.eventEmitter.emit('node.entered', {
        nodeId: agentConfig.id,
        agentId: agentConfig.id,
        state
      })

      // Ensure executionId is preserved in state metadata
      if (!state.metadata) {
        state.metadata = {}
      }
      if (!state.metadata.executionId) {
        state.metadata.executionId = ExecutionManager.getCurrentExecutionId()
      }
      
  logger.debug('🔍 [DEBUG] Agent node starting with executionId:', state.metadata.executionId)

      // Filter out stale ToolMessages that don't follow LangChain's rules
      // ToolMessages must immediately follow AIMessages with tool_calls
      const filteredStateMessages = this.filterStaleToolMessages(state.messages)

      try {
        // Get model for this agent
        logger.debug('[GraphBuilder] Requesting model from ModelFactory', { agentId: agentConfig.id, model: agentConfig.model })
        const baseModel = await this.modelFactory.getModel(agentConfig.model, {
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens
        })

          // Build and bind tools (if any) with heuristic filtering
          const selectedTools = await applyToolHeuristics({
            agentId: agentConfig.id,
            userId: state.userId,
            messages: state.messages || [],
            selectedTools: agentConfig.tools || [],
            executionId: state.metadata?.executionId
          })
          // Pass model id to runtime to allow provider-specific adjustments (e.g., Gemini name sanitization)
          const toolRuntime = buildToolRuntime(selectedTools, agentConfig.model)
        const model: any = (typeof (baseModel as any).bindTools === 'function')
          ? (baseModel as any).bindTools(toolRuntime.lcTools)
          : baseModel

  // Prepare messages with agent prompt
        // For Cleo supervisor agent, use dynamic prompt building to include routing hints and RAG
        let systemMessage: SystemMessage
        if (agentConfig.id === 'cleo-supervisor' || agentConfig.id === 'cleo') {
          try {
            const { buildFinalSystemPrompt } = await import('@/lib/chat/prompt')
            const { createClient } = await import('@/lib/supabase/server')
            
            // Extract user message for context
            const userMessage = filteredStateMessages.find(m => m.constructor.name === 'HumanMessage')?.content
            
            // Convert BaseMessage to compatible format
            const messagesForPrompt = filteredStateMessages.map(msg => ({
              role: msg.constructor.name === 'HumanMessage' ? 'user' : 
                    msg.constructor.name === 'AIMessage' ? 'assistant' : 
                    msg.constructor.name === 'SystemMessage' ? 'system' : 'assistant',
              content: msg.content
            }))
            
            const promptResult = await buildFinalSystemPrompt({
              baseSystemPrompt: agentConfig.prompt,
              model: agentConfig.model,
              messages: messagesForPrompt,
              supabase: await createClient(),
              realUserId: state.userId,
              enableSearch: true,
              debugRag: false
            })
            
            systemMessage = new SystemMessage(promptResult?.finalSystemPrompt ?? agentConfig.prompt)
            logger.debug('🧠 [Cleo] Using dynamic system prompt with routing hints and RAG')
          } catch (error) {
            logger.warn('⚠️ [Cleo] Failed to build dynamic prompt, falling back to static:', error)
            systemMessage = new SystemMessage(agentConfig.prompt)
          }
        } else {
          systemMessage = new SystemMessage(agentConfig.prompt)
        }
        
  let messages: any[] = [systemMessage, ...filteredStateMessages]
  // Execution safety caps - higher for supervisor agents with delegation
  const EXECUTION_START = Date.now()
  const { getRuntimeConfig } = await import('../runtime-config')
  const runtime = getRuntimeConfig()
  const MAX_EXECUTION_MS = agentConfig.role === 'supervisor' 
    ? runtime.maxExecutionMsSupervisor 
    : runtime.maxExecutionMsSpecialist
  const MAX_TOOL_CALLS = agentConfig.role === 'supervisor' 
    ? runtime.maxToolCallsSupervisor 
    : runtime.maxToolCallsSpecialist
  let totalToolCalls = 0

        // Execute model with basic tool loop (max 3 iterations)
        let response
        try {
          messages = this.normalizeSystemFirst(messages)
          response = await model.invoke(messages)
        } catch (error) {
          logger.error('🔍 [DEBUG] First model invocation failed:', error)
          throw error
        }

        // Handle tool calls if present
  for (let i = 0; i < 3; i++) {
          const toolCalls = (response as any)?.tool_calls || (response as any)?.additional_kwargs?.tool_calls || []
          if (!toolCalls || toolCalls.length === 0) break

          this.eventEmitter.emit('tools.called', {
            agentId: agentConfig.id,
            count: toolCalls.length,
            tools: toolCalls.map((t: any) => t?.name)
          })

          for (const call of toolCalls) {
            // Stop if we are running out of budget
            if (Date.now() - EXECUTION_START > MAX_EXECUTION_MS || totalToolCalls >= MAX_TOOL_CALLS) {
              logger.info('⏱️ [SAFEGUARD] Budget hit before executing tool. Forcing finalization.')
              messages = [
                ...messages,
                new HumanMessage({ content: 'Please finalize with a concise, clear summary using the results gathered so far. Do not call more tools.' })
              ]
              response = await model.invoke(messages)
              break
            }
            const callId = call?.id || call?.tool_call_id || `tool_${Date.now()}`
            const name = call?.name || call?.function?.name
            let args = call?.args || call?.function?.arguments || {}
            
            // Emit tool.executing event before execution
            this.eventEmitter.emit('tool.executing', { 
              agentId: agentConfig.id, 
              toolName: name, 
              callId: callId,
              args: args 
            })
            
            try {
              if (typeof args === 'string') {
                try { args = JSON.parse(args) } catch {}
              }
              const output = await toolRuntime.run(String(name), args)
              
              // Check if this is a delegation tool response that requires handoff
              if (this.isDelegationToolResponse(output)) {
                logger.info('🔄 [HANDOFF] Delegation detected:', output)
                
                const delegationData = this.parseDelegationResponse(output)
                
                // Create promise to wait for delegation completion
                const delegationPromise = new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error(`Delegation timeout after ${runtime.delegationTimeoutMs} ms`))
                  }, runtime.delegationTimeoutMs)
                  
                  const onCompleted = (result: any) => {
                    // Compare using execution context ID instead of agent names for more reliable matching
                    const currentExecutionId = ExecutionManager.getCurrentExecutionId()
                    if (result.sourceExecutionId === currentExecutionId) {
                      logger.info('🎯 [DELEGATION] Delegation completed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      resolve(result)
                    } else {
                      logger.debug('🔍 [DELEGATION] Ignoring completion for different execution:', {
                        resultExecutionId: result.sourceExecutionId,
                        currentExecutionId: currentExecutionId,
                        sourceAgent: result.sourceAgent,
                        targetAgent: result.targetAgent
                      })
                    }
                  }
                  
                  const onFailed = (error: any) => {
                    // Compare using execution context ID instead of agent names
                    const currentExecutionId = ExecutionManager.getCurrentExecutionId()
                    if (error.sourceExecutionId === currentExecutionId) {
                      logger.warn('❌ [DELEGATION] Delegation failed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      reject(new Error(error.error || 'Delegation failed'))
                    } else {
                      logger.debug('🔍 [DELEGATION] Ignoring failure for different execution:', {
                        errorExecutionId: error.sourceExecutionId,
                        currentExecutionId: currentExecutionId
                      })
                    }
                  }
                  
                  this.eventEmitter.on('delegation.completed', onCompleted)
                  this.eventEmitter.on('delegation.failed', onFailed)
                })
                
                // Emit handoff event for external processing
                const currentExecutionId = ExecutionManager.getCurrentExecutionId() || state.metadata?.executionId
                logger.debug('🔍 [DEBUG] Emitting delegation.requested with executionId:', currentExecutionId, 'from AsyncLocalStorage:', !!ExecutionManager.getCurrentExecutionId(), 'from state:', !!state.metadata?.executionId)
                this.eventEmitter.emit('delegation.requested', {
                  sourceAgent: agentConfig.id,
                  targetAgent: delegationData.agentId || delegationData.targetAgent,
                  task: delegationData.delegatedTask || delegationData.task,
                  context: delegationData.context,
                  handoffMessage: delegationData.handoffMessage,
                  priority: delegationData.priority || 'normal',
                  sourceExecutionId: currentExecutionId,
                  userId: state.userId // Include userId for proper context propagation
                })
                
                try {
                  // Wait for delegation to complete
                  logger.debug('⏳ [DELEGATION] Waiting for delegation to complete...')
                  const delegationResult = await delegationPromise
                  
                  logger.info('✅ [DELEGATION] Delegation completed, adding result to conversation')
                  messages = [
                    ...messages,
                    new ToolMessage({ 
                      content: `✅ Task completed by ${delegationData.targetAgent || delegationData.agentId}:\n\n${(delegationResult as any).result}`, 
                      tool_call_id: String(callId) 
                    })
                  ]
                } catch (delegationError) {
                  logger.error('❌ [DELEGATION] Delegation failed:', delegationError)
                  messages = [
                    ...messages,
                    new ToolMessage({ 
                      content: `❌ Delegation to ${delegationData.targetAgent || delegationData.agentId} failed: ${delegationError instanceof Error ? delegationError.message : String(delegationError)}`, 
                      tool_call_id: String(callId) 
                    })
                  ]
                }
              } else {
                messages = [
                  ...messages,
                  new ToolMessage({ content: String(output), tool_call_id: String(callId) })
                ]
              }
              
              totalToolCalls++
              this.eventEmitter.emit('tool.completed', { agentId: agentConfig.id, toolName: name, callId, result: output })
            } catch (err) {
              messages = [
                ...messages,
                new ToolMessage({ content: `Error: ${err instanceof Error ? err.message : String(err)}`, tool_call_id: String(callId) })
              ]
              this.eventEmitter.emit('tool.failed', { agentId: agentConfig.id, name, callId, error: err })
            }
          }

          // Check budgets before re-invocation
          if (Date.now() - EXECUTION_START > MAX_EXECUTION_MS || totalToolCalls >= MAX_TOOL_CALLS) {
            logger.info('⏱️ [SAFEGUARD] Budget hit after tools. Forcing finalization.')
            messages = [
              ...messages,
              new HumanMessage({ content: 'Por favor, entrega la respuesta final ahora. Resume los hallazgos con 5 opciones y enlaces. No llames más herramientas.' })
            ]
          }
          // Re-invoke model with tool outputs
          messages = this.normalizeSystemFirst(messages)
          response = await model.invoke(messages)
        }

  // FINAL SAFEGUARD: Ensure we always produce a user-visible message
        const toText = (v: any) => (typeof v === 'string' ? v : (v?.toString?.() ?? ''))
        let textContent = toText(response?.content ?? '')
        if (!textContent || !String(textContent).trim()) {
          // Try to get a short confirmation by asking the model
          try {
            messages.push(new HumanMessage({ content: 'Provide a concise confirmation of the actions taken (1-3 lines). If you created or updated any items, include the direct link(s). Do not call tools.' }))
            messages = this.normalizeSystemFirst(messages)
            const retry = await model.invoke(messages)
            textContent = toText(retry?.content ?? '')
            response = retry
          } catch {
            // ignore and synthesize from tool output below
          }
        }

        // If still empty, synthesize from last ToolMessage (e.g., Notion URL)
        if (!textContent || !String(textContent).trim()) {
          let url: string | undefined
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i]
            if (m instanceof ToolMessage) {
              const c = toText((m as any).content)
              try {
                const parsed = JSON.parse(c)
                if (parsed?.url && typeof parsed.url === 'string') { url = parsed.url; break }
                // Sometimes nested
                if (parsed?.page?.url) { url = String(parsed.page.url); break }
                if (parsed?.database?.url) { url = String(parsed.database.url); break }
              } catch {
                // not JSON; attempt simple URL regex
                const match = c.match(/https?:\/\/[\w.-]+\.[\w.-]+[^\s)\]}]*/)
                if (match) { url = match[0]; break }
              }
            }
          }
          textContent = url
            ? `Listo. He completado la acción solicitada y aquí tienes el enlace: ${url}`
            : 'Listo. He completado la acción solicitada.'
        }

        // Ensure we always have non-empty final text content
        if (!textContent || !String(textContent).trim()) {
          textContent = 'Task completed successfully.'
        }

        // Emit completion and log the assistant response for observability
        logger.info('[GraphBuilder] Agent node completed', { agentId: agentConfig.id, executionId: state.metadata?.executionId, responseSnippet: String(textContent).slice(0, 500) })
        this.eventEmitter.emit('node.completed', {
          nodeId: agentConfig.id,
          agentId: agentConfig.id,
          response: textContent
        })

        return {
          messages: [
            ...filteredStateMessages,
            new AIMessage({
              content: textContent,
              additional_kwargs: { 
                sender: agentConfig.id,
                conversation_mode: state.messages[state.messages.length - 1]?.additional_kwargs?.conversation_mode
              }
            })
          ]
        }
      } catch (error) {
        logger.error('[GraphBuilder] Agent node error', { agentId: agentConfig.id, error })
        this.eventEmitter.emit('node.error', {
          nodeId: agentConfig.id,
          agentId: agentConfig.id,
          error: error
        })

        // Return error message to keep graph flowing
        return {
          messages: [
            ...filteredStateMessages,  // Use filtered messages even in error case
            new AIMessage({
              content: `Error executing ${agentConfig.name}: ${(error as Error).message}`,
              additional_kwargs: { sender: agentConfig.id, error: true }
            })
          ]
        }
      }
    }
  }

  /**
   * Create dual-mode router for agent nodes
   */
  private createDualModeRouter(agentId: string) {
    return async (state: any) => {
      const lastMessage = state.messages[state.messages.length - 1]
      const conversationMode = lastMessage?.additional_kwargs?.conversation_mode

  logger.debug(`🚦 ${agentId} routing decision: ${conversationMode === 'direct' ? 'END' : 'finalize'}`)

      // Direct mode: bypass supervisor
      if (conversationMode === 'direct') {
        return '__end__'
      }

      // Supervised mode: route to supervisor
      return 'finalize'
    }
  }

  /**
   * Build router conditional mapping
   */
  private buildRouterConditionalMap(agents: Map<string, AgentConfig>, supervisorId: string): Record<string, any> {
    const map: Record<string, any> = {}
    
    for (const agentId of agents.keys()) {
      if (agentId !== supervisorId) {
        map[agentId] = agentId as any
      }
    }
    
    map['finalize'] = 'finalize' as any
  return map
  }

  /**
   * Create router function for agent selection
   */
  private createRouterFunction(agents: Map<string, AgentConfig>) {
    return async (state: any) => {
      const lastMessage = state.messages[state.messages.length - 1]
      const targetAgent = lastMessage?.additional_kwargs?.target_agent_id
      const conversationMode = lastMessage?.additional_kwargs?.conversation_mode

      // Direct mode with specific target
      if (conversationMode === 'direct' && targetAgent && agents.has(targetAgent)) {
  logger.info(`🎯 Router: Direct routing to ${targetAgent}`)
        return targetAgent
        // No model invocation here; just routing
      }

      // Requested agent
      const requestedAgent = lastMessage?.additional_kwargs?.requested_agent_id
      if (requestedAgent && agents.has(requestedAgent)) {
  logger.info(`🔀 Router: Routing to requested agent ${requestedAgent}`)
        return requestedAgent
      }

      // Default: route to supervisor
  logger.info('🔀 Router: Routing to finalize (supervised mode)')
      return 'finalize'
    }
  }

  /**
   * Build a simple agent graph that works with existing system
   */
  async buildGraph(agentConfig: AgentConfig): Promise<StateGraph<any>> {
    const graphBuilder = new StateGraph(MessagesAnnotation)

    // Add main execution node
    graphBuilder.addNode('execute', async (state: any) => {
      this.eventEmitter.emit('node.entered', {
        nodeId: 'execute',
        agentId: agentConfig.id,
        state
      })

      // Filter out stale ToolMessages that don't follow LangChain's rules
      const filteredStateMessages = this.filterStaleToolMessages(state.messages)

      try {
        // Get model for this agent
        const baseModel = await this.modelFactory.getModel(agentConfig.model, {
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens
        })

        // Build and bind tools (if any) with heuristic filtering (legacy path)
        const selectedToolsLegacy = await applyToolHeuristics({
          agentId: agentConfig.id,
          userId: state.userId,
          messages: state.messages || [],
          selectedTools: agentConfig.tools || [],
          executionId: state.metadata?.executionId
        })
  // Pass model id here as well (legacy path)
  const toolRuntime = buildToolRuntime(selectedToolsLegacy, agentConfig.model)
        const model: any = (typeof (baseModel as any).bindTools === 'function')
          ? (baseModel as any).bindTools(toolRuntime.lcTools)
          : baseModel

  // Prepare messages with agent prompt
        // For Cleo supervisor agent, use dynamic prompt building to include routing hints and RAG (legacy path)
        let systemMessage: SystemMessage
        if (agentConfig.id === 'cleo-supervisor' || agentConfig.id === 'cleo') {
          try {
            const { buildFinalSystemPrompt } = await import('@/lib/chat/prompt')
            const { createClient } = await import('@/lib/supabase/server')
            
            // Extract user message for context
            const userMessage = filteredStateMessages.find(m => m.constructor.name === 'HumanMessage')?.content
            
            // Convert BaseMessage to compatible format
            const messagesForPrompt = filteredStateMessages.map(msg => ({
              role: msg.constructor.name === 'HumanMessage' ? 'user' : 
                    msg.constructor.name === 'AIMessage' ? 'assistant' : 
                    msg.constructor.name === 'SystemMessage' ? 'system' : 'assistant',
              content: msg.content
            }))
            
            const promptResult = await buildFinalSystemPrompt({
              baseSystemPrompt: agentConfig.prompt,
              model: agentConfig.model,
              messages: messagesForPrompt,
              supabase: await createClient(),
              realUserId: state.userId,
              enableSearch: true,
              debugRag: false
            })
            
            systemMessage = new SystemMessage(promptResult?.finalSystemPrompt ?? agentConfig.prompt)
            logger.debug('🧠 [Cleo Legacy] Using dynamic system prompt with routing hints and RAG')
          } catch (error) {
            logger.warn('⚠️ [Cleo Legacy] Failed to build dynamic prompt, falling back to static:', error)
            systemMessage = new SystemMessage(agentConfig.prompt)
          }
        } else {
          systemMessage = new SystemMessage(agentConfig.prompt)
        }
        
  let messages: any[] = [systemMessage, ...filteredStateMessages]
  // Execution safety caps - higher for supervisor agents with delegation
  const EXECUTION_START = Date.now()
  const runtimeLocal = this.runtime || getRuntimeConfig()
  const MAX_EXECUTION_MS = agentConfig.role === 'supervisor' 
    ? runtimeLocal.maxExecutionMsSupervisor 
    : runtimeLocal.maxExecutionMsSpecialist
  const MAX_TOOL_CALLS = agentConfig.role === 'supervisor' 
    ? runtimeLocal.maxToolCallsSupervisor 
    : runtimeLocal.maxToolCallsSpecialist
  let totalToolCalls = 0

        // Execute model with basic tool loop (max 3 iterations)
        let response
        try {
          messages = this.normalizeSystemFirst(messages)
          response = await model.invoke(messages)
        } catch (error) {
          logger.error('🔍 [DEBUG] BuildGraph - First model invocation failed:', error)
          throw error
        }

        // Handle tool calls if present
        const toolCallHistory: string[] = []
  for (let i = 0; i < 3; i++) {
          const toolCalls = (response as any)?.tool_calls || (response as any)?.additional_kwargs?.tool_calls || []
          
          if (!toolCalls || toolCalls.length === 0) {
            break
          }

          // Check for repeated tool calls (potential infinite loop)
          const currentToolNames = toolCalls.map((t: any) => t?.name).join(',')
          if (toolCallHistory.includes(currentToolNames) && toolCalls.length === 1) {
            // Force a final response by clearing tool calls and asking for summary
            messages.push(new AIMessage({
              content: "I need to provide a summary of the current task status and results."
            }))
            break
          }
          toolCallHistory.push(currentToolNames)
          
          // Add the AI response with tool calls to messages
          messages.push(response)

          this.eventEmitter.emit('tools.called', {
            agentId: agentConfig.id,
            count: toolCalls.length,
            tools: toolCalls.map((t: any) => t?.name)
          })
          logger.debug(`🛠️  [Graph] ${agentConfig.id} invoked ${toolCalls.length} tools:`, toolCalls.map((t: any) => t?.name).join(', '))

          for (const call of toolCalls) {
            // Stop if we are running out of budget
            if (Date.now() - EXECUTION_START > MAX_EXECUTION_MS || totalToolCalls >= MAX_TOOL_CALLS) {
              logger.info('⏱️ [SAFEGUARD] Budget hit before executing tool. Adding fallback tool response.')
              // Add fallback tool response for this call to maintain LangChain message structure
              const callId = call?.id || call?.tool_call_id || `tool_${Date.now()}`
              messages.push(new ToolMessage({ 
                content: 'Tool execution cancelled due to time/budget limits. Using available results.', 
                tool_call_id: String(callId) 
              }))
              continue // Continue to handle remaining tool calls
            }
            const callId = call?.id || call?.tool_call_id || `tool_${Date.now()}`
            const name = call?.name || call?.function?.name
            let args = call?.args || call?.function?.arguments || {}
            
            // Emit tool.executing event before execution
            this.eventEmitter.emit('tool.executing', { 
              agentId: agentConfig.id, 
              toolName: name, 
              callId: callId,
              args: args 
            })
            
            try {
              if (typeof args === 'string') {
                try { args = JSON.parse(args) } catch {}
              }
              // Structured execution start log
              let notionCredentialPresent: boolean | undefined
              if (name && String(name).toLowerCase().includes('notion')) {
                try {
                  const key = await resolveNotionKey(state.userId)
                  notionCredentialPresent = !!key
                } catch { notionCredentialPresent = false }
              }
              logToolExecutionStart({
                event: 'tool_start',
                agentId: agentConfig.id,
                userId: state.userId,
                executionId: state.metadata?.executionId,
                tool: String(name),
                argsShape: args && typeof args === 'object' ? Object.keys(args) : [],
                notionCredentialPresent
              })
              logger.debug(`➡️  [Tool] ${agentConfig.id} -> ${name}(${JSON.stringify(args).slice(0, 100)}...)`)
              const output = await toolRuntime.run(String(name), args)
              logger.debug(`⬅️  [Tool] ${name} result:`, output?.toString?.().slice?.(0, 200) ?? String(output).slice(0, 200))
              // Structured execution end log (success)
              logToolExecutionEnd({
                event: 'tool_end',
                agentId: agentConfig.id,
                userId: state.userId,
                executionId: state.metadata?.executionId,
                tool: String(name),
                success: true,
                durationMs: 0,
                notionCredentialPresent
              })
              // Delegation-aware handling: if tool output indicates a handoff, orchestrate delegation
              if (this.isDelegationToolResponse(output)) {
                logger.info('� [HANDOFF] Delegation detected in buildGraph:', output)
                const delegationData = this.parseDelegationResponse(output)

                // Create promise to await delegation completion
                const delegationPromise = new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error(`Delegation timeout after ${this.runtime.delegationTimeoutMs / 1000} seconds`))
                  }, this.runtime.delegationTimeoutMs)

                  const onCompleted = (result: any) => {
                    // Compare using execution context ID instead of agent names for more reliable matching
                    const currentExecutionId = ExecutionManager.getCurrentExecutionId()
                    if (result.sourceExecutionId === currentExecutionId) {
                      logger.info('🎯 [DELEGATION] Delegation completed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      resolve(result)
                    } else {
                      logger.debug('🔍 [DELEGATION] Ignoring completion for different execution:', {
                        resultExecutionId: result.sourceExecutionId,
                        currentExecutionId: currentExecutionId,
                        sourceAgent: result.sourceAgent,
                        targetAgent: result.targetAgent
                      })
                    }
                  }

                  const onFailed = (error: any) => {
                    // Compare using execution context ID instead of agent names
                    const currentExecutionId = ExecutionManager.getCurrentExecutionId()
                    if (error.sourceExecutionId === currentExecutionId) {
                      logger.warn('❌ [DELEGATION] Delegation failed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      reject(new Error(error.error || 'Delegation failed'))
                    } else {
                      logger.debug('🔍 [DELEGATION] Ignoring failure for different execution:', {
                        errorExecutionId: error.sourceExecutionId,
                        currentExecutionId: currentExecutionId
                      })
                    }
                  }

                  this.eventEmitter.on('delegation.completed', onCompleted)
                  this.eventEmitter.on('delegation.failed', onFailed)
                })

                // Emit request
                const currentExecutionId = ExecutionManager.getCurrentExecutionId() || state.metadata?.executionId
                logger.debug('🔍 [DEBUG] Emitting delegation.requested with executionId:', currentExecutionId, 'from AsyncLocalStorage:', !!ExecutionManager.getCurrentExecutionId(), 'from state:', !!state.metadata?.executionId)
                this.eventEmitter.emit('delegation.requested', {
                  sourceAgent: agentConfig.id,
                  targetAgent: delegationData.agentId || delegationData.targetAgent,
                  task: delegationData.delegatedTask || delegationData.task,
                  context: delegationData.context,
                  handoffMessage: delegationData.handoffMessage,
                  priority: delegationData.priority || 'normal',
                  sourceExecutionId: currentExecutionId,
                  userId: state.userId // Include userId for proper context propagation
                })

                try {
                  logger.debug('⏳ [DELEGATION] Waiting for delegated task to complete... executionId:', currentExecutionId)
                  const delegationResult: any = await delegationPromise
                  logger.info('✅ [DELEGATION] Completed, injecting result into conversation. ExecutionId:', currentExecutionId)
                  const contentStr = typeof (delegationResult?.result) === 'string' 
                    ? delegationResult.result 
                    : JSON.stringify(delegationResult?.result || {})
                  messages = [
                    ...messages,
                    new ToolMessage({ 
                      content: `✅ Task completed by ${delegationData.targetAgent || delegationData.agentId}:\n\n${contentStr}`, 
                      tool_call_id: String(callId) 
                    })
                  ]
                  logger.debug('🔄 [DELEGATION] ToolMessage injected, continuing graph execution...')
                } catch (delegationError) {
                  logger.error('❌ [DELEGATION] Delegation failed in buildGraph:', delegationError)
                  messages = [
                    ...messages,
                    new ToolMessage({ 
                      content: `❌ Delegation to ${delegationData.targetAgent || delegationData.agentId} failed: ${delegationError instanceof Error ? delegationError.message : String(delegationError)}`, 
                      tool_call_id: String(callId) 
                    })
                  ]
                }
              } else {
                const outputStr = typeof output === 'string' ? output : JSON.stringify(output)
                messages = [
                  ...messages,
                  new ToolMessage({ content: outputStr, tool_call_id: String(callId) })
                ]
              }
              totalToolCalls++
              this.eventEmitter.emit('tool.completed', { agentId: agentConfig.id, toolName: name, callId, result: output })
            } catch (err) {
              messages = [
                ...messages,
                new ToolMessage({ content: `Error: ${err instanceof Error ? err.message : String(err)}`, tool_call_id: String(callId) })
              ]
              logger.error(`❌ [Tool] ${name} failed:`, err)
              // Structured execution end log (failure)
              logToolExecutionEnd({
                event: 'tool_end',
                agentId: agentConfig.id,
                userId: state.userId,
                executionId: state.metadata?.executionId,
                tool: String(name),
                success: false,
                durationMs: 0,
                error: err instanceof Error ? err.message : String(err)
              })
              this.eventEmitter.emit('tool.failed', { agentId: agentConfig.id, name, callId, error: err })
            }
          }

          // Check budgets before re-invocation
          if (Date.now() - EXECUTION_START > MAX_EXECUTION_MS || totalToolCalls >= MAX_TOOL_CALLS) {
            logger.info('⏱️ [SAFEGUARD] Budget hit after tools. Forcing finalization.')
            
            // CRITICAL: Ensure all tool_calls are resolved before forcing finalization
            const lastMessage = messages[messages.length - 1]
            if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
              logger.debug('🔧 [SAFEGUARD] Found unresolved tool_calls, adding fallback ToolMessages')
              const existingToolCallIds = new Set()
              
              // Collect all existing tool_call_ids from ToolMessages
              for (const msg of messages) {
                if (msg instanceof ToolMessage && msg.tool_call_id) {
                  existingToolCallIds.add(msg.tool_call_id)
                }
              }
              
              // Add fallback ToolMessages for any unresolved tool_calls
              for (const toolCall of lastMessage.tool_calls) {
                if (!existingToolCallIds.has(toolCall.id)) {
                  logger.debug(`🔧 [SAFEGUARD] Adding fallback ToolMessage for unresolved tool_call: ${toolCall.id}`)
                  messages.push(new ToolMessage({
                    content: 'Budget exceeded. Task completed with available resources.',
                    tool_call_id: toolCall.id
                  }))
                }
              }
            }
            
            messages.push(new HumanMessage({ content: 'Ahora entrega la respuesta final. Resume claramente y enlaza a las fuentes. Evita más herramientas.' }))
          }
          // Re-invoke model with tool outputs
          try {
            messages = this.normalizeSystemFirst(messages)
            response = await model.invoke(messages)
          } catch (error) {
            logger.error('🔍 [DEBUG] BuildGraph - Model re-invocation failed:', error)
            throw error
          }
        }

        // FINAL SAFEGUARD: Ensure all tool_calls are resolved before finalizing
        const finalMessage = messages[messages.length - 1]
        if (finalMessage && 'tool_calls' in finalMessage && finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
          logger.info('🚨 [FINAL SAFEGUARD] Unresolved tool_calls detected at end of loop, resolving them')
          const existingToolCallIds = new Set()
          
          // Collect all existing tool_call_ids from ToolMessages
          for (const msg of messages) {
            if (msg instanceof ToolMessage && msg.tool_call_id) {
              existingToolCallIds.add(msg.tool_call_id)
            }
          }
          
          // Add fallback ToolMessages for any unresolved tool_calls
          for (const toolCall of finalMessage.tool_calls) {
            if (!existingToolCallIds.has(toolCall.id)) {
              logger.debug(`🚨 [FINAL SAFEGUARD] Adding final fallback ToolMessage for: ${toolCall.id}`)
              messages.push(new ToolMessage({
                content: 'Tool execution completed.',
                tool_call_id: toolCall.id
              }))
            }
          }
          
          // Re-invoke model one last time to get proper response
          try {
            messages = this.normalizeSystemFirst(messages)
            response = await model.invoke(messages)
            logger.debug('🚨 [FINAL SAFEGUARD] Model re-invoked after resolving tool_calls')
          } catch (error) {
            logger.warn('🚨 [FINAL SAFEGUARD] Final re-invocation failed, using existing response')
          }
        }

        // Ensure we always have a final response
        if (!response.content || String(response.content || '').trim() === '') {
          logger.debug('🔍 [DEBUG] BuildGraph - Empty response detected, requesting final summary')
          // Add a system message to force a response
          messages.push(new HumanMessage({
            content: "Please provide a summary of the current task status and any results obtained so far."
          }))
          try {
            messages = this.normalizeSystemFirst(messages)
            response = await model.invoke(messages)
            logger.debug('🔍 [DEBUG] BuildGraph - Final summary response generated')
          } catch (error) {
            logger.warn('🔍 [DEBUG] BuildGraph - Final summary failed, using fallback')
            response = {
              content: "Task execution completed. Please check the task status for detailed results."
            }
          }
        }

  logger.debug('🔍 [DEBUG] BuildGraph - Final response content:', response.content)
  logger.debug('🔍 [DEBUG] BuildGraph - Final response type:', typeof response.content)
  logger.debug('🔍 [DEBUG] BuildGraph - Final response length:', response.content?.length || 0)

  // Log final response for observability (legacy buildGraph path)
  logger.info('[GraphBuilder] buildGraph final response', { agentId: agentConfig.id, responseSnippet: String(response.content).slice(0, 500) })
        // Ensure we have non-empty content before returning
        const finalContent = response?.content && String(response.content).trim() 
          ? String(response.content).trim()
          : 'Task completed successfully.'

        console.log('🔴 [GRAPH CRITICAL] Final content being returned:', {
          agentId: agentConfig.id,
          originalContent: response?.content,
          finalContent,
          willReturnMessage: true
        })

        this.eventEmitter.emit('node.completed', {
          nodeId: 'execute',
          agentId: agentConfig.id,
          response: finalContent
        })

        const finalReturn = {
          messages: [
            ...filteredStateMessages,  // Use filtered messages instead of raw state.messages
            new AIMessage({
              content: finalContent,
              additional_kwargs: { sender: agentConfig.id }
            })
          ]
        }
        
        console.log('🔴 [GRAPH CRITICAL] Returning state with messages:', {
          agentId: agentConfig.id,
          messageCount: finalReturn.messages.length,
          lastMessageContent: finalReturn.messages[finalReturn.messages.length - 1]?.content
        })
        
        return finalReturn
      } catch (error) {
        this.eventEmitter.emit('node.error', {
          nodeId: 'execute',
          agentId: agentConfig.id,
          error: error
        })

        // Return error message to keep graph flowing
        return {
          messages: [
            ...filteredStateMessages,  // Use filtered messages even in error case
            new AIMessage({
              content: `Error executing ${agentConfig.name}: ${(error as Error).message}`,
              additional_kwargs: { sender: agentConfig.id, error: true }
            })
          ]
        }
      }
    })

    // Set entry and exit points
    graphBuilder.addEdge(START, 'execute' as any)
    graphBuilder.addEdge('execute' as any, END)

    return graphBuilder
  }

  /**
   * Check if a tool response indicates a delegation request
   */
  private isDelegationToolResponse(output: any): boolean {
    try {
      // Handle string responses that might be JSON
      if (typeof output === 'string') {
        try {
          const parsed = JSON.parse(output)
          return parsed?.nextAction === 'handoff_to_agent' || parsed?.status === 'delegated'
        } catch {
          return false
        }
      }
      
      // Handle object responses directly
      return output?.nextAction === 'handoff_to_agent' || output?.status === 'delegated'
    } catch {
      return false
    }
  }

  /**
   * Parse delegation tool response safely
   */
  private parseDelegationResponse(output: any): any {
    try {
      if (typeof output === 'string') {
        return JSON.parse(output)
      }
      return output
    } catch {
      return {}
    }
  }
}
