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

  constructor(config: GraphBuilderConfig) {
    this.modelFactory = config.modelFactory
    this.eventEmitter = config.eventEmitter
    this.executionManager = config.executionManager
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
          // Invalid/stale ToolMessage - convert to SystemMessage
          result.push(new SystemMessage(`[tool:${(msg as any).tool_call_id || 'unknown'}] ${msg.content.toString().slice(0, 400)}`))
        }
      } else {
        result.push(msg)
      }
    }
    
    return result
  }

  /**
   * Build a dual-mode agent graph
   */
  async buildDualModeGraph(config: DualModeGraphConfig): Promise<StateGraph<any>> {
    const graphBuilder = new StateGraph(MessagesAnnotation)
    const { agents, supervisorAgent, enableDirectMode } = config

    console.log('🏗️ Building dual-mode graph with agents:', Array.from(agents.keys()))

    // Add router node for conversation mode detection
    graphBuilder.addNode('router' as any, async (state: any) => {
      console.log('🧭 Router: Analyzing conversation mode...')
      
      const lastMessage = state.messages[state.messages.length - 1]
      const conversationMode = this.detectConversationMode(state, lastMessage)
      
      // Create proper LangChain message with mode metadata
      const updatedMessages = this.preserveConversationMode(state.messages, conversationMode)
      
      console.log(`🎯 Router: Mode detected - ${conversationMode.mode} (target: ${conversationMode.targetAgent})`)
      
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

    console.log('✅ Dual-mode graph built successfully')
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
      
      console.log('🔍 [DEBUG] Agent node starting with executionId:', state.metadata.executionId)

      // Filter out stale ToolMessages that don't follow LangChain's rules
      // ToolMessages must immediately follow AIMessages with tool_calls
      const filteredStateMessages = this.filterStaleToolMessages(state.messages)

      try {
        // Get model for this agent
        const baseModel = await this.modelFactory.getModel(agentConfig.model, {
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens
        })

        // Build and bind tools (if any)
        const toolRuntime = buildToolRuntime(agentConfig.tools)
        const model: any = (typeof (baseModel as any).bindTools === 'function')
          ? (baseModel as any).bindTools(toolRuntime.lcTools)
          : baseModel

  // Prepare messages with agent prompt
        const systemMessage = new SystemMessage(agentConfig.prompt)
        
  let messages: any[] = [systemMessage, ...filteredStateMessages]
  // Execution safety caps - higher for supervisor agents with delegation
  const EXECUTION_START = Date.now()
  const MAX_EXECUTION_MS = agentConfig.role === 'supervisor' ? 180_000 : 45_000 // 3 minutes for supervisors, 45s for others
  const MAX_TOOL_CALLS = agentConfig.role === 'supervisor' ? 15 : 6 // More tool calls for supervisors
  let totalToolCalls = 0

        // Execute model with basic tool loop (max 3 iterations)
        let response
        try {
          response = await model.invoke(messages)
        } catch (error) {
          console.error('🔍 [DEBUG] First model invocation failed:', error)
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
              console.log('⏱️ [SAFEGUARD] Budget hit before executing tool. Forcing finalization.')
              messages = [
                ...messages,
                new HumanMessage({ content: 'Ahora finaliza con un resumen claro y concreto usando lo ya obtenido. Incluye 5 modelos con enlaces. No llames más herramientas.' })
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
                console.log('🔄 [HANDOFF] Delegation detected:', output)
                
                const delegationData = this.parseDelegationResponse(output)
                
                // Create promise to wait for delegation completion
                const delegationPromise = new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error('Delegation timeout after 120 seconds'))
                  }, 120000)
                  
                  const onCompleted = (result: any) => {
                    // Compare using execution context ID instead of agent names for more reliable matching
                    const currentExecutionId = ExecutionManager.getCurrentExecutionId()
                    if (result.sourceExecutionId === currentExecutionId) {
                      console.log('🎯 [DELEGATION] Delegation completed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      resolve(result)
                    } else {
                      console.log('🔍 [DELEGATION] Ignoring completion for different execution:', {
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
                      console.log('❌ [DELEGATION] Delegation failed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      reject(new Error(error.error || 'Delegation failed'))
                    } else {
                      console.log('🔍 [DELEGATION] Ignoring failure for different execution:', {
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
                console.log('🔍 [DEBUG] Emitting delegation.requested with executionId:', currentExecutionId, 'from AsyncLocalStorage:', !!ExecutionManager.getCurrentExecutionId(), 'from state:', !!state.metadata?.executionId)
                this.eventEmitter.emit('delegation.requested', {
                  sourceAgent: agentConfig.id,
                  targetAgent: delegationData.agentId || delegationData.targetAgent,
                  task: delegationData.delegatedTask || delegationData.task,
                  context: delegationData.context,
                  handoffMessage: delegationData.handoffMessage,
                  priority: delegationData.priority || 'normal',
                  sourceExecutionId: currentExecutionId
                })
                
                try {
                  // Wait for delegation to complete
                  console.log('⏳ [DELEGATION] Waiting for delegation to complete...')
                  const delegationResult = await delegationPromise
                  
                  console.log('✅ [DELEGATION] Delegation completed, adding result to conversation')
                  messages = [
                    ...messages,
                    new ToolMessage({ 
                      content: `✅ Task completed by ${delegationData.targetAgent || delegationData.agentId}:\n\n${(delegationResult as any).result}`, 
                      tool_call_id: String(callId) 
                    })
                  ]
                } catch (delegationError) {
                  console.error('❌ [DELEGATION] Delegation failed:', delegationError)
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
            console.log('⏱️ [SAFEGUARD] Budget hit after tools. Forcing finalization.')
            messages = [
              ...messages,
              new HumanMessage({ content: 'Por favor, entrega la respuesta final ahora. Resume los hallazgos con 5 opciones y enlaces. No llames más herramientas.' })
            ]
          }
          // Re-invoke model with tool outputs
          response = await model.invoke(messages)
        }

        this.eventEmitter.emit('node.completed', {
          nodeId: agentConfig.id,
          agentId: agentConfig.id,
          response: response.content
        })

        return {
          messages: [
            ...filteredStateMessages,  // Use filtered messages instead of raw state.messages
            new AIMessage({
              content: response.content,
              additional_kwargs: { 
                sender: agentConfig.id,
                conversation_mode: state.messages[state.messages.length - 1]?.additional_kwargs?.conversation_mode
              }
            })
          ]
        }
      } catch (error) {
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

      console.log(`🚦 ${agentId} routing decision: ${conversationMode === 'direct' ? 'END' : 'finalize'}`)

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
        console.log(`🎯 Router: Direct routing to ${targetAgent}`)
        return targetAgent
      }

      // Requested agent
      const requestedAgent = lastMessage?.additional_kwargs?.requested_agent_id
      if (requestedAgent && agents.has(requestedAgent)) {
        console.log(`🔀 Router: Routing to requested agent ${requestedAgent}`)
        return requestedAgent
      }

      // Default: route to supervisor
      console.log('🔀 Router: Routing to finalize (supervised mode)')
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

        // Build and bind tools (if any)
        const toolRuntime = buildToolRuntime(agentConfig.tools)
        const model: any = (typeof (baseModel as any).bindTools === 'function')
          ? (baseModel as any).bindTools(toolRuntime.lcTools)
          : baseModel

  // Prepare messages with agent prompt
        const systemMessage = new SystemMessage(agentConfig.prompt)
        
  let messages: any[] = [systemMessage, ...filteredStateMessages]
  // Execution safety caps - higher for supervisor agents with delegation
  const EXECUTION_START = Date.now()
  const MAX_EXECUTION_MS = agentConfig.role === 'supervisor' ? 180_000 : 45_000 // 3 minutes for supervisors, 45s for others
  const MAX_TOOL_CALLS = agentConfig.role === 'supervisor' ? 15 : 6 // More tool calls for supervisors
  let totalToolCalls = 0

        // Execute model with basic tool loop (max 3 iterations)
        let response
        try {
          response = await model.invoke(messages)
        } catch (error) {
          console.error('🔍 [DEBUG] BuildGraph - First model invocation failed:', error)
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
          console.log(`🛠️  [Graph] ${agentConfig.id} invoked ${toolCalls.length} tools:`, toolCalls.map((t: any) => t?.name).join(', '))

          for (const call of toolCalls) {
            // Stop if we are running out of budget
            if (Date.now() - EXECUTION_START > MAX_EXECUTION_MS || totalToolCalls >= MAX_TOOL_CALLS) {
              console.log('⏱️ [SAFEGUARD] Budget hit before executing tool. Adding fallback tool response.')
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
              console.log(`➡️  [Tool] ${agentConfig.id} -> ${name}(${JSON.stringify(args).slice(0, 100)}...)`)
              const output = await toolRuntime.run(String(name), args)
              console.log(`⬅️  [Tool] ${name} result:`, output?.toString?.().slice?.(0, 200) ?? String(output).slice(0, 200))
              // Delegation-aware handling: if tool output indicates a handoff, orchestrate delegation
              if (this.isDelegationToolResponse(output)) {
                console.log('� [HANDOFF] Delegation detected in buildGraph:', output)
                const delegationData = this.parseDelegationResponse(output)

                // Create promise to await delegation completion
                const delegationPromise = new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error('Delegation timeout after 120 seconds'))
                  }, 120000)

                  const onCompleted = (result: any) => {
                    // Compare using execution context ID instead of agent names for more reliable matching
                    const currentExecutionId = ExecutionManager.getCurrentExecutionId()
                    if (result.sourceExecutionId === currentExecutionId) {
                      console.log('🎯 [DELEGATION] Delegation completed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      resolve(result)
                    } else {
                      console.log('🔍 [DELEGATION] Ignoring completion for different execution:', {
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
                      console.log('❌ [DELEGATION] Delegation failed for our execution:', currentExecutionId)
                      clearTimeout(timeout)
                      this.eventEmitter.off('delegation.completed', onCompleted)
                      this.eventEmitter.off('delegation.failed', onFailed)
                      reject(new Error(error.error || 'Delegation failed'))
                    } else {
                      console.log('🔍 [DELEGATION] Ignoring failure for different execution:', {
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
                console.log('🔍 [DEBUG] Emitting delegation.requested with executionId:', currentExecutionId, 'from AsyncLocalStorage:', !!ExecutionManager.getCurrentExecutionId(), 'from state:', !!state.metadata?.executionId)
                this.eventEmitter.emit('delegation.requested', {
                  sourceAgent: agentConfig.id,
                  targetAgent: delegationData.agentId || delegationData.targetAgent,
                  task: delegationData.delegatedTask || delegationData.task,
                  context: delegationData.context,
                  handoffMessage: delegationData.handoffMessage,
                  priority: delegationData.priority || 'normal',
                  sourceExecutionId: currentExecutionId
                })

                try {
                  console.log('⏳ [DELEGATION] Waiting for delegated task to complete... executionId:', currentExecutionId)
                  const delegationResult: any = await delegationPromise
                  console.log('✅ [DELEGATION] Completed, injecting result into conversation. ExecutionId:', currentExecutionId)
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
                  console.log('🔄 [DELEGATION] ToolMessage injected, continuing graph execution...')
                } catch (delegationError) {
                  console.error('❌ [DELEGATION] Delegation failed in buildGraph:', delegationError)
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
              console.error(`❌ [Tool] ${name} failed:`, err)
              this.eventEmitter.emit('tool.failed', { agentId: agentConfig.id, name, callId, error: err })
            }
          }

          // Check budgets before re-invocation
          if (Date.now() - EXECUTION_START > MAX_EXECUTION_MS || totalToolCalls >= MAX_TOOL_CALLS) {
            console.log('⏱️ [SAFEGUARD] Budget hit after tools. Forcing finalization.')
            
            // CRITICAL: Ensure all tool_calls are resolved before forcing finalization
            const lastMessage = messages[messages.length - 1]
            if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
              console.log('🔧 [SAFEGUARD] Found unresolved tool_calls, adding fallback ToolMessages')
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
                  console.log(`🔧 [SAFEGUARD] Adding fallback ToolMessage for unresolved tool_call: ${toolCall.id}`)
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
            response = await model.invoke(messages)
          } catch (error) {
            console.error('🔍 [DEBUG] BuildGraph - Model re-invocation failed:', error)
            throw error
          }
        }

        // FINAL SAFEGUARD: Ensure all tool_calls are resolved before finalizing
        const finalMessage = messages[messages.length - 1]
        if (finalMessage && 'tool_calls' in finalMessage && finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
          console.log('🚨 [FINAL SAFEGUARD] Unresolved tool_calls detected at end of loop, resolving them')
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
              console.log(`🚨 [FINAL SAFEGUARD] Adding final fallback ToolMessage for: ${toolCall.id}`)
              messages.push(new ToolMessage({
                content: 'Tool execution completed.',
                tool_call_id: toolCall.id
              }))
            }
          }
          
          // Re-invoke model one last time to get proper response
          try {
            response = await model.invoke(messages)
            console.log('🚨 [FINAL SAFEGUARD] Model re-invoked after resolving tool_calls')
          } catch (error) {
            console.log('🚨 [FINAL SAFEGUARD] Final re-invocation failed, using existing response')
          }
        }

        // Ensure we always have a final response
        if (!response.content || response.content.trim() === '') {
          console.log('🔍 [DEBUG] BuildGraph - Empty response detected, requesting final summary')
          // Add a system message to force a response
          messages.push(new HumanMessage({
            content: "Please provide a summary of the current task status and any results obtained so far."
          }))
          try {
            response = await model.invoke(messages)
            console.log('🔍 [DEBUG] BuildGraph - Final summary response generated')
          } catch (error) {
            console.log('🔍 [DEBUG] BuildGraph - Final summary failed, using fallback')
            response = {
              content: "Task execution completed. Please check the task status for detailed results."
            }
          }
        }

        console.log('🔍 [DEBUG] BuildGraph - Final response content:', response.content)
        console.log('🔍 [DEBUG] BuildGraph - Final response type:', typeof response.content)
        console.log('🔍 [DEBUG] BuildGraph - Final response length:', response.content?.length || 0)

        this.eventEmitter.emit('node.completed', {
          nodeId: 'execute',
          agentId: agentConfig.id,
          response: response.content
        })

        return {
          messages: [
            ...filteredStateMessages,  // Use filtered messages instead of raw state.messages
            new AIMessage({
              content: response.content,
              additional_kwargs: { sender: agentConfig.id }
            })
          ]
        }
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
