/**
 * Agent Orchestrator
 * LangGraph-based coordination system for multi-agent execution
 */

import { StateGraph, MessagesAnnotation, Command, START, END } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages'

import {
  AgentConfig,
  AgentExecution,
  AgentMessage,
  ExecutionStatus,
  ExecutionMetrics,
  LangGraphConfig,
  HandoffTool,
  AgentActivity,
  ExecutionStep
} from './types'
import { AGENT_SYSTEM_CONFIG, getAgentById } from './config'
import { buildToolRuntime } from '@/lib/langchain/tooling'

export class AgentOrchestrator {
  private graph: any = null
  private graphBuilt: boolean = false
  private agents: Map<string, any> = new Map()
  private executions: Map<string, AgentExecution> = new Map()
  private eventListeners: ((event: AgentActivity) => void)[] = []

  constructor(config: LangGraphConfig = AGENT_SYSTEM_CONFIG) {
    console.log('🏗️ Creating new AgentOrchestrator instance')
    this.initializeAgents(config)
    if (!this.graphBuilt) {
      try {
        this.buildGraph(config)
        this.graphBuilt = true
      } catch (error) {
        this.handleGraphError(error, config)
      }
    }
  }

  // Add execution step for real-time visualization
  private addExecutionStep(executionId: string, step: Omit<ExecutionStep, 'id' | 'timestamp'>) {
    const execution = this.executions.get(executionId)
    if (!execution) return

    if (!execution.steps) {
      execution.steps = []
    }

    const newStep: ExecutionStep = {
      id: `step_${executionId}_${execution.steps.length}`,
      timestamp: new Date(),
      ...step
    }

    execution.steps.push(newStep)
    execution.currentStep = newStep.id

    // Emit event for real-time UI updates
    this.emitEvent({
      agentId: step.agent,
      type: 'execution_step',
      timestamp: newStep.timestamp,
      data: { executionId, step: newStep }
    })
  }

  // Fire-and-forget start: returns a running execution immediately for live UI
  startAgentExecution(input: string, agentId?: string): AgentExecution {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date()

    const execution: AgentExecution = {
      id: executionId,
      agentId: agentId || 'cleo-supervisor',
      status: 'running',
      startTime,
      messages: [],
      metrics: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        executionTime: 0,
        toolCallsCount: 0,
        handoffsCount: 0,
        errorCount: 0,
        cost: 0
      }
    }

    this.executions.set(executionId, execution)
    this.emitEvent({
      agentId: execution.agentId,
      type: 'execution_start',
      timestamp: startTime,
      data: { executionId, input }
    })

    console.log(`💾 Execution stored:`, {
      executionId,
      totalExecutions: this.executions.size,
      executionIds: Array.from(this.executions.keys())
    })

    // Run in background
    ;(async () => {
      try {
        if (!this.graph) throw new Error('Graph not initialized')

        // Step 1: Analysis
        this.addExecutionStep(executionId, {
          agent: execution.agentId,
          action: 'analyzing',
          content: 'Analizando la consulta del usuario...',
          progress: 10
        })

        const processingTime = Math.random() * 3000 + 1000
        await new Promise(r => setTimeout(r, processingTime))

        // Step 2: Routing/Thinking
        this.addExecutionStep(executionId, {
          agent: execution.agentId,
          action: 'routing',
          content: 'Determinando la mejor estrategia de respuesta...',
          progress: 30
        })

        const initialMessage = new HumanMessage(input)
        console.log(`📤 Invoking graph with message: "${input.substring(0, 50)}..."`)
        
  let result = await this.graph.invoke({ messages: [initialMessage] })
        
        console.log(`📨 Graph execution completed:`, {
          executionId,
          resultMessageCount: result.messages?.length || 0,
          lastMessageType: result.messages?.length > 0 ? result.messages[result.messages.length - 1]._getType() : 'none'
        })

        // If graph didn't produce an AI answer yet (e.g., router returned without finalize), call finalize explicitly
        const lastMsg = result.messages?.[result.messages.length - 1]
        if (!(lastMsg instanceof AIMessage)) {
          console.warn('⚠️ No AIMessage from graph; invoking finalize explicitly')
          const finalizeNode: any = await (this as any) // types escape
          // Reuse finalize logic by sending prior messages through the finalize node function
          const supervisorCfg = getAgentById('cleo-supervisor')
          const finalModel = this.createModelForAgent(supervisorCfg!)
          const system = new SystemMessage(
            `${supervisorCfg?.prompt || 'Eres un asistente.'}\n\nReglas:\n- Usa el historial de mensajes para dar una respuesta final clara y práctica.\n- Si el usuario pidió código o ejemplos, genera solo lo necesario y verificado, sin inventar.\n- No asumas dependencias ni claves; si son necesarias, menciónalas brevemente.\n- Sé conciso y enfocado en resolver la solicitud.`
          )
          try {
            const ai = await finalModel.invoke([system, ...(result.messages || [])])
            result = { messages: [...(result.messages || []), ai] }
          } catch (err) {
            console.error('❌ Explicit finalize failed:', err)
          }
        }

        execution.messages = (result.messages || []).map((message: any, index: number) => ({
          id: `msg_${executionId}_${index}`,
          type: message instanceof HumanMessage ? 'human' :
                message instanceof AIMessage ? 'ai' :
                message instanceof ToolMessage ? 'tool' : 'system',
          content: message.content as string,
          timestamp: new Date(startTime.getTime() + index * 1000),
          metadata: {
            ...(message.additional_kwargs || {}),
            sender: (message.additional_kwargs && (message.additional_kwargs as any).sender) || execution.agentId
          },
          toolCalls: message.tool_calls || []
        }))

        // Step 3: Processing complete - AFTER we have the final messages
        this.addExecutionStep(executionId, {
          agent: execution.agentId,
          action: 'completing',
          content: 'Respuesta final generada correctamente',
          progress: 100
        })

        execution.endTime = new Date()
        execution.status = 'completed'
        execution.metrics.executionTime = execution.endTime.getTime() - startTime.getTime()
        this.executions.set(executionId, execution)

        console.log(`✅ Execution completed with final message:`, {
          executionId,
          finalMessageType: execution.messages.length > 0 ? execution.messages[execution.messages.length - 1].type : 'none',
          finalMessageContent: execution.messages.length > 0 ? execution.messages[execution.messages.length - 1].content.substring(0, 100) : 'none'
        })

        this.emitEvent({
          agentId: execution.agentId,
          type: 'execution_completed',
          timestamp: execution.endTime,
          data: { executionId, result: execution }
        })
      } catch (error) {
        console.error(`❌ Agent execution failed for ${executionId}:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
        })

        execution.status = 'failed'
        execution.error = error instanceof Error ? error.message : 'Unknown error'
        execution.endTime = new Date()
        execution.metrics.errorCount++
        execution.metrics.executionTime = execution.endTime.getTime() - startTime.getTime()
        
        // Important: Always update the execution in storage, even on error
        this.executions.set(executionId, execution)
        
        this.emitEvent({ 
          agentId: execution.agentId, 
          type: 'error', 
          timestamp: new Date(), 
          data: { executionId, error: execution.error } 
        })
      }
    })()

    return execution
  }

  private initializeAgents(config: LangGraphConfig) {
    const allAgents = [config.supervisorAgent, ...config.specialistAgents]

    for (const agentConfig of allAgents) {
      const model = this.createModelForAgent(agentConfig)
      const tools = this.createToolsForAgent(agentConfig, config.handoffTools)

      const agent = createReactAgent({
        llm: model,
        tools,
        prompt: agentConfig.prompt,
        name: agentConfig.id
      })

      this.agents.set(agentConfig.id, agent)
      this.emitEvent({
        agentId: agentConfig.id,
        type: 'execution_start',
        timestamp: new Date(),
        data: { type: 'agent_initialized', agent: agentConfig }
      })
    }
  }

  private createModelForAgent(agentConfig: AgentConfig) {
    // Map model names to actual model instances
    const modelMap: Record<string, any> = {
      'langchain:balanced': new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens
      }),
      'gpt-4o-mini': new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens
      }),
      'langchain:fast': new ChatAnthropic({
        modelName: 'claude-3-haiku-20240307',
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens
      }),
      'langchain:balanced-local': new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens
      })
    }

    return modelMap[agentConfig.model] || modelMap['langchain:balanced']
  }

  private createToolsForAgent(agentConfig: AgentConfig, handoffTools: HandoffTool[]) {
    const tools: any[] = []

    // 1) Real app tools via registry (filters to existing ones)
    const selected = Array.isArray(agentConfig.tools) ? agentConfig.tools : []
    const runtime = buildToolRuntime(selected)
    tools.push(...runtime.lcTools)

    // 2) Complete task tool for specialists (to close the loop into finalize)
    if (agentConfig.role === 'specialist') {
      const completeTaskTool = tool(
        async () => {
          console.log(`✅ ${agentConfig.id} completing task and going to finalize`)
          return new Command({
            goto: 'finalize',
            update: {
              messages: [
                new HumanMessage({
                  content: `Tarea completada por ${agentConfig.name}. Preparando respuesta final.`,
                  additional_kwargs: {
                    handoff_from: agentConfig.id,
                    handoff_to: 'finalize',
                    task_completed: true
                  }
                })
              ]
            },
            graph: Command.PARENT
          })
        },
        {
          name: 'complete_task',
          description: 'Marcar la tarea como completada y pasar a la respuesta final',
          schema: z.object({})
        }
      )
      tools.push(completeTaskTool)
    }

    // 3) Delegation tools for supervisor (handoff routing)
    if (agentConfig.role === 'supervisor') {
      for (const handoff of handoffTools.filter(h => h.fromAgent === agentConfig.id)) {
        const delegationTool = tool(
          async (input: { task: string; context?: string }) => {
            this.emitEvent({
              agentId: agentConfig.id,
              type: 'handoff',
              timestamp: new Date(),
              data: { toAgent: handoff.toAgent, task: input.task }
            })

            return new Command({
              goto: handoff.toAgent,
              update: {
                messages: [
                  new HumanMessage({
                    content: `Nueva tarea delegada: ${input.task}${input.context ? `\n\nContexto: ${input.context}` : ''}`,
                    additional_kwargs: {
                      handoff_to: handoff.toAgent,
                      handoff_from: agentConfig.id
                    }
                  })
                ]
              },
              graph: Command.PARENT
            })
          },
          {
            name: handoff.name,
            description: handoff.description,
            schema: z.object({
              task: z.string().describe('Descripción detallada de la tarea a delegar'),
              context: z.string().optional().describe('Contexto adicional para la tarea')
            })
          }
        )
        tools.push(delegationTool)
      }
    }

    return tools
  }

  private buildGraph(config: LangGraphConfig) {
    try {
      console.log('🏗️ Building agent graph...', {
        availableAgents: Array.from(this.agents.keys())
      })

      const graphBuilder = new StateGraph(MessagesAnnotation)

      // Add ALL agent nodes (including specialists) to ensure they're reachable
      for (const [agentId, agent] of this.agents) {
        console.log(`🔍 Checking agent: ${agentId} (type: ${typeof agentId})`)
        // Skip cleo-supervisor as it's replaced by router/finalizer pattern
        if (agentId !== 'cleo-supervisor') {
          // Wrap agent execution to add proper tracking
          const wrappedAgent = async (state: any) => {
            // Find current execution to track this agent
            const currentExecution = Array.from(this.executions.values())
              .find(exec => exec.status === 'running')

            console.log(`🎯 Agent ${agentId} executing...`)
            
            if (currentExecution) {
              // Add execution step for this agent
              this.addExecutionStep(currentExecution.id, {
                agent: agentId,
                action: 'analyzing',
                content: `Ejecutando ${agentId}...`,
                progress: 70,
                metadata: { phase: 'agent_execution', agentId }
              })

              // Emit event for UI tracking
              this.emitEvent({
                agentId: agentId,
                type: 'execution_step',
                timestamp: new Date(),
                data: { agentId, phase: 'start' }
              })
            }

            // Execute the actual agent
            const result = await agent.invoke(state)

            if (currentExecution) {
              // Add completion step
              this.addExecutionStep(currentExecution.id, {
                agent: agentId,
                action: 'completing',
                content: `${agentId} completado`,
                progress: 80,
                metadata: { phase: 'agent_completed', agentId, completed: true }
              })

              // Emit completion event
              this.emitEvent({
                agentId: agentId,
                type: 'execution_step',
                timestamp: new Date(),
                data: { agentId, phase: 'complete', result: String(result.messages?.[result.messages.length - 1]?.content || '').substring(0, 100) }
              })
            }

            return result
          }

          graphBuilder.addNode(agentId as any, wrappedAgent)
          console.log(`✅ Added wrapped node: ${agentId}`)
        } else {
          console.log(`⏭️ Skipping cleo-supervisor node`)
        }
      }

  // Add router node
  graphBuilder.addNode('router' as any, async (state: any) => {
        // Find current execution to add routing step
        const currentExecution = Array.from(this.executions.values())
          .find(exec => exec.status === 'running')

        if (currentExecution) {
          this.addExecutionStep(currentExecution.id, {
            agent: 'cleo-supervisor',
            action: 'routing',
            content: 'Analizando consulta y determinando estrategia...',
            progress: 40,
            metadata: { phase: 'routing' }
          })
        }
        
        const last = state.messages[state.messages.length - 1]
        const content = typeof last?.content === 'string' ? (last.content as string) : ''
        const lc = content.toLowerCase()

  let target: string = 'finalize' // Default to finalize

        // Route to specialists based on content analysis
        if (lc.includes('técnico') || lc.includes('technical') || lc.includes('datos') || lc.includes('investigación') || lc.includes('research')) {
          if (this.agents.has('toby-technical')) {
            target = 'toby-technical'
            console.log('👨‍💻 Router delegating to Toby (technical)')
          }
        } else if (lc.includes('creativo') || lc.includes('creative') || lc.includes('diseño') || lc.includes('contenido') || lc.includes('design')) {
          if (this.agents.has('ami-creative')) {
            target = 'ami-creative'
            console.log('🎨 Router delegating to Ami (creative)')
          }
        } else if (lc.includes('lógico') || lc.includes('logical') || lc.includes('matemático') || lc.includes('math') || lc.includes('problema') || lc.includes('suma') || lc.includes('multiplicación') || lc.includes('multiplicacion') || lc.includes('cálculo') || lc.includes('calculo') || lc.includes('operación') || lc.includes('operacion')) {
          if (this.agents.has('peter-logical')) {
            target = 'peter-logical'
            console.log('🧮 Router delegating to Peter (logical)')
          }
        } else {
          console.log('💬 Router handling directly, going to finalize')
        }

        if (target !== 'finalize') {
          if (currentExecution) {
            this.addExecutionStep(currentExecution.id, {
              agent: 'cleo-supervisor',
              action: 'delegating',
              content: `Delegando a ${target}: ${content.substring(0, 100)}...`,
              progress: 50,
              metadata: { delegatedTo: target }
            })
          }

          // Emit UI event for delegation visualization
          this.emitEvent({
            agentId: 'cleo-supervisor',
            type: 'handoff',
            timestamp: new Date(),
            data: { toAgent: target, task: content.substring(0, 140) }
          })
        }

        // Router node should pass through the messages for conditional routing to work
        return { messages: state.messages }
      })

      // Conditional routing from router to next node
      graphBuilder.addConditionalEdges(
        'router' as any,
        async (state: any) => {
          const last = state.messages[state.messages.length - 1]
          const content = typeof last?.content === 'string' ? (last.content as string) : ''
          const lc = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
          
          console.log(`🔀 Router conditional check: "${content.substring(0, 50)}..."`)
          console.log(`🔀 Router lowercase: "${lc.substring(0, 50)}..."`)

          // Math/Logical keywords with better Spanish detection
          const mathKeywords = ['logico', 'logical', 'matematico', 'math', 'problema', 'suma', 'multiplicacion', 'calculo', 'operacion', 'cuanto es', 'cuanto', 'cuánto', 'calcular', 'resolver', '\\+', '\\-', '\\*', '/', '=', 'dividir', 'multiplicar', 'sumar', 'restar']
          const hasMathKeyword = mathKeywords.some(keyword => {
            if (keyword.includes('\\')) {
              return new RegExp(keyword).test(lc)
            }
            return lc.includes(keyword)
          })

          if (hasMathKeyword && this.agents.has('peter-logical')) {
            console.log('🔀 Router: Going to peter-logical')
            return 'peter-logical'
          }

          if ((lc.includes('tecnico') || lc.includes('technical') || lc.includes('datos') || lc.includes('investigacion') || lc.includes('research')) && this.agents.has('toby-technical')) {
            console.log('🔀 Router: Going to toby-technical')
            return 'toby-technical'
          }
          if ((lc.includes('creativo') || lc.includes('creative') || lc.includes('diseno') || lc.includes('contenido') || lc.includes('design')) && this.agents.has('ami-creative')) {
            console.log('🔀 Router: Going to ami-creative')
            return 'ami-creative'
          }
          console.log('🔀 Router: Going to finalize (default)')
          return 'finalize'
        },
        {
          'toby-technical': 'toby-technical' as any,
          'ami-creative': 'ami-creative' as any,
          'peter-logical': 'peter-logical' as any,
          'finalize': 'finalize' as any
        }
      )

      // Finalizer node: Cleo provides final response via LLM (no hardcoded examples)
      graphBuilder.addNode('finalize' as any, async (state: any) => {
        console.log('🏁 *** FINALIZE NODE EXECUTING ***')
        console.log('🏁 Finalizing execution with Cleo response')
        console.log('🏁 State messages count:', state.messages?.length || 0)

        // Add a visualization step for UI
        const currentExecution = Array.from(this.executions.values()).find(exec => exec.status === 'running')
        if (currentExecution) {
          this.addExecutionStep(currentExecution.id, {
            agent: 'cleo-supervisor',
            action: 'completing',
            content: 'Generando respuesta final con el contexto de la conversación...',
            progress: 95,
            metadata: { phase: 'finalizing' }
          })
        }

        // Build a final answer using supervisor model and full context
        const supervisorCfg = getAgentById('cleo-supervisor')
        const finalModel = this.createModelForAgent(supervisorCfg!)

        const system = new SystemMessage(
          `${supervisorCfg?.prompt || 'Eres un asistente.'}

Reglas:
- Usa el historial de mensajes para dar una respuesta final clara y práctica.
- Si el usuario pidió código o ejemplos, genera solo lo necesario y verificado, sin inventar.
- No asumas dependencias ni claves; si son necesarias, menciónalas brevemente.
- Sé conciso y enfocado en resolver la solicitud.`
        )

        const prior = Array.isArray(state.messages) ? state.messages : []

        let ai: AIMessage
        try {
          const result = await finalModel.invoke([system, ...prior])
          // Ensure we return a message with sender metadata for UI routing
          ai = new AIMessage({
            content: (result as any).content || '',
            additional_kwargs: { sender: 'cleo-supervisor' }
          })
          
          console.log('✅ Finalize node completed successfully:', String(ai.content).substring(0, 100))
          
          // Mark finalize as complete in UI
          if (currentExecution) {
            this.addExecutionStep(currentExecution.id, {
              agent: 'cleo-supervisor',
              action: 'completing',
              content: 'Respuesta final completada',
              progress: 100,
              metadata: { phase: 'finalized', completed: true }
            })
          }
        } catch (err) {
          console.error('❌ Finalizer LLM failed:', err)
          ai = new AIMessage({
            content: 'No pude generar la respuesta final en este momento. Intenta nuevamente o especifica más contexto.',
            additional_kwargs: { sender: 'cleo-supervisor', error: 'finalizer_llm_failed' }
          })
        }

        return { messages: [ai] }
      })
      console.log('✅ Added node: finalize')

      // Entry: start at router
      graphBuilder.addEdge(START, 'router' as any)

      // All specialist agents route to finalizer when done
      for (const specialistId of ['toby-technical', 'ami-creative', 'peter-logical']) {
        if (this.agents.has(specialistId)) {
          graphBuilder.addEdge(specialistId as any, 'finalize' as any)
          console.log(`✅ Added edge: ${specialistId} -> finalize`)
        }
      }

  // Router branching handled by conditional edges above

      // Finalize ends the graph
      graphBuilder.addEdge('finalize' as any, END)
      console.log('✅ Added edge: finalize -> END')

      this.graph = graphBuilder.compile()
      console.log('✅ Graph successfully built with router/finalizer pattern', {
        nodes: Array.from(this.agents.keys()).filter(id => id !== 'cleo-supervisor').concat(['router', 'finalize']),
        totalNodes: this.agents.size - 1 + 2 // specialists + router + finalize
      })
    } catch (error) {
      console.error('❌ Error building graph:', error)
      throw error
    }
  }

  private handleGraphError(error: any, config: LangGraphConfig) {
    console.warn('Graph build error detected, attempting to recreate:', error.message)

    // Reset the graph state
    this.graph = null
    this.graphBuilt = false

    // Try to rebuild with a fresh StateGraph
    try {
      const graphBuilder = new StateGraph(MessagesAnnotation)

      // Clear agents and reinitialize
      this.agents.clear()
      this.initializeAgents(config)
      this.buildGraph(config)
      console.log('Graph successfully rebuilt after error')
    } catch (rebuildError) {
      console.error('Failed to rebuild graph:', rebuildError)
      throw rebuildError
    }
  }

  async executeAgent(input: string, agentId?: string): Promise<AgentExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date()

    console.log(`🚀 Starting agent execution:`, {
      executionId,
      input: input.substring(0, 100) + '...',
      requestedAgent: agentId,
      graphStatus: this.graph ? 'initialized' : 'not_initialized',
      availableAgents: Array.from(this.agents.keys())
    })

    const execution: AgentExecution = {
      id: executionId,
      agentId: agentId || 'cleo-supervisor',
      status: 'running',
      startTime,
      messages: [],
      metrics: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        executionTime: 0,
        toolCallsCount: 0,
        handoffsCount: 0,
        errorCount: 0,
        cost: 0
      }
    }

    this.executions.set(executionId, execution)
    this.emitEvent({
      agentId: execution.agentId,
      type: 'execution_start',
      timestamp: startTime,
      data: { executionId, input }
    })

    try {
      if (!this.graph) {
        throw new Error('Graph not initialized')
      }

      console.log(`📝 Invoking graph with realistic execution simulation...`)
      
      // Simulate realistic agent processing time (1-4 seconds)
      const processingTime = Math.random() * 3000 + 1000
      console.log(`⏱️ Simulating ${Math.round(processingTime)}ms processing time for realistic UX`)
      
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      const initialMessage = new HumanMessage(input)
      const result = await this.graph.invoke({
        messages: [initialMessage]
      })

      console.log(`✅ Graph execution completed:`, {
        executionId,
        messageCount: result.messages?.length || 0,
        lastMessage: result.messages?.length > 0 ? {
          type: result.messages[result.messages.length - 1]._getType(),
          content: result.messages[result.messages.length - 1].content.substring(0, 150) + '...'
        } : 'no_messages'
      })

    // Convert LangChain messages to our format (include sender metadata/handoff for graph visualization)
    execution.messages = (result.messages || []).map((message: any, index: number) => ({
        id: `msg_${executionId}_${index}`,
        type: message instanceof HumanMessage ? 'human' :
              message instanceof AIMessage ? 'ai' :
              message instanceof ToolMessage ? 'tool' : 'system',
        content: message.content as string,
        timestamp: new Date(startTime.getTime() + index * 1000),
        metadata: {
      ...(message.additional_kwargs || {}),
      // sender defaults to cleo if not provided
      sender: (message.additional_kwargs && (message.additional_kwargs as any).sender) || execution.agentId
        },
        toolCalls: message.tool_calls || []
      }))

      execution.endTime = new Date()
      execution.status = 'completed'
      execution.metrics.executionTime = execution.endTime.getTime() - startTime.getTime()

      console.log(`📊 Execution completed successfully:`, {
        executionId,
        duration: execution.metrics.executionTime + 'ms',
        messageCount: execution.messages.length
      })

      this.emitEvent({
        agentId: execution.agentId,
        type: 'execution_completed',
        timestamp: execution.endTime,
        data: { executionId, result: execution }
      })

    } catch (error) {
      console.error(`❌ Agent execution failed:`, {
        executionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
      })

      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.endTime = new Date()
      execution.metrics.errorCount++
      execution.metrics.executionTime = execution.endTime.getTime() - startTime.getTime()

      this.emitEvent({
        agentId: execution.agentId,
        type: 'error',
        timestamp: new Date(),
        data: { executionId, error: execution.error }
      })
    }

    return execution
  }

  getExecution(executionId: string): AgentExecution | undefined {
    const execution = this.executions.get(executionId)
    console.log(`🔍 Looking for execution ${executionId}:`, {
      found: !!execution,
      totalExecutions: this.executions.size,
      executionIds: Array.from(this.executions.keys()),
      status: execution?.status
    })
    return execution
  }

  getAllExecutions(): AgentExecution[] {
    return Array.from(this.executions.values())
  }

  getActiveExecutions(): AgentExecution[] {
    return this.getAllExecutions().filter(exec => exec.status === 'running')
  }

  // Event system for real-time updates
  onEvent(listener: (event: AgentActivity) => void) {
    this.eventListeners.push(listener)
  }

  offEvent(listener: (event: AgentActivity) => void) {
    this.eventListeners = this.eventListeners.filter(l => l !== listener)
  }

  private emitEvent(event: AgentActivity) {
    this.eventListeners.forEach(listener => listener(event))
  }

  // Cleanup method
  cleanup() {
    console.log('🧹 Cleaning up orchestrator:', {
      totalExecutions: this.executions.size,
      activeExecutions: this.getActiveExecutions().length,
      executionIds: Array.from(this.executions.keys())
    })
    
    // Don't clean up executions if there are active ones
    const activeExecutions = this.getActiveExecutions()
    if (activeExecutions.length > 0) {
      console.warn('⚠️ Not clearing executions - there are active executions:', activeExecutions.map(e => e.id))
      // Only clean up graph and agents, keep executions
      this.graph = null
      this.graphBuilt = false
      this.agents.clear()
      this.eventListeners = []
    } else {
      // Full cleanup if no active executions
      this.graph = null
      this.graphBuilt = false
      this.executions.clear()
      this.agents.clear()
      this.eventListeners = []
    }
  }
}

// Singleton instance with proper persistence
let orchestratorInstance: AgentOrchestrator | null = null

export function getAgentOrchestrator(): AgentOrchestrator {
  // Use globalThis to ensure a true singleton across route module boundaries
  const g = globalThis as unknown as {
    __cleoOrchestrator?: AgentOrchestrator
  }

  if (!g.__cleoOrchestrator) {
    console.log('🔄 Creating orchestrator in globalThis')
    g.__cleoOrchestrator = new AgentOrchestrator()
  } else {
    console.log('♻️ Reusing orchestrator from globalThis')
  }
  orchestratorInstance = g.__cleoOrchestrator
  return g.__cleoOrchestrator
}

export function resetAgentOrchestrator() {
  console.log('🗑️ Resetting orchestrator instance')
  if (orchestratorInstance) {
    const activeExecutions = orchestratorInstance.getActiveExecutions()
    if (activeExecutions.length > 0) {
      console.warn('⚠️ Attempting to reset orchestrator with active executions:', activeExecutions.map(e => e.id))
      // Don't reset if there are active executions - just clean up the graph
      orchestratorInstance.cleanup()
      return
    }
    orchestratorInstance.cleanup()
  }
  // Also clear global reference
  const g = globalThis as unknown as {
    __cleoOrchestrator?: AgentOrchestrator
  }
  orchestratorInstance = null
  delete g.__cleoOrchestrator
}

export function recreateAgentOrchestrator(): AgentOrchestrator {
  console.log('🔄 Force recreating orchestrator instance')
  resetAgentOrchestrator()
  return getAgentOrchestrator()
}
