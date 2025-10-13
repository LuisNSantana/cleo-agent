import { createClient } from '@supabase/supabase-js'
import { ALL_PREDEFINED_AGENTS } from '@/lib/agents/predefined'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface SubAgentData {
  name: string
  description: string
  parentAgentId: string
  systemPrompt: string
  model?: string
  config?: Record<string, any>
}

export interface SubAgent {
  id: string
  name: string
  description: string
  parentAgentId: string
  isSubAgent: boolean
  delegationToolName: string
  subAgentConfig: Record<string, any>
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number
  createdAt: string
  isActive: boolean
  createdBy: string
}

export class SubAgentService {
  /**
   * Create a new sub-agent in the database
   */
  static async createSubAgent(
    userId: string,
    data: SubAgentData
  ): Promise<SubAgent> {
    const { data: result, error } = await supabase.rpc('create_sub_agent', {
      p_user_id: userId,
      p_parent_agent_id: data.parentAgentId,
      p_name: data.name,
      p_description: data.description,
      p_system_prompt: data.systemPrompt,
      p_model: data.model || 'gpt-4o-mini',
      p_config: data.config || {}
    })

    if (error) {
      console.error('Error creating sub-agent:', error)
      throw new Error(`Failed to create sub-agent: ${error.message}`)
    }

    // Get the created sub-agent details
    const { data: subAgent, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', result)
      .single()

    if (fetchError) {
      console.error('Error fetching created sub-agent:', fetchError)
      throw new Error(`Failed to fetch created sub-agent: ${fetchError.message}`)
    }

    return this.mapDatabaseAgentToSubAgent(subAgent)
  }

  /**
   * Get all sub-agents for a parent agent (includes predefined + DB)
   */
  static async getSubAgents(parentAgentId: string, userId?: string): Promise<SubAgent[]> {
    // 1) Predefined sub-agents (from code)
    const predefined = ALL_PREDEFINED_AGENTS
      .filter(a => a.isSubAgent && a.parentAgentId === parentAgentId)
      .map(a => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        parentAgentId: a.parentAgentId!,
        isSubAgent: true,
        delegationToolName: `delegate_to_${a.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
        subAgentConfig: {},
        systemPrompt: a.prompt,
        model: a.model,
        temperature: a.temperature ?? 0.7,
        maxTokens: a.maxTokens ?? 4096,
        createdAt: new Date().toISOString(),
        isActive: true,
        createdBy: 'system'
      }))

    // 2) DB sub-agents (via RPC) — only if parentAgentId is a UUID to avoid 22P02 errors
    let dbList: any[] = []
    const isUuid = this.isValidUUID(parentAgentId)
    if (isUuid) {
      try {
        const { data, error } = await supabase.rpc('get_sub_agents', {
          parent_id: parentAgentId
        })
        if (error) {
          console.error('Error fetching sub-agents (RPC):', error)
        } else {
          dbList = Array.isArray(data) ? data : []
        }
      } catch (e) {
        console.error('Exception fetching sub-agents (RPC):', e)
      }
    }

    const dbSubAgents = dbList.map(this.mapDatabaseAgentToSubAgent)

    // 3) Merge: DB overrides predefined by ID
    const byId = new Map<string, SubAgent>()
    for (const sa of predefined) byId.set(sa.id, sa)
    for (const sa of dbSubAgents) byId.set(sa.id, sa)

    const result = Array.from(byId.values())
    
    // Log for debugging
    if (result.length > 0) {
      console.log(`[SubAgentService] Found ${result.length} sub-agents for parent ${parentAgentId}:`, 
        result.map(s => s.name).join(', '))
    }

    return result
  }

  /**
   * Helper to check if a string is a valid UUID
   */
  private static isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Get a specific sub-agent by ID
   */
  static async getSubAgent(agentId: string, userId: string): Promise<SubAgent | null> {
    // If agentId is not a valid UUID, it's likely a built-in agent name like "apu-support"
    // Return null as it's not a sub-agent in the database
    if (!this.isValidUUID(agentId)) {
      // Skipping sub-agent lookup for non-UUID agent
      return null
    }

    // Also validate userId to prevent database errors
    if (!this.isValidUUID(userId)) {
      // Skipping sub-agent lookup for non-UUID user
      return null
    }

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', userId)
      .eq('is_sub_agent', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching sub-agent:', error)
      throw new Error(`Failed to fetch sub-agent: ${error.message}`)
    }

    return this.mapDatabaseAgentToSubAgent(data)
  }

  /**
   * Update a sub-agent
   */
  static async updateSubAgent(
    agentId: string,
    userId: string,
    updates: Partial<SubAgentData>
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('update_sub_agent', {
      p_agent_id: agentId,
      p_user_id: userId,
      p_name: updates.name || null,
      p_description: updates.description || null,
      p_system_prompt: updates.systemPrompt || null,
      p_model: updates.model || null,
      p_config: updates.config || null
    })

    if (error) {
      console.error('Error updating sub-agent:', error)
      throw new Error(`Failed to update sub-agent: ${error.message}`)
    }

    return data
  }

  /**
   * Delete (soft delete) a sub-agent
   */
  static async deleteSubAgent(agentId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('delete_sub_agent', {
      p_agent_id: agentId,
      p_user_id: userId
    })

    if (error) {
      console.error('Error deleting sub-agent:', error)
      throw new Error(`Failed to delete sub-agent: ${error.message}`)
    }

    return data
  }

  /**
   * Get statistics about sub-agents for a user
   */
  static async getSubAgentStatistics(userId: string): Promise<{
    totalSubAgents: number
    subAgentsByParent: Record<string, number>
    createdToday: number
  }> {
    // If userId is not a valid UUID, return empty statistics
    if (!this.isValidUUID(userId)) {
      // Skipping statistics for non-UUID user
      return {
        totalSubAgents: 0,
        subAgentsByParent: {},
        createdToday: 0
      }
    }

    // Get all sub-agents for the user
    const { data: subAgents, error } = await supabase
      .from('agents')
      .select('parent_agent_id, created_at')
      .eq('user_id', userId)
      .eq('is_sub_agent', true)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching sub-agent statistics:', error)
      throw new Error(`Failed to fetch sub-agent statistics: ${error.message}`)
    }

    const totalSubAgents = subAgents.length
    const subAgentsByParent: Record<string, number> = {}
    const today = new Date().toISOString().split('T')[0]
    const createdToday = subAgents.filter(agent => 
      agent.created_at.startsWith(today)
    ).length

    // Count sub-agents by parent
    subAgents.forEach(agent => {
      const parentId = agent.parent_agent_id
      subAgentsByParent[parentId] = (subAgentsByParent[parentId] || 0) + 1
    })

    return {
      totalSubAgents,
      subAgentsByParent,
      createdToday
    }
  }

  /**
   * Map database agent record to SubAgent interface
   */
  private static mapDatabaseAgentToSubAgent(dbAgent: any): SubAgent {
    return {
      id: dbAgent.id,
      name: dbAgent.name,
      description: dbAgent.description || '',
      parentAgentId: dbAgent.parent_agent_id,
      isSubAgent: dbAgent.is_sub_agent,
      delegationToolName: dbAgent.delegation_tool_name,
      subAgentConfig: dbAgent.sub_agent_config || {},
      systemPrompt: dbAgent.system_prompt,
      model: dbAgent.model,
      temperature: parseFloat(dbAgent.temperature || '0.7'),
      maxTokens: dbAgent.max_tokens || 4096,
      createdAt: dbAgent.created_at,
      isActive: dbAgent.is_active,
      createdBy: 'database'
    }
  }

  /**
   * Validate if a user can access a parent agent
   */
  static async validateParentAgentAccess(
    parentAgentId: string,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .eq('id', parentAgentId)
      .eq('user_id', userId)
      .eq('is_sub_agent', false)
      .single()

    if (error) {
      return false
    }

    return !!data
  }
}
