import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import { UnifiedAgent, transformDatabaseAgent, transformAgentConfig, transformToInsertAgent } from './unified-types'
import { ALL_PREDEFINED_AGENTS } from './predefined'
import { AgentConfig } from './types'

export class UnifiedAgentService {
  private supabase: ReturnType<typeof createClient<Database>>

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient<Database>(supabaseUrl, supabaseKey)
    } else {
      // Use server-side environment variables
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        throw new Error('Supabase configuration not found')
      }
      
      this.supabase = createClient<Database>(url, key)
    }
  }

  /**
   * Get all agents for a user (includes both default system agents and user-created agents)
   */
  async getAllAgents(userId: string): Promise<UnifiedAgent[]> {
    try {
      // Get agents from database
      const { data: dbAgents, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) {
        console.error('Error fetching agents from database:', error)
        // Fallback: return only user agents (none) on DB failure to avoid duplication
        return []
      }

      // If no agents found, return empty (do NOT seed predefined agents into DB)
      if (!dbAgents || dbAgents.length === 0) {
        return []
      }

      return dbAgents.map(transformDatabaseAgent)
    } catch (error) {
      console.error('Error in getAllAgents:', error)
      // Fallback: return only user agents (none) to avoid duplication
      return []
    }
  }

  /**
   * Get a specific agent by ID
   */
  async getAgentById(agentId: string, userId: string): Promise<UnifiedAgent | null> {
    try {
      const { data: agent, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !agent) {
        console.error('Agent not found in database:', agentId, error)
        return null
      }

      return transformDatabaseAgent(agent)
    } catch (error) {
      console.error('Error getting agent by ID:', error)
      return null
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(agent: Partial<UnifiedAgent>): Promise<UnifiedAgent | null> {
    try {
      const insertData = transformToInsertAgent(agent)
      
      const { data: newAgent, error } = await this.supabase
        .from('agents')
        .insert(insertData)
        .select()
        .single()

      if (error || !newAgent) {
        console.error('Error creating agent:', error)
        return null
      }

      return transformDatabaseAgent(newAgent)
    } catch (error) {
      console.error('Error in createAgent:', error)
      return null
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, updates: Partial<UnifiedAgent>): Promise<UnifiedAgent | null> {
    try {
      const updateData: Database['public']['Tables']['agents']['Update'] = {}
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.role !== undefined) updateData.role = updates.role
      if (updates.model !== undefined) updateData.model = updates.model
      if (updates.temperature !== undefined) updateData.temperature = updates.temperature
      if (updates.maxTokens !== undefined) updateData.max_tokens = updates.maxTokens
      if (updates.tools !== undefined) updateData.tools = updates.tools
      if (updates.systemPrompt !== undefined) updateData.system_prompt = updates.systemPrompt
      if (updates.color !== undefined) updateData.color = updates.color
      if (updates.icon !== undefined) updateData.icon = updates.icon
      if (updates.canDelegate !== undefined) updateData.can_delegate = updates.canDelegate
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault
      if (updates.priority !== undefined) updateData.priority = updates.priority
      if (updates.tags !== undefined) updateData.tags = updates.tags

      updateData.updated_at = new Date().toISOString()

      const { data: updatedAgent, error } = await this.supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId)
        .select()
        .single()

      if (error || !updatedAgent) {
        console.error('Error updating agent:', error)
        return null
      }

      return transformDatabaseAgent(updatedAgent)
    } catch (error) {
      console.error('Error in updateAgent:', error)
      return null
    }
  }

  /**
   * Smart delete: Hard delete if no data, soft delete if has history
   * - If agent has executions/analytics: SOFT DELETE (preserve historical data)
   * - If agent has no data: HARD DELETE (clean removal, allows immediate name reuse)
   */
  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    try {
      // Check if agent has associated data
      const { data: executionsCheck } = await this.supabase
        .from('agent_executions')
        .select('id')
        .eq('agent_id', agentId)
        .limit(1)
      
      const hasExecutions = executionsCheck && executionsCheck.length > 0

      let error = null

      if (hasExecutions) {
        // Soft delete: preserve historical data
        const { error: updateError } = await this.supabase
          .from('agents')
          .update({ 
            is_active: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', agentId)
          .eq('user_id', userId)
        error = updateError
        console.log(`[UNIFIED-SERVICE] Agent ${agentId} soft-deleted (has executions)`)
      } else {
        // Hard delete: no data to preserve
        const { error: deleteError } = await this.supabase
          .from('agents')
          .delete()
          .eq('id', agentId)
          .eq('user_id', userId)
        error = deleteError
        console.log(`[UNIFIED-SERVICE] Agent ${agentId} hard-deleted (no executions)`)
      }

      if (error) {
        console.error('Error deleting agent:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteAgent:', error)
      return false
    }
  }

  /**
   * Create default system agents for a new user
   */
  // Removed default seeding to DB: predefined agents live only in code now

  /**
   * Get default agents as fallback
   */
  private getDefaultAgentsForUser(userId: string): UnifiedAgent[] {
    // Retain as utility if needed elsewhere, but not used for DB fallback
    return ALL_PREDEFINED_AGENTS.map((agent: AgentConfig) => transformAgentConfig(agent, userId))
  }

  /**
   * Ensure default agents exist for a user
   */
  // Removed ensureDefaultAgents: no longer seeding predefined agents into DB
}

// Singleton instance for server-side usage
let unifiedAgentService: UnifiedAgentService | null = null

export function getUnifiedAgentService(): UnifiedAgentService {
  if (!unifiedAgentService) {
    unifiedAgentService = new UnifiedAgentService()
  }
  return unifiedAgentService
}

// Convenience functions for common operations
export async function getAllAgentsForUser(userId: string): Promise<UnifiedAgent[]> {
  const service = getUnifiedAgentService()
  return service.getAllAgents(userId)
}

export async function getAgentByIdForUser(agentId: string, userId: string): Promise<UnifiedAgent | null> {
  const service = getUnifiedAgentService()
  return service.getAgentById(agentId, userId)
}

export async function createAgentForUser(agent: Partial<UnifiedAgent>): Promise<UnifiedAgent | null> {
  const service = getUnifiedAgentService()
  return service.createAgent(agent)
}

export async function updateAgentForUser(agentId: string, updates: Partial<UnifiedAgent>): Promise<UnifiedAgent | null> {
  const service = getUnifiedAgentService()
  return service.updateAgent(agentId, updates)
}

export async function deleteAgentForUser(agentId: string, userId: string): Promise<boolean> {
  const service = getUnifiedAgentService()
  return service.deleteAgent(agentId, userId)
}

// ensureDefaultAgentsForUser removed: predefined agents are not seeded into DB anymore
