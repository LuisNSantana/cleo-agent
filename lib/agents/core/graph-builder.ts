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
    
    console.log('🔍 [DEBUG] Filtering messages. Input count:', messages.length)
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      
      if (msg.constructor.name === 'ToolMessage') {
        // Check if previous message is AIMessage with tool_calls
        const prevMsg = result[result.length - 1]
        if (prevMsg && prevMsg.constructor.name === 'AIMessage' && (prevMsg as any).tool_calls?.length > 0) {
          // Valid ToolMessage - keep it
          console.log('🔍 [DEBUG] Keeping valid ToolMessage at index', i)
          result.push(msg)
        } else {
          // Invalid/stale ToolMessage - convert to SystemMessage
          console.log('🔍 [DEBUG] Converting stale ToolMessage to SystemMessage at index', i)
          result.push(new SystemMessage(`[tool:${(msg as any).tool_call_id || 'unknown'}] ${msg.content.toString().slice(0, 400)}`))
        }
      } else {
        result.push(msg)
      }
    }
    
    console.log('🔍 [DEBUG] Filtering complete. Output count:', result.length)
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

        // DEBUG: Log the messages being sent to LangChain
        console.log('🔍 [DEBUG] Messages being sent to LangChain:', messages.map((m, i) => ({
          index: i,
          type: m.constructor.name,
          role: m.role || 'unknown',
          hasToolCalls: !!(m.tool_calls && m.tool_calls.length > 0),
          contentPreview: m.content.toString().slice(0, 100)
        })))

        // Execute model with basic tool loop (max 3 iterations)
        console.log('🔍 [DEBUG] About to invoke model for the first time')
        let response
        try {
          response = await model.invoke(messages)
          console.log('🔍 [DEBUG] First model invocation successful')
        } catch (error) {
          console.log('🔍 [DEBUG] First model invocation failed:', error)
          throw error
        }

        // Handle tool calls if present
        for (let i = 0; i < 3; i++) {
          const toolCalls = (response as any)?.tool_calls || (response as any)?.additional_kwargs?.tool_calls || []
          if (!toolCalls || toolCalls.length === 0) break

          console.log('🔍 [DEBUG] Processing tool calls iteration', i, 'with', toolCalls.length, 'tools')

          this.eventEmitter.emit('tools.called', {
            agentId: agentConfig.id,
            count: toolCalls.length,
            tools: toolCalls.map((t: any) => t?.name)
          })

          for (const call of toolCalls) {
            const callId = call?.id || call?.tool_call_id || `tool_${Date.now()}`
            const name = call?.name || call?.function?.name
            let args = call?.args || call?.function?.arguments || {}
            try {
              if (typeof args === 'string') {
                try { args = JSON.parse(args) } catch {}
              }
              const output = await toolRuntime.run(String(name), args)
              console.log('🔍 [DEBUG] Before adding ToolMessage. Current messages count:', messages.length)
              messages = [
                ...messages,
                new ToolMessage({ content: String(output), tool_call_id: String(callId) })
              ]
              console.log('🔍 [DEBUG] After adding ToolMessage. New messages count:', messages.length)
              this.eventEmitter.emit('tool.completed', { agentId: agentConfig.id, name, callId })
            } catch (err) {
              console.log('🔍 [DEBUG] Before adding ToolMessage (error). Current messages count:', messages.length)
              messages = [
                ...messages,
                new ToolMessage({ content: `Error: ${err instanceof Error ? err.message : String(err)}`, tool_call_id: String(callId) })
              ]
              console.log('🔍 [DEBUG] After adding ToolMessage (error). New messages count:', messages.length)
              this.eventEmitter.emit('tool.failed', { agentId: agentConfig.id, name, callId, error: err })
            }
          }

          console.log('🔍 [DEBUG] About to re-invoke model with', messages.length, 'messages')
          console.log('🔍 [DEBUG] Last 3 messages types:', messages.slice(-3).map(m => m.constructor.name))
          
          // Re-invoke model with tool outputs
          response = await model.invoke(messages)
          
          console.log('🔍 [DEBUG] Model re-invoked successfully')
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

        console.log(`🧩 [Graph] Agent ${agentConfig.id} using ${toolRuntime.lcTools.length} tools:`, toolRuntime.lcTools.map(t => t.name))

        // Prepare messages with agent prompt
        const systemMessage = new SystemMessage(agentConfig.prompt)
        
        let messages: any[] = [systemMessage, ...filteredStateMessages]

        // DEBUG: Log the messages being sent to LangChain (buildGraph method)
        console.log('🔍 [DEBUG] BuildGraph - Messages being sent to LangChain:', messages.map((m, i) => ({
          index: i,
          type: m.constructor.name,
          role: m.role || 'unknown',
          hasToolCalls: !!(m.tool_calls && m.tool_calls.length > 0),
          contentPreview: m.content.toString().slice(0, 100)
        })))

        // Execute model with basic tool loop (max 3 iterations)
        console.log('🔍 [DEBUG] BuildGraph - About to invoke model for the first time')
        let response
        try {
          response = await model.invoke(messages)
          console.log('🔍 [DEBUG] BuildGraph - First model invocation successful')
        } catch (error) {
          console.log('🔍 [DEBUG] BuildGraph - First model invocation failed:', error)
          throw error
        }

        // Handle tool calls if present
        for (let i = 0; i < 3; i++) {
          const toolCalls = (response as any)?.tool_calls || (response as any)?.additional_kwargs?.tool_calls || []
          console.log(`🔍 [DEBUG] BuildGraph - Tool loop iteration ${i + 1}, tool_calls found:`, toolCalls.length)
          
          if (!toolCalls || toolCalls.length === 0) {
            console.log(`🔍 [DEBUG] BuildGraph - No tool calls in iteration ${i + 1}, breaking loop`)
            break
          }

          console.log('🔍 [DEBUG] BuildGraph - Adding AIMessage with tool_calls to messages array')
          console.log('🔍 [DEBUG] BuildGraph - tool_calls found:', toolCalls.length)
          
          // Add the AI response with tool calls to messages
          messages.push(response)

          this.eventEmitter.emit('tools.called', {
            agentId: agentConfig.id,
            count: toolCalls.length,
            tools: toolCalls.map((t: any) => t?.name)
          })
          console.log(`🛠️  [Graph] ${agentConfig.id} invoked tools:`, toolCalls.map((t: any) => t?.name))

          for (const call of toolCalls) {
            const callId = call?.id || call?.tool_call_id || `tool_${Date.now()}`
            const name = call?.name || call?.function?.name
            let args = call?.args || call?.function?.arguments || {}
            try {
              if (typeof args === 'string') {
                try { args = JSON.parse(args) } catch {}
              }
              console.log(`➡️  [Tool] ${agentConfig.id} -> ${name}(${JSON.stringify(args)})`)
              const output = await toolRuntime.run(String(name), args)
              console.log(`⬅️  [Tool] ${name} result:`, output?.toString?.().slice?.(0, 200) ?? String(output).slice(0, 200))
              console.log('🔍 [DEBUG] BuildGraph - Before adding ToolMessage. Current messages count:', messages.length)
              console.log('🔍 [DEBUG] BuildGraph - Previous message type before adding ToolMessage:', messages[messages.length - 1]?.constructor?.name)
              console.log('🔍 [DEBUG] BuildGraph - Previous message has tool_calls:', !!messages[messages.length - 1]?.tool_calls?.length)
              console.log('🔍 [DEBUG] BuildGraph - Previous message tool_calls:', messages[messages.length - 1]?.tool_calls)
              
              messages = [
                ...messages,
                new ToolMessage({ content: String(output), tool_call_id: String(callId) })
              ]
              console.log('🔍 [DEBUG] BuildGraph - After adding ToolMessage. New messages count:', messages.length)
              this.eventEmitter.emit('tool.completed', { agentId: agentConfig.id, name, callId })
            } catch (err) {
              console.log('🔍 [DEBUG] BuildGraph - Before adding ToolMessage (error). Current messages count:', messages.length)
              messages = [
                ...messages,
                new ToolMessage({ content: `Error: ${err instanceof Error ? err.message : String(err)}`, tool_call_id: String(callId) })
              ]
              console.log('🔍 [DEBUG] BuildGraph - After adding ToolMessage (error). New messages count:', messages.length)
              console.error(`❌ [Tool] ${name} failed:`, err)
              this.eventEmitter.emit('tool.failed', { agentId: agentConfig.id, name, callId, error: err })
            }
          }

          console.log('🔍 [DEBUG] BuildGraph - About to re-invoke model with', messages.length, 'messages')
          console.log('🔍 [DEBUG] BuildGraph - Last 3 messages types:', messages.slice(-3).map(m => m.constructor.name))
          
          // Re-invoke model with tool outputs
          try {
            response = await model.invoke(messages)
            console.log('🔍 [DEBUG] BuildGraph - Model re-invoked successfully')
          } catch (error) {
            console.log('🔍 [DEBUG] BuildGraph - Model re-invocation failed:', error)
            throw error
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
}
