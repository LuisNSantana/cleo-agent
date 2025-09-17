/**
 * Database Agent Management
 * 
 * Handles CRUD operations for user-created and sub-agents stored in the database
 */

import { AgentConfig } from '../types'

/**
 * Get Supabase admin client for server-side operations
 */
function getSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Fetch user agents from database
 */
export async function getUserAgents(userId?: string): Promise<AgentConfig[]> {
  if (!userId) {
    return []
  }

  try {
    const supabase = getSupabaseAdmin()
    
    const { data: dbAgents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching user agents:', error)
      return []
    }

    // Transform DB agents to AgentConfig
    const userAgents: AgentConfig[] = (dbAgents || []).map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      role: agent.role,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.max_tokens,
      color: agent.color,
      icon: agent.icon,
      tags: Array.isArray(agent.tags) ? agent.tags : [],
      prompt: agent.system_prompt,
      tools: Array.isArray(agent.tools) ? agent.tools : [],
      isDefault: false,
      priority: agent.priority,
      parentAgentId: agent.parent_agent_id,
      isSubAgent: !!agent.is_sub_agent,
      predefined: false,
      immutable: false,
      dynamic: true,
      userId: agent.user_id
    }))

    return userAgents
  } catch (error) {
    console.error('Failed to fetch user agents:', error)
    return []
  }
}

/**
 * Get sub-agents for a specific parent agent
 */
export async function getSubAgentsForParent(parentAgentId: string, userId?: string): Promise<AgentConfig[]> {
  if (!userId || !parentAgentId) {
    return []
  }

  try {
    const supabase = getSupabaseAdmin()
    
    const { data: dbAgents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('parent_agent_id', parentAgentId)
      .eq('is_sub_agent', true)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching sub-agents:', error)
      return []
    }

    // Transform DB agents to AgentConfig
    const subAgents: AgentConfig[] = (dbAgents || []).map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      role: agent.role,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.max_tokens,
      color: agent.color,
      icon: agent.icon,
      tags: Array.isArray(agent.tags) ? agent.tags : [],
      prompt: agent.system_prompt,
      tools: Array.isArray(agent.tools) ? agent.tools : [],
      isDefault: false,
      priority: agent.priority,
      parentAgentId: agent.parent_agent_id,
      isSubAgent: true,
      predefined: false,
      immutable: false,
      dynamic: true,
      userId: agent.user_id
    }))

    return subAgents
  } catch (error) {
    console.error('Failed to fetch sub-agents:', error)
    return []
  }
}

/**
 * Create a new user agent
 */
export async function createUserAgent(agent: Omit<AgentConfig, 'id'>): Promise<AgentConfig> {
  try {
    // TODO: Replace with actual database operation
    // const response = await fetch('/api/agents', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(agent)
    // })
    // return response.json()
    
    // For now, return agent with generated ID
    const newAgent: AgentConfig = {
      ...agent,
      id: `user-agent-${Date.now()}`,
      dynamic: true
    }
    
    return newAgent
  } catch (error) {
    console.error('Failed to create user agent:', error)
    throw error
  }
}

/**
 * Update an existing user agent
 */
export async function updateUserAgent(agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig> {
  try {
    // TODO: Replace with actual database operation
    // const response = await fetch(`/api/agents/${agentId}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(updates)
    // })
    // return response.json()
    
    // For now, return updated agent
    const updatedAgent: AgentConfig = {
      id: agentId,
      name: 'Updated Agent',
      description: 'Updated description',
      role: 'specialist',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 4096,
      tools: [],
      prompt: 'Updated prompt',
      color: '#000000',
      icon: '🤖',
      dynamic: true,
      ...updates
    }
    
    return updatedAgent
  } catch (error) {
    console.error('Failed to update user agent:', error)
    throw error
  }
}

/**
 * Delete a user agent
 */
export async function deleteUserAgent(agentId: string): Promise<void> {
  try {
    // TODO: Replace with actual database operation
    // await fetch(`/api/agents/${agentId}`, {
    //   method: 'DELETE'
    // })
    
    console.log(`Agent ${agentId} deleted (placeholder)`)
  } catch (error) {
    console.error('Failed to delete user agent:', error)
    throw error
  }
}

/**
 * Create a sub-agent for a parent agent
 */
export async function createSubAgent(
  parentAgentId: string, 
  subAgent: Omit<AgentConfig, 'id' | 'isSubAgent' | 'parentAgentId'>
): Promise<AgentConfig> {
  const newSubAgent: AgentConfig = {
    ...subAgent,
    id: `sub-agent-${Date.now()}`,
    isSubAgent: true,
    parentAgentId,
    dynamic: true
  }
  
  return createUserAgent(newSubAgent)
}

/**
 * Get agent ownership information
 */
export async function getAgentOwnership(agentId: string): Promise<{ userId: string | null; isPublic: boolean }> {
  try {
    // TODO: Replace with actual database query
    // const response = await fetch(`/api/agents/${agentId}/ownership`)
    // return response.json()
    
    // For now, return default ownership
    return {
      userId: null,
      isPublic: true
    }
  } catch (error) {
    console.error('Failed to get agent ownership:', error)
    return {
      userId: null,
      isPublic: false
    }
  }
}
