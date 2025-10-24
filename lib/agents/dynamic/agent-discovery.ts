/**
 * Dynamic Agent Discovery Service
 * 
 * Provides real-time detection and registration of available agents
 * with automatic tool generation and prompt updates
 */

import { AgentConfig } from '../types'
import { SubAgentManager, SubAgent } from '../core/sub-agent-manager'
import logger from '@/lib/utils/logger'
import { EventEmitter } from '../core/event-emitter'
import { z } from 'zod'

export interface DiscoveredAgent {
  id: string
  name: string
  description: string
  delegationToolName: string
  capabilities: string[]
  tags: string[]
  available: boolean
  source: 'database' | 'runtime' | 'predefined'
  parentAgentId?: string
}

export class AgentDiscoveryService {
  private static instance: AgentDiscoveryService | null = null
  private discoveredAgents = new Map<string, DiscoveredAgent>()
  private delegationTools = new Map<string, any>()
  private eventEmitter: EventEmitter
  private refreshInterval: NodeJS.Timeout | null = null
  private lastRefresh = 0
  private cacheExpiryMs = 60000 // 1 minute cache
  
  private constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(eventEmitter?: EventEmitter): AgentDiscoveryService {
    if (!AgentDiscoveryService.instance) {
      if (!eventEmitter) {
        throw new Error('EventEmitter required for first initialization')
      }
      AgentDiscoveryService.instance = new AgentDiscoveryService(eventEmitter)
    }
    return AgentDiscoveryService.instance
  }
  
  /**
   * Initialize the discovery service
   */
  async initialize(userId?: string): Promise<void> {
    logger.info('[AgentDiscovery] Initializing agent discovery service')
    
    // Load all available agents
    await this.discoverAllAgents(userId)
    
    // Set up auto-refresh
    this.startAutoRefresh()
    
    // Listen for agent creation/update events
    this.setupEventListeners()
  }
  
  /**
   * Discover all available agents from all sources
   */
  async discoverAllAgents(userId?: string): Promise<DiscoveredAgent[]> {
    const now = Date.now()
    
    // Check cache validity
    if (now - this.lastRefresh < this.cacheExpiryMs && this.discoveredAgents.size > 0) {
      return Array.from(this.discoveredAgents.values())
    }
    
    logger.info('[AgentDiscovery] Discovering all available agents')
    
    const allAgents: DiscoveredAgent[] = []
    
    // 1. Discover predefined agents
    const predefinedAgents = await this.discoverPredefinedAgents()
    allAgents.push(...predefinedAgents)
    
    // 2. Discover database agents
    const dbAgents = await this.discoverDatabaseAgents(userId)
    allAgents.push(...dbAgents)
    
    // 3. Discover runtime agents
    const runtimeAgents = await this.discoverRuntimeAgents()
    allAgents.push(...runtimeAgents)
    
    // 4. Discover sub-agents
    if (userId) {
      const subAgents = await this.discoverSubAgents(userId)
      allAgents.push(...subAgents)
    }
    
    // Update cache
    this.discoveredAgents.clear()
    for (const agent of allAgents) {
      this.discoveredAgents.set(agent.id, agent)
      
      // Create delegation tool if not exists
      if (!this.delegationTools.has(agent.delegationToolName)) {
        const tool = this.createDelegationTool(agent)
        this.delegationTools.set(agent.delegationToolName, tool)
      }
    }
    
    this.lastRefresh = now
    
    // Emit discovery complete event
    this.eventEmitter.emit('agents-discovered', {
      count: allAgents.length,
      agents: allAgents.map(a => ({ id: a.id, name: a.name }))
    })
    
    logger.info(`[AgentDiscovery] Discovered ${allAgents.length} agents`)
    
    return allAgents
  }
  
  /**
   * Discover predefined agents
   */
  private async discoverPredefinedAgents(): Promise<DiscoveredAgent[]> {
    try {
      const { ALL_PREDEFINED_AGENTS } = await import('../predefined')
      const agents: DiscoveredAgent[] = []
      
      for (const config of ALL_PREDEFINED_AGENTS) {
        if (config.id === 'cleo-supervisor') continue // Skip Cleo itself
        
        agents.push({
          id: config.id,
          name: config.name,
          description: config.description || '',
          delegationToolName: `delegate_to_${config.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
          capabilities: config.tools || [],
          tags: config.tags || [],
          available: true,
          source: 'predefined'
        })
      }
      
      return agents
    } catch (error) {
      logger.error('[AgentDiscovery] Error discovering predefined agents:', error)
      return []
    }
  }
  
  /**
   * Discover agents from database
   */
  private async discoverDatabaseAgents(userId?: string): Promise<DiscoveredAgent[]> {
    try {
      // Only try to access database in server context
      if (typeof window !== 'undefined') {
        // Client-side: skip database discovery
        return []
      }
      
      // Validate environment variables before attempting connection
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        logger.warn('[AgentDiscovery] Supabase credentials not configured, skipping database agent discovery')
        return []
      }
      
      // Dynamic import to avoid build issues
      const { createClient } = await import('@/lib/supabase/server-admin')
      const supabase = createClient()
      
      // Query for all agents (user's agents and shared agents)
      let query = supabase
        .from('agents')
        .select('*')
        .neq('name', 'Cleo') // Exclude Cleo
      
      if (userId) {
        // Filter strictly by the authenticated user's agents.
        // Note: 'is_public' column does not exist in our schema; predefined/shared agents are handled elsewhere.
        query = query.eq('user_id', userId)
      }
      
      const { data: agents, error } = await query
      
      if (error) {
        // Detect network errors specifically
        const isNetworkError = error.message?.includes('fetch failed') || 
                               error.message?.includes('network') ||
                               error.message?.includes('ECONNREFUSED')
        
        if (isNetworkError) {
          logger.warn('[AgentDiscovery] Network error fetching database agents (non-fatal):', {
            message: error.message,
            hint: 'Database connection unavailable, using cached/predefined agents only'
          })
          // Invalidate cache on network errors to force refresh when connection restored
          this.lastRefresh = 0
        } else {
          logger.error('[AgentDiscovery] Error fetching database agents:', error)
        }
        return []
      }
      
      return (agents || []).map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        delegationToolName: `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
        capabilities: agent.tools || [],
        tags: agent.tags || [],
        available: true,
        source: 'database' as const,
        parentAgentId: agent.parent_agent_id
      }))
    } catch (error) {
      // Detect and handle network/fetch errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isNetworkError = errorMessage.includes('fetch failed') || 
                             errorMessage.includes('network') ||
                             errorMessage.includes('ECONNREFUSED')
      
      if (isNetworkError) {
        logger.warn('[AgentDiscovery] Network error in database agent discovery (non-fatal):', {
          message: errorMessage,
          hint: 'Using cached/predefined agents only'
        })
        // Invalidate cache to retry on next request
        this.lastRefresh = 0
      } else {
        logger.error('[AgentDiscovery] Error discovering database agents:', {
          message: errorMessage,
          details: error instanceof Error ? error.stack : undefined
        })
      }
      return []
    }
  }
  
  /**
   * Discover runtime registered agents
   */
  private async discoverRuntimeAgents(): Promise<DiscoveredAgent[]> {
    try {
      // Access the global orchestrator registry
      const g = globalThis as any
      if (!g.__cleoCoreOrchestrator) return []
      
      const registeredAgents = g.__cleoCoreOrchestrator.getAllAgents?.() || []
      
      return registeredAgents
        .filter((agent: any) => agent.id !== 'cleo-supervisor')
        .map((agent: any) => ({
          id: agent.id,
          name: agent.name || agent.id,
          description: agent.description || '',
          delegationToolName: `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
          capabilities: agent.tools || [],
          tags: agent.tags || [],
          available: true,
          source: 'runtime' as const
        }))
    } catch (error) {
      logger.error('[AgentDiscovery] Error discovering runtime agents:', error)
      return []
    }
  }
  
  /**
   * Discover sub-agents
   */
  private async discoverSubAgents(userId: string): Promise<DiscoveredAgent[]> {
    try {
      const eventEmitter = new EventEmitter()
      const subAgentManager = new SubAgentManager(userId, eventEmitter)
      await subAgentManager.initialize()
      
      // Get all parent agents first
      const parentAgents = Array.from(this.discoveredAgents.values())
      const subAgents: DiscoveredAgent[] = []
      
      for (const parent of parentAgents) {
        const subs = await subAgentManager.getSubAgents(parent.id)
        
        for (const sub of subs) {
          subAgents.push({
            id: sub.id,
            name: sub.name,
            description: sub.description || '',
            delegationToolName: sub.delegationToolName,
            capabilities: [], // SubAgents don't have tools exposed
            tags: [], // SubAgents don't have tags exposed
            available: true,
            source: 'database' as const,
            parentAgentId: sub.parentAgentId
          })
        }
      }
      
      return subAgents
    } catch (error) {
      logger.error('[AgentDiscovery] Error discovering sub-agents:', error)
      return []
    }
  }
  
  /**
   * Create a delegation tool for an agent
   */
  private createDelegationTool(agent: DiscoveredAgent): any {
    return {
      name: agent.delegationToolName,
      description: `Delegate task to ${agent.name}: ${agent.description}`,
      inputSchema: z.object({
        task: z.string().describe('The specific task to delegate'),
        context: z.string().optional().describe('Additional context for the task'),
        priority: z.enum(['low', 'medium', 'high']).default('medium')
      }),
      execute: async (params: any) => {
        const { task, context, priority } = params
        
        logger.info(`[AgentDiscovery] Delegating to ${agent.name}: ${task}`)
        
        return {
          status: 'delegated',
          nextAction: 'handoff_to_agent',
          agentId: agent.id,
          targetAgent: agent.id,
          delegatedTask: task,
          context: context || '',
          priority: priority || 'medium',
          handoffMessage: `Task delegated to ${agent.name}: ${task}${context ? ` - Context: ${context}` : ''}`
        }
      }
    }
  }
  
  /**
   * Get delegation tools for specific agents
   */
  getDelegationTools(agentIds?: string[]): Record<string, any> {
    const tools: Record<string, any> = {}
    
    if (agentIds) {
      // Get tools for specific agents
      for (const agentId of agentIds) {
        const agent = this.discoveredAgents.get(agentId)
        if (agent) {
          const tool = this.delegationTools.get(agent.delegationToolName)
          if (tool) {
            tools[agent.delegationToolName] = tool
          }
        }
      }
    } else {
      // Get all delegation tools
      for (const [name, tool] of this.delegationTools) {
        tools[name] = tool
      }
    }
    
    return tools
  }
  
  /**
   * Get all discovered agents
   */
  getDiscoveredAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values())
  }
  
  /**
   * Get agent by ID
   */
  getAgent(agentId: string): DiscoveredAgent | null {
    return this.discoveredAgents.get(agentId) || null
  }
  
  /**
   * Refresh discovery (force refresh)
   */
  async refresh(userId?: string): Promise<void> {
    this.lastRefresh = 0 // Reset cache
    await this.discoverAllAgents(userId)
  }
  
  /**
   * Generate delegation prompt for Cleo
   */
  generateDelegationPrompt(): string {
    const agents = this.getDiscoveredAgents()
    
    if (agents.length === 0) {
      return ''
    }
    
    const agentDescriptions = agents
      .filter(agent => agent.available)
      .map(agent => {
        const capabilities = agent.capabilities.length > 0 
          ? ` (capabilities: ${agent.capabilities.slice(0, 3).join(', ')})`
          : ''
        const tags = agent.tags.length > 0
          ? ` [${agent.tags.slice(0, 3).join(', ')}]`
          : ''
        
        return `- **${agent.name}** (${agent.delegationToolName})${tags}: ${agent.description}${capabilities}`
      })
      .join('\n')
    
    return `
## Available Agents for Delegation

You have access to the following specialized agents that you can delegate tasks to:

${agentDescriptions}

### Delegation Guidelines:
1. **Analyze the task** to determine if delegation would be beneficial
2. **Match capabilities** - Select agents whose specialization aligns with the task
3. **Provide clear context** - Give the delegated agent enough information to succeed
4. **Review outputs** - Validate and synthesize results before presenting to the user
5. **Handle failures gracefully** - If delegation fails, attempt to complete the task yourself or suggest alternatives

### When to Delegate:
- The task requires specialized knowledge or tools the agent possesses
- The task can be parallelized across multiple agents
- The user explicitly requests a specific agent's assistance
- The task complexity exceeds your current context or capabilities

Remember: You remain responsible for the overall task completion and quality of results.
`
  }
  
  /**
   * Register a new agent dynamically
   */
  async registerAgent(agent: DiscoveredAgent): Promise<void> {
    // Add to discovered agents
    this.discoveredAgents.set(agent.id, agent)
    
    // Create delegation tool
    const tool = this.createDelegationTool(agent)
    this.delegationTools.set(agent.delegationToolName, tool)
    
    // Emit event
    this.eventEmitter.emit('agent-registered', {
      agentId: agent.id,
      agentName: agent.name,
      delegationTool: agent.delegationToolName
    })
    
    logger.info(`[AgentDiscovery] Registered new agent: ${agent.name} (${agent.id})`)
  }
  
  /**
   * Set up event listeners for agent changes
   */
  private setupEventListeners(): void {
    // Listen for sub-agent creation
    this.eventEmitter.on('sub-agent-created', async (data: any) => {
      logger.info('[AgentDiscovery] Sub-agent created event received:', data)
      await this.refresh()
    })
    
    // Listen for agent updates
    this.eventEmitter.on('agent-updated', async (data: any) => {
      logger.info('[AgentDiscovery] Agent updated event received:', data)
      await this.refresh()
    })
    
    // Listen for agent deletion
    this.eventEmitter.on('agent-deleted', async (data: any) => {
      logger.info('[AgentDiscovery] Agent deleted event received:', data)
      const { agentId } = data
      this.discoveredAgents.delete(agentId)
      
      // Remove delegation tool
      const agent = this.discoveredAgents.get(agentId)
      if (agent) {
        this.delegationTools.delete(agent.delegationToolName)
      }
    })
  }
  
  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
    
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.refresh().catch(error => {
        logger.error('[AgentDiscovery] Auto-refresh failed:', error)
      })
    }, 5 * 60 * 1000)
  }
  
  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
    
    this.discoveredAgents.clear()
    this.delegationTools.clear()
    
    logger.info('[AgentDiscovery] Service shutdown complete')
  }
}

// Export singleton getter
export function getAgentDiscoveryService(eventEmitter?: EventEmitter): AgentDiscoveryService {
  return AgentDiscoveryService.getInstance(eventEmitter)
}
