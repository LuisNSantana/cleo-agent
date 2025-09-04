/**
 * Simplified Graph Builder for Agent System
 * Works with existing LangGraph implementation
 */

import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { AgentConfig } from '../types'
import { ModelFactory } from './model-factory'
import { EventEmitter } from './event-emitter'
import { ExecutionManager } from './execution-manager'

export interface GraphBuilderConfig {
  modelFactory: ModelFactory
  eventEmitter: EventEmitter
  executionManager: ExecutionManager
}

/**
 * Simplified Graph Builder
 * 
 * Works with existing MessagesAnnotation-based LangGraph setup
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

      try {
        // Get model for this agent
        const model = await this.modelFactory.getModel(agentConfig.model, {
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens
        })

        // Prepare messages with agent prompt
        const systemMessage = new SystemMessage(agentConfig.prompt)
        const messages = [systemMessage, ...state.messages]

        // Execute model
        const response = await model.invoke(messages)

        this.eventEmitter.emit('node.completed', {
          nodeId: 'execute',
          agentId: agentConfig.id,
          response: response.content
        })

        return {
          messages: [
            ...state.messages,
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
            ...state.messages,
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
