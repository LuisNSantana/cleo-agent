/**
 * Cleo - Advanced Emotional Intelligence Supervisor & Coordinator
 * Primary agent with sophisticated emotional awareness and multi-agent orchestration.
 * Now with dynamic agent discovery and delegation capabilities.
 */

import { AgentConfig } from '../types'
import { getCleoPrompt, sanitizeModelName } from '@/lib/prompts'

// Base tools that Cleo always has access to
const BASE_TOOLS = [
  'webSearch', // General web search
  'getCurrentDateTime', // Time/timezone
  'weatherInfo', // Weather data
  'randomFact', // Fun facts
]

// Legacy delegation tools for backward compatibility
// These will be supplemented by dynamically discovered agents
const LEGACY_DELEGATION_TOOLS = [
  'delegate_to_toby', // Technical tasks
  'delegate_to_ami', // Executive assistant/Notion/email triage
  'delegate_to_astra', // Email writing/sending
  'delegate_to_peter', // Google Workspace (no email)
  'delegate_to_emma', // E-commerce/Shopify
  'delegate_to_apu', // Financial/market research
  'delegate_to_wex', // Web automation
  'delegate_to_nora', // Social media/Twitter
]

export const CLEO_AGENT: AgentConfig = {
  id: 'cleo-supervisor',
  name: 'Cleo',
  description: 'Advanced emotional intelligence supervisor with multi-agent coordination and empathetic user interaction capabilities.',
  role: 'supervisor',
  model: 'gpt-4o-mini',
  temperature: 0.5,
  maxTokens: 16384,
  // Tools will be dynamically updated at runtime
  tools: [...BASE_TOOLS, ...LEGACY_DELEGATION_TOOLS],
  tags: ['supervisor', 'empathy', 'coordination', 'emotional-intelligence', 'delegation', 'dynamic'],
  // Prompt will be dynamically enhanced with discovered agents
  prompt: getCleoPrompt(sanitizeModelName('gpt-4o-mini'), 'default'),
  color: '#FF6B6B',
  icon: '❤️',
  immutable: true,
  predefined: true,
  // Flag to indicate this agent should use dynamic discovery
  useDynamicDiscovery: true,
};

/**
 * Get Cleo configuration with dynamically discovered agents
 * This function should be called at runtime to get the latest agent list
 */
export async function getCleoDynamicConfig(userId?: string): Promise<AgentConfig> {
  try {
    // Only try dynamic discovery in server context
    if (typeof window !== 'undefined') {
      // Client-side: return static configuration
      return CLEO_AGENT
    }
    
    // Dynamic imports to avoid build issues
    const { getAgentDiscoveryService } = await import('../dynamic/agent-discovery')
    const { EventEmitter } = await import('../core/event-emitter')
    
    const eventEmitter = new EventEmitter()
    const discoveryService = getAgentDiscoveryService(eventEmitter)
    
    // Discover all available agents
    await discoveryService.initialize(userId)
    const discoveredAgents = discoveryService.getDiscoveredAgents()
    
    // Get all delegation tool names
    const delegationTools = discoveredAgents.map(agent => agent.delegationToolName)
    
    // Generate enhanced prompt with discovered agents
    const delegationPrompt = discoveryService.generateDelegationPrompt()
    const basePrompt = getCleoPrompt(sanitizeModelName('gpt-4o-mini'), 'default')
    
    return {
      ...CLEO_AGENT,
      tools: [...BASE_TOOLS, ...delegationTools],
      prompt: basePrompt + '\n\n' + delegationPrompt,
    }
  } catch (error) {
    console.error('[Cleo] Error loading dynamic configuration:', error)
    // Fallback to static configuration
    return CLEO_AGENT
  }
}