/**
 * Sub-Agent Management System with Supabase Integration
 * Handles dynamic creation, registration, and management of sub-agents
 */

import { EventEmitter } from './event-emitter'
import { SubAgentService, SubAgent, SubAgentData } from '../services/sub-agent-service'
import { tools as appTools } from '@/lib/tools'
import { z } from 'zod'
import logger from '@/lib/utils/logger'

export interface SubAgentTemplate {
  name: string
  description: string
  role: 'specialist' | 'assistant' | 'validator'
  defaultModel: string
  defaultTemperature: number
  promptTemplate: string
  suggestedTools: string[]
}

// Re-export types for compatibility
export type { SubAgent, SubAgentData }

export class SubAgentManager {
  private userId: string
  private subAgentsCache = new Map<string, SubAgent>()
  private delegationTools = new Map<string, any>()
  private eventEmitter: EventEmitter
  private lastCacheUpdate = 0
  private cacheExpiryMs = 5 * 60 * 1000 // 5 minutes

  constructor(userId: string, eventEmitter: EventEmitter) {
    this.userId = userId
    this.eventEmitter = eventEmitter
  }

  /**
   * Update the active user for this manager and refresh cache if changed
   */
  async setUser(userId: string): Promise<void> {
    if (!userId || userId === this.userId) return
    this.userId = userId
    await this.refreshCache()
  }

  /**
   * Create a new sub-agent in the database
   */
  async createSubAgent(config: SubAgentData): Promise<SubAgent> {
    try {
      // Validate parent agent access
      const hasAccess = await SubAgentService.validateParentAgentAccess(
        config.parentAgentId,
        this.userId
      )

      if (!hasAccess) {
        throw new Error('Parent agent not found or not accessible')
      }

      // Create sub-agent in database
      const subAgent = await SubAgentService.createSubAgent(this.userId, config)

      // Update cache
      this.subAgentsCache.set(subAgent.id, subAgent)

      // Create and register delegation tool
      const delegationTool = this.createDelegationTool(subAgent)
      this.delegationTools.set(subAgent.delegationToolName, delegationTool)

      // Emit creation event
      this.eventEmitter.emit('sub-agent-created', {
        subAgent,
        delegationTool: subAgent.delegationToolName
      })

      return subAgent
    } catch (error) {
      logger.error('Error creating sub-agent:', error)
      throw error
    }
  }

  /**
   * Get all sub-agents for a parent agent
   */
  async getSubAgents(parentAgentId: string): Promise<SubAgent[]> {
    try {
      // Check cache freshness
      const now = Date.now()
      if (now - this.lastCacheUpdate > this.cacheExpiryMs) {
        await this.refreshCache()
      }

      // Filter cached sub-agents by parent
      let subAgents = Array.from(this.subAgentsCache.values())
        .filter(agent => agent.parentAgentId === parentAgentId)

      // Fallback: if none in cache (e.g., unauthenticated user), fetch from service (includes predefined)
      if (subAgents.length === 0) {
        try {
          const fetched = await SubAgentService.getSubAgents(parentAgentId)
          for (const sa of fetched) {
            this.subAgentsCache.set(sa.id, sa)
            const tool = this.createDelegationTool(sa)
            this.delegationTools.set(sa.delegationToolName, tool)
          }
          this.lastCacheUpdate = Date.now()
          subAgents = fetched
        } catch (e) {
          logger.warn('[SubAgentManager] Fallback getSubAgents failed:', e)
        }
      }

      return subAgents
    } catch (error) {
      logger.error('Error getting sub-agents:', error)
      return []
    }
  }

  /**
   * Get a specific sub-agent by ID
   */
  async getSubAgent(agentId: string): Promise<SubAgent | null> {
    try {
      // Check cache first
      if (this.subAgentsCache.has(agentId)) {
        return this.subAgentsCache.get(agentId)!
      }

      // Fetch from database
      const subAgent = await SubAgentService.getSubAgent(agentId, this.userId)
      
      if (subAgent) {
        this.subAgentsCache.set(agentId, subAgent)
      }

      return subAgent
    } catch (error) {
      logger.error('Error getting sub-agent:', error)
      return null
    }
  }

  /**
   * Update a sub-agent
   */
  async updateSubAgent(agentId: string, updates: Partial<SubAgentData>): Promise<boolean> {
    try {
      const success = await SubAgentService.updateSubAgent(agentId, this.userId, updates)
      
      if (success) {
        // Refresh the specific sub-agent in cache
        const updatedSubAgent = await SubAgentService.getSubAgent(agentId, this.userId)
        if (updatedSubAgent) {
          // Remove old delegation tool if name changed
          const oldSubAgent = this.subAgentsCache.get(agentId)
          if (oldSubAgent && oldSubAgent.delegationToolName !== updatedSubAgent.delegationToolName) {
            this.delegationTools.delete(oldSubAgent.delegationToolName)
          }

          // Update cache
          this.subAgentsCache.set(agentId, updatedSubAgent)

          // Create new delegation tool
          const delegationTool = this.createDelegationTool(updatedSubAgent)
          this.delegationTools.set(updatedSubAgent.delegationToolName, delegationTool)

          // Emit update event
          this.eventEmitter.emit('sub-agent-updated', {
            subAgent: updatedSubAgent,
            delegationTool: updatedSubAgent.delegationToolName
          })
        }
      }

      return success
    } catch (error) {
      logger.error('Error updating sub-agent:', error)
      return false
    }
  }

  /**
   * Delete a sub-agent
   */
  async deleteSubAgent(agentId: string): Promise<boolean> {
    try {
      // Get sub-agent before deletion
      const subAgent = this.subAgentsCache.get(agentId)
      
      const success = await SubAgentService.deleteSubAgent(agentId, this.userId)
      
      if (success) {
        // Remove from cache and tools
        this.subAgentsCache.delete(agentId)
        
        if (subAgent) {
          this.delegationTools.delete(subAgent.delegationToolName)
          
          // Emit deletion event
          this.eventEmitter.emit('sub-agent-deleted', {
            agentId,
            delegationTool: subAgent.delegationToolName
          })
        }
      }

      return success
    } catch (error) {
      logger.error('Error deleting sub-agent:', error)
      return false
    }
  }

  /**
   * Get delegation tool for a sub-agent
   */
  getDelegationTool(toolName: string): any {
    return this.delegationTools.get(toolName)
  }

  /**
   * Get all delegation tools for a parent agent
   */
  getDelegationTools(parentAgentId: string): Record<string, any> {
    const tools: Record<string, any> = {}
    
    Array.from(this.subAgentsCache.values())
      .filter(agent => agent.parentAgentId === parentAgentId)
      .forEach(agent => {
        const tool = this.delegationTools.get(agent.delegationToolName)
        if (tool) {
          tools[agent.delegationToolName] = tool
        }
      })

    return tools
  }

  /**
   * Get statistics about sub-agents
   */
  async getStatistics(): Promise<{
    totalSubAgents: number
    subAgentsByParent: Record<string, number>
    createdToday: number
  }> {
    try {
      return await SubAgentService.getSubAgentStatistics(this.userId)
    } catch (error) {
      logger.error('Error getting sub-agent statistics:', error)
      return {
        totalSubAgents: 0,
        subAgentsByParent: {},
        createdToday: 0
      }
    }
  }

  /**
   * Refresh the cache from the database
   */
  private async refreshCache(): Promise<void> {
    try {
      // Clear current cache
      this.subAgentsCache.clear()
      this.delegationTools.clear()

      // Get all user's sub-agents from database
      const statistics = await SubAgentService.getSubAgentStatistics(this.userId)
      
      // For each parent agent, get its sub-agents
      for (const parentAgentId of Object.keys(statistics.subAgentsByParent)) {
        const subAgents = await SubAgentService.getSubAgents(parentAgentId)
        
        subAgents.forEach(subAgent => {
          this.subAgentsCache.set(subAgent.id, subAgent)
          
          // Create delegation tool
          const delegationTool = this.createDelegationTool(subAgent)
          this.delegationTools.set(subAgent.delegationToolName, delegationTool)
        })
      }

      this.lastCacheUpdate = Date.now()
    } catch (error) {
      logger.error('Error refreshing sub-agent cache:', error)
    }
  }

  /**
   * Create a delegation tool for a sub-agent
   */
  private createDelegationTool(subAgent: SubAgent): any {
    const toolName = subAgent.delegationToolName
    
    // Return a simple tool object instead of using the 'tool' helper
    const toolImpl = {
      name: toolName,
      description: `Delegate task to ${subAgent.name}: ${subAgent.description}`,
      inputSchema: z.object({
        task: z.string().describe('The specific task to delegate to the sub-agent'),
        context: z.string().optional().describe('Additional context for the task'),
        priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Task priority level')
      }),
      execute: async (params: any) => {
        const { task, context, priority } = params

        // Return standard handoff payload so GraphBuilder detects delegation and orchestrates execution
        return {
          status: 'delegated',
          nextAction: 'handoff_to_agent',
          // Use sub-agent id as the target so orchestrator resolves it via SubAgentManager
          agentId: subAgent.id,
          targetAgent: subAgent.id,
          delegatedTask: task,
          context: context || '',
          // Normalize priority to existing expectations (graph-builder treats missing -> 'normal')
          priority: (priority as 'low' | 'medium' | 'high') || 'medium',
          handoffMessage: `Task delegated to ${subAgent.name}: ${task}${context ? ` - Context: ${context}` : ''}`
        }
      }
    }

    // Register into global tools registry so agents can bind and call it by name
    try {
      (appTools as any)[toolName] = toolImpl
    } catch (e) {
      logger.warn('[SUB-AGENT-MANAGER] Failed to register delegation tool globally:', toolName, e)
    }

    return toolImpl
  }

  /**
   * Initialize sub-agent manager for a user
   */
  async initialize(): Promise<void> {
    await this.refreshCache()
  logger.info(`[SUB-AGENT-MANAGER] Initialized for user ${this.userId} with ${this.subAgentsCache.size} sub-agents`)
  }

  /**
   * Get sub-agent templates for common use cases
   */
  getSubAgentTemplates(): SubAgentTemplate[] {
    return [
      {
        name: 'Code Reviewer',
        description: 'Specialized in code review and quality assessment',
        role: 'specialist',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.3,
        promptTemplate: 'You are a expert code reviewer. Focus on code quality, best practices, security issues, and performance optimization.',
        suggestedTools: ['file_operations', 'code_analysis']
      },
      {
        name: 'Documentation Writer',
        description: 'Focused on creating and maintaining documentation',
        role: 'specialist',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.7,
        promptTemplate: 'You are a technical documentation specialist. Create clear, comprehensive, and user-friendly documentation.',
        suggestedTools: ['file_operations', 'web_search']
      },
      {
        name: 'Testing Specialist',
        description: 'Expert in writing and managing tests',
        role: 'specialist',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.4,
        promptTemplate: 'You are a testing expert. Focus on creating comprehensive test suites, identifying edge cases, and ensuring code reliability.',
        suggestedTools: ['file_operations', 'terminal_operations']
      },
      {
        name: 'Research Assistant',
        description: 'Specialized in research and information gathering',
        role: 'assistant',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.8,
        promptTemplate: 'You are a research specialist. Gather comprehensive information, analyze sources, and provide well-structured research reports.',
        suggestedTools: ['web_search', 'document_analysis']
      }
    ]
  }
}
