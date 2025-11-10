/**
 * Dynamic Delegation Tools
 * 
 * System for generating and managing delegation tools that allow any agent
 * to discover and delegate to their available sub-agents in real-time.
 */

import { AgentConfig } from '../types'
import { agentRegistry } from '../registry'

export interface DelegationToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: {
      task: { type: 'string'; description: string }
      context: { type: 'string'; description: string }
      priority: { type: 'string'; enum: string[]; description: string }
    }
    required: string[]
  }
  handler: (args: DelegationArgs) => Promise<string>
  metadata: {
    fromAgent: string
    toAgent: string
    specialization: string[]
    capabilities: string[]
  }
}

export interface DelegationArgs {
  task: string
  context?: string
  priority?: 'low' | 'medium' | 'high'
}

/**
 * Generate delegation tools for an agent based on available sub-agents
 */
export async function generateDelegationToolsForAgent(
  agentId: string, 
  userId: string
): Promise<DelegationToolDefinition[]> {
  const agent = await agentRegistry.getAgent(agentId)
  if (!agent) return []
  
  const subAgents = await agentRegistry.getSubAgents(agentId, userId)
  const delegationTools: DelegationToolDefinition[] = []
  
  for (const subAgent of subAgents) {
    const tool = createDelegationTool(agent, subAgent)
    delegationTools.push(tool)
  }
  
  return delegationTools
}

/**
 * Create a delegation tool for a specific sub-agent
 */
function createDelegationTool(parentAgent: AgentConfig, subAgent: AgentConfig): DelegationToolDefinition {
  // CRITICAL: Keep original UUID format - UUIDs are valid tool names and sanitization breaks ID matching
  // Old logic: `delegate_to_${subAgent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
  // This converted hyphens to underscores, then graph-builder converted back, breaking original IDs with underscores
  const toolName = `delegate_to_${subAgent.id}`
  const specialization = getSpecializationFromAgent(subAgent)
  
  return {
    name: toolName,
    description: `Delegate ${specialization} tasks to ${subAgent.name} - ${subAgent.description}`,
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Clear, outcome-oriented task description (1-2 lines max)'
        },
        context: {
          type: 'string',
          description: 'Additional context, constraints, links, or requirements'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority level for sub-agent scheduling'
        }
      },
      required: ['task']
    },
    handler: async (args: DelegationArgs) => {
      return await executeDelegationTask(parentAgent.id, subAgent.id, args)
    },
    metadata: {
      fromAgent: parentAgent.id,
      toAgent: subAgent.id,
      specialization: subAgent.tags || [],
      capabilities: subAgent.tools || []
    }
  }
}

/**
 * Execute a delegation task
 */
async function executeDelegationTask(
  fromAgentId: string, 
  toAgentId: string, 
  args: DelegationArgs
): Promise<string> {
  try {
    // TODO: Implement actual delegation execution
    // This would typically:
    // 1. Create a new execution context for the sub-agent
    // 2. Pass the task to the sub-agent's orchestrator
    // 3. Wait for completion or stream results
    // 4. Return the sub-agent's response
    
    const subAgent = await agentRegistry.getAgent(toAgentId)
    if (!subAgent) {
      throw new Error(`Sub-agent ${toAgentId} not found`)
    }
    
    // Placeholder implementation
    return `Delegated "${args.task}" to ${subAgent.name}. 
    
    Context: ${args.context || 'None provided'}
    Priority: ${args.priority || 'medium'}
    
    [This is a placeholder response - actual delegation system to be implemented]
    
    Sub-agent specialization: ${subAgent.tags?.join(', ') || 'General'}
    Available tools: ${subAgent.tools.length} tools available
    
    Task Status: Queued for execution by ${subAgent.name}`
    
  } catch (error) {
    console.error('Delegation execution failed:', error)
    return `Delegation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

/**
 * Get specialization description from agent
 */
function getSpecializationFromAgent(agent: AgentConfig): string {
  if (!agent.tags || agent.tags.length === 0) {
    return 'general'
  }
  
  const tagStr = agent.tags.join(' ').toLowerCase()
  
  // Map tag patterns to specialization descriptions
  const specializationMap: Record<string, string> = {
    'technical programming code': 'technical and programming',
    'creative design visual': 'creative and design',
    'research analysis data': 'research and analysis',
    'ecommerce shopify sales': 'e-commerce and sales',
    'google workspace productivity': 'Google Workspace and productivity',
    'assistant administrative': 'administrative and organizational',
    'automation browser web': 'web automation and scraping',
    'financial market analysis': 'financial and market research'
  }
  
  for (const [pattern, description] of Object.entries(specializationMap)) {
    const keywords = pattern.split(' ')
    const matches = keywords.filter(keyword => tagStr.includes(keyword))
    if (matches.length >= 2) {
      return description
    }
  }
  
  // Fallback to first few tags
  return agent.tags.slice(0, 2).join(' and ')
}

/**
 * Register delegation tools with the tool system
 */
export async function registerDelegationTools(agentId: string, userId: string): Promise<string[]> {
  const delegationTools = await generateDelegationToolsForAgent(agentId, userId)
  const toolNames: string[] = []
  
  // TODO: Register tools with the global tool registry
  // This would typically integrate with the existing tool system
  for (const tool of delegationTools) {
    toolNames.push(tool.name)
    // registerTool(tool.name, tool)
  }
  
  return toolNames
}

/**
 * Refresh delegation tools for an agent (when sub-agents change)
 */
export async function refreshDelegationTools(agentId: string, userId: string): Promise<void> {
  // TODO: Implement tool refresh logic
  // 1. Remove old delegation tools for this agent
  // 2. Generate new delegation tools based on current sub-agents
  // 3. Register new tools with the system
  
  console.log(`Refreshing delegation tools for agent ${agentId}`)
  
  const newTools = await registerDelegationTools(agentId, userId)
  console.log(`Registered ${newTools.length} delegation tools:`, newTools)
}

/**
 * Get available delegation tools for an agent
 */
export async function getAvailableDelegationTools(agentId: string, userId: string): Promise<string[]> {
  const delegationTools = await generateDelegationToolsForAgent(agentId, userId)
  return delegationTools.map(tool => tool.name)
}

/**
 * Check if an agent has delegation capabilities
 */
export async function hasDelegationCapabilities(agentId: string, userId: string): Promise<boolean> {
  const subAgents = await agentRegistry.getSubAgents(agentId, userId)
  return subAgents.length > 0
}

/**
 * Get delegation statistics for an agent
 */
export async function getDelegationStats(agentId: string, userId: string) {
  const subAgents = await agentRegistry.getSubAgents(agentId, userId)
  const delegationTools = await generateDelegationToolsForAgent(agentId, userId)
  
  return {
    subAgentCount: subAgents.length,
    delegationToolCount: delegationTools.length,
    specializations: [...new Set(subAgents.flatMap(agent => agent.tags || []))],
    capabilities: [...new Set(subAgents.flatMap(agent => agent.tools || []))]
  }
}
