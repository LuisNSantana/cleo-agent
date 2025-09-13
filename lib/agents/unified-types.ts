import { Database } from '@/lib/database.types'

// Unified agent type that works with both static and dynamic agents
export interface UnifiedAgent {
  id: string
  name: string
  description: string | null
  role: string
  model: string
  temperature: number | null
  maxTokens: number | null
  tools: string[] | null
  systemPrompt: string
  color: string | null
  icon: string | null
  canDelegate: boolean | null
  isActive: boolean | null
  isDefault: boolean | null
  priority: number | null
  tags: string[] | null
  isSubAgent: boolean | null
  parentAgentId: string | null
  userId: string | null
  createdAt: string | null
  updatedAt: string | null
}

// Database agent type
export type DatabaseAgent = Database['public']['Tables']['agents']['Row']

// Transform database agent to unified agent
export function transformDatabaseAgent(dbAgent: DatabaseAgent): UnifiedAgent {
  return {
    id: dbAgent.id,
    name: dbAgent.name,
    description: dbAgent.description,
    role: dbAgent.role,
    model: dbAgent.model,
    temperature: dbAgent.temperature,
    maxTokens: dbAgent.max_tokens,
    tools: dbAgent.tools,
    systemPrompt: dbAgent.system_prompt,
    color: dbAgent.color,
    icon: dbAgent.icon,
    canDelegate: dbAgent.can_delegate,
    isActive: dbAgent.is_active,
    isDefault: dbAgent.is_default,
    priority: dbAgent.priority,
    tags: dbAgent.tags,
    isSubAgent: (dbAgent as any).is_sub_agent || false,
    parentAgentId: (dbAgent as any).parent_agent_id || null,
    userId: dbAgent.user_id,
    createdAt: dbAgent.created_at,
    updatedAt: dbAgent.updated_at
  }
}

// Transform unified agent to database insert format
export function transformToInsertAgent(agent: Partial<UnifiedAgent>): Database['public']['Tables']['agents']['Insert'] {
  return {
    name: agent.name!,
    description: agent.description,
    role: agent.role!,
    model: agent.model!,
    temperature: agent.temperature,
    max_tokens: agent.maxTokens,
    tools: agent.tools,
    system_prompt: agent.systemPrompt!,
    color: agent.color,
    icon: agent.icon,
    can_delegate: agent.canDelegate,
    is_active: agent.isActive,
    is_default: agent.isDefault,
    priority: agent.priority,
    tags: agent.tags,
    is_sub_agent: agent.isSubAgent || false,
    parent_agent_id: agent.parentAgentId || null,
    user_id: agent.userId!
  }
}

// Legacy agent config type for backward compatibility during migration
export interface LegacyAgentConfig {
  id: string
  name: string
  description: string
  role: 'supervisor' | 'specialist' | 'worker' | 'evaluator'
  model: string
  temperature: number
  maxTokens: number
  tools: string[]
  prompt: string
  color: string
  icon: string
}

// Transform agent config to unified agent
export function transformAgentConfig(agentConfig: any, userId: string): UnifiedAgent {
  return {
    id: agentConfig.id,
    name: agentConfig.name,
    description: agentConfig.description,
    role: agentConfig.role,
    model: agentConfig.model,
    temperature: agentConfig.temperature,
    maxTokens: agentConfig.maxTokens,
    tools: agentConfig.tools,
    systemPrompt: agentConfig.prompt,
    color: agentConfig.color,
    icon: agentConfig.icon,
    canDelegate: agentConfig.role === 'supervisor',
    isActive: true,
    isDefault: true,
    priority: agentConfig.role === 'supervisor' ? 1 : 2,
    tags: [agentConfig.role],
    isSubAgent: agentConfig.isSubAgent || false,
    parentAgentId: agentConfig.parentAgentId || null,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
