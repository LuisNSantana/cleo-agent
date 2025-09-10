/**
 * Dynamic Delegation System
 * 
 * Generates delegation tools dynamically based on available sub-agents
 * and handles task routing between agents with specialization matching.
 */

import { AgentConfig } from '../types'

/**
 * Generate delegation tools for an agent based on its sub-agents
 */
export async function generateDelegationTools(parentAgent: AgentConfig, subAgents: AgentConfig[]): Promise<string[]> {
  const delegationTools: string[] = []
  
  for (const subAgent of subAgents) {
    const toolName = `delegate_to_${subAgent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
    delegationTools.push(toolName)
  }
  
  return delegationTools
}

/**
 * Create delegation tool definition for a specific sub-agent
 */
export function createDelegationToolDefinition(parentAgent: AgentConfig, subAgent: AgentConfig) {
  const toolName = `delegate_to_${subAgent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
  
  return {
    name: toolName,
    description: `Delegate ${getSpecializationDescription(subAgent)} tasks to ${subAgent.name}`,
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Clear, outcome-oriented task description (1-2 lines)'
        },
        context: {
          type: 'string',
          description: 'Additional context, constraints, or requirements'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority level'
        }
      },
      required: ['task']
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
 * Get specialization description from agent tags and capabilities
 */
function getSpecializationDescription(agent: AgentConfig): string {
  if (!agent.tags || agent.tags.length === 0) {
    return 'general'
  }
  
  // Map common tag combinations to descriptions
  const tagStr = agent.tags.join(' ').toLowerCase()
  
  if (tagStr.includes('technical') || tagStr.includes('programming')) {
    return 'technical and programming'
  }
  if (tagStr.includes('creative') || tagStr.includes('design')) {
    return 'creative and design'
  }
  if (tagStr.includes('research') || tagStr.includes('analysis')) {
    return 'research and analysis'
  }
  if (tagStr.includes('ecommerce') || tagStr.includes('shopify')) {
    return 'e-commerce and sales'
  }
  if (tagStr.includes('google') || tagStr.includes('workspace')) {
    return 'Google Workspace and productivity'
  }
  if (tagStr.includes('assistant') || tagStr.includes('administrative')) {
    return 'administrative and organizational'
  }
  
  // Use first 2-3 tags as description
  return agent.tags.slice(0, 3).join(', ')
}

/**
 * Match tasks to most suitable sub-agent based on specialization
 */
export function findBestSubAgentForTask(task: string, context: string, subAgents: AgentConfig[]): AgentConfig | null {
  if (subAgents.length === 0) return null
  if (subAgents.length === 1) return subAgents[0]
  
  const taskLower = `${task} ${context}`.toLowerCase()
  const scores = subAgents.map(agent => ({
    agent,
    score: calculateTaskMatchScore(taskLower, agent)
  }))
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)
  
  // Return best match if score is above threshold
  return scores[0].score > 0.3 ? scores[0].agent : subAgents[0]
}

/**
 * Calculate how well a task matches an agent's specialization
 */
function calculateTaskMatchScore(taskText: string, agent: AgentConfig): number {
  let score = 0
  
  // Check tags match
  if (agent.tags) {
    for (const tag of agent.tags) {
      if (taskText.includes(tag.toLowerCase())) {
        score += 0.3
      }
    }
  }
  
  // Check tools match
  if (agent.tools) {
    for (const tool of agent.tools) {
      const toolKeywords = extractToolKeywords(tool)
      for (const keyword of toolKeywords) {
        if (taskText.includes(keyword.toLowerCase())) {
          score += 0.2
        }
      }
    }
  }
  
  // Check description match
  if (agent.description) {
    const descWords = agent.description.toLowerCase().split(/\s+/)
    for (const word of descWords) {
      if (word.length > 4 && taskText.includes(word)) {
        score += 0.1
      }
    }
  }
  
  return Math.min(score, 1.0) // Cap at 1.0
}

/**
 * Extract keywords from tool names
 */
function extractToolKeywords(toolName: string): string[] {
  // Convert camelCase and snake_case to words
  const words = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2)
  
  return words
}

/**
 * Build dynamic prompt additions for delegation awareness
 */
export function buildDelegationPromptAddition(agent: AgentConfig, subAgents: AgentConfig[]): string {
  if (subAgents.length === 0) return ''
  
  const subAgentDescriptions = subAgents.map(subAgent => {
    const specialization = getSpecializationDescription(subAgent)
    const toolName = `delegate_to_${subAgent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
    return `- ${subAgent.name} (${specialization}): ${toolName} — ${subAgent.description}`
  }).join('\n')
  
  return `\n\nSpecialized Sub-Agents Available:\n${subAgentDescriptions}\n\nDelegation Guidelines:\n- Delegate tasks that match a sub-agent's specialization\n- Provide clear, outcome-oriented task descriptions\n- Review sub-agent outputs for quality and completeness\n- Synthesize results before presenting to user\n`
}

/**
 * Generate delegation routing logic
 */
export interface DelegationRoute {
  condition: string
  targetAgentId: string
  toolName: string
  description: string
}

export function generateDelegationRoutes(parentAgent: AgentConfig, subAgents: AgentConfig[]): DelegationRoute[] {
  return subAgents.map(subAgent => ({
    condition: generateConditionFromTags(subAgent.tags || []),
    targetAgentId: subAgent.id,
    toolName: `delegate_to_${subAgent.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
    description: `${getSpecializationDescription(subAgent)} tasks`
  }))
}

/**
 * Generate condition string from agent tags
 */
function generateConditionFromTags(tags: string[]): string {
  if (tags.length === 0) return 'general_task'
  
  // Create OR condition from tags
  const conditions = tags.map(tag => `${tag}_task`).join(' OR ')
  return conditions
}
