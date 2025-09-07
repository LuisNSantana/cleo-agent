/**
 * Agents API Routes
 * Handles CRUD operations for the multi-agent system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureDelegationToolForAgent } from '@/lib/tools'
import { APU_AGENT, WEX_AGENT } from '@/lib/agents/config'

export async function GET() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  // Get all active agents for this user (include defaults and custom)
  const { data: agents, error } = await supabase
      .from('agents' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // If any are sub-agents, fetch their parent names to help the client map to built-in IDs
    const subAgents = (agents || []).filter((a: any) => !!a.parent_agent_id)
    const parentIds: string[] = Array.from(new Set(subAgents.map((a: any) => a.parent_agent_id)))
    let parentMap = new Map<string, any>()
    if (parentIds.length > 0) {
      const parentsRes: any = await supabase
        .from('agents' as any)
        .select('id,name,is_default')
        .in('id', parentIds)
      const parentErr = parentsRes?.error
      const parents: any[] = parentsRes?.data || []
      if (!parentErr && Array.isArray(parents)) {
        for (const p of parents) parentMap.set(p.id, p)
      } else if (parentErr) {
        console.warn('Could not fetch parent agents for sub-agents:', parentErr)
      }
    }

    // Build a map of parentId -> Set of delegation tool names derived from existing sub-agents
    // This ensures parents expose delegate_to_* tools for all their sub-agents
    const childToolsByParent = new Map<string, Set<string>>()
    try {
      const agentsList: any[] = Array.isArray(agents) ? (agents as any[]) : []
      for (const a of agentsList) {
        if (a?.is_sub_agent && a?.parent_agent_id) {
          // Prefer explicit DB column if present; otherwise create/register a runtime tool by id
          const toolName = (a as any).delegation_tool_name && typeof (a as any).delegation_tool_name === 'string'
            ? (a as any).delegation_tool_name
            : ensureDelegationToolForAgent(a.id, a.name)
          if (!childToolsByParent.has(a.parent_agent_id)) childToolsByParent.set(a.parent_agent_id, new Set<string>())
          childToolsByParent.get(a.parent_agent_id)!.add(toolName)
        }
      }
    } catch (mapErr) {
      console.warn('Could not construct child delegation tools map:', mapErr)
    }

    // Build parent candidates list (eligible parents): include defaults and customs, only active and not sub-agents
    let parentCandidates: Array<{ id: string; name: string; isDefault: boolean }> = []
    try {
      const parentsAllRes: any = await supabase
        .from('agents' as any)
        .select('id,name,is_default,is_active,is_sub_agent,user_id')
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .eq('is_active', true)
        .eq('is_sub_agent', false)
        .order('is_default', { ascending: false })
      const parentsAllErr = parentsAllRes?.error
      const parentsAll: any[] = parentsAllRes?.data || []
      if (!parentsAllErr && Array.isArray(parentsAll)) {
        parentCandidates = parentsAll.map((p: any) => ({ id: p.id, name: p.name, isDefault: !!p.is_default }))
      } else if (parentsAllErr) {
        console.warn('Could not fetch parent candidates:', parentsAllErr)
      }
    } catch (pcErr) {
      console.warn('Parent candidates query failed:', pcErr)
    }

    // Helper: map parent name to built-in client ID
    const builtinIdByName = (name?: string | null) => {
      if (!name) return null
      const n = name.toLowerCase()
      if (n === 'cleo') return 'cleo-supervisor'
      if (n === 'toby') return 'toby-technical'
      if (n === 'ami') return 'ami-creative'
      if (n === 'peter') return 'peter-logical'
      if (n === 'emma') return 'emma-ecommerce'
      if (n === 'apu') return 'apu-research'
      if (n === 'wex') return 'wex-automation'
      return null
    }

    // Helper: get builtin config by human-readable name
    const builtinConfigByName = (name?: string | null) => {
      const id = builtinIdByName(name)
      if (id === 'apu-research') return APU_AGENT
      if (id === 'wex-automation') return WEX_AGENT
      return null
    }

    // Transform to match frontend format and include parent mapping hints
  const transformedAgents = (Array.isArray(agents) ? (agents as any[]) : []).map((agent: any) => {
      // Merge base tools with dynamic delegation tools from children (if this is a parent)
      let baseTools: string[] = Array.isArray(agent.tools) ? agent.tools : []
      // Fallback: if default agent with no tools in DB, use builtin config tools
      if ((!baseTools || baseTools.length === 0) && agent.is_default) {
        const builtin = builtinConfigByName(agent.name)
        if (builtin?.tools?.length) baseTools = builtin.tools
      }
      const childTools = childToolsByParent.get(agent.id)
      const mergedTools = childTools ? Array.from(new Set([...(baseTools || []), ...Array.from(childTools)])) : baseTools

      // Resolve sub-agent specific fields
      const isSub = !!agent.is_sub_agent
      const delegationToolName = isSub
        ? ((agent as any).delegation_tool_name && typeof (agent as any).delegation_tool_name === 'string'
            ? (agent as any).delegation_tool_name
            : ensureDelegationToolForAgent(agent.id, agent.name))
        : null

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens,
        color: agent.color,
        icon: agent.icon,
        // Fallback: if default agent with empty tags, use builtin tags
        tags: (() => {
          const t: string[] = Array.isArray(agent.tags) ? agent.tags : []
          if (t.length) return t
          if (agent.is_default) {
            const builtin = builtinConfigByName(agent.name)
            if (builtin?.tags?.length) return builtin.tags
          }
          return []
        })(),
        prompt: agent.system_prompt,
        tools: mergedTools,
        isDefault: agent.is_default,
        priority: agent.priority,
        updatedAt: agent.updated_at,
        // Sub-agent fields
        parentAgentId: agent.parent_agent_id || null,
        isSubAgent: isSub,
        delegationToolName, // helps UI/tooling know the exact tool to call
        parentAgentName: (agent.parent_agent_id && parentMap.get(agent.parent_agent_id)?.name) || null,
        parentAgentClientId: (() => {
          if (!agent.parent_agent_id) return null
          const parent = parentMap.get(agent.parent_agent_id)
          return builtinIdByName(parent?.name) || parent?.id || null
        })()
      }
    })

    return NextResponse.json({ 
      agents: transformedAgents,
      total: transformedAgents.length,
      defaultCount: transformedAgents.filter((a: any) => a.isDefault).length,
      customCount: transformedAgents.filter((a: any) => !a.isDefault).length,
      parentCandidates
    })

  } catch (error) {
    console.error('Agents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const body = await request.json()
    
    // Validate required fields
  const { name, description, role, model, systemPrompt, color, icon, tags, tools, temperature, maxTokens, parentAgentId } = body
    
    if (!name || !role || !model || !systemPrompt) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, role, model, systemPrompt' 
      }, { status: 400 })
    }

    // Check agent limit first with a more robust query
    const { count: agentCount, error: countError } = await supabase
      .from('agents' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_default', false)
      .eq('is_active', true)

    if (countError) {
      console.error('Error checking agent count:', countError)
      return NextResponse.json({ 
        error: 'Failed to check agent limit' 
      }, { status: 500 })
    }

    if (agentCount && agentCount >= 10) {
      return NextResponse.json({ 
        error: 'Agent limit reached. Maximum 10 custom agents allowed (plus default agents).' 
      }, { status: 400 })
    }

    // Validate parentAgentId (must be UUID if provided)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    const parentIdValid = parentAgentId ? uuidRegex.test(parentAgentId) : false

    if (parentAgentId && !parentIdValid) {
      return NextResponse.json({ error: 'Invalid parentAgentId: must be a UUID' }, { status: 400 })
    }

    // If parent provided, verify it belongs to the same user, is active, and is NOT a sub-agent
    if (parentIdValid) {
      const { data: parentRaw, error: parentErr } = await supabase
        .from('agents' as any)
        .select('id,user_id,is_sub_agent,is_active')
        .eq('id', parentAgentId)
        .single()
      const parent: any = parentRaw as any
      if (parentErr || !parent) {
        return NextResponse.json({ error: 'Parent agent not found' }, { status: 400 })
      }
      if (parent.user_id !== user.id) {
        return NextResponse.json({ error: 'Parent agent does not belong to current user' }, { status: 403 })
      }
      if (parent.is_sub_agent) {
        return NextResponse.json({ error: 'A sub-agent cannot be selected as parent' }, { status: 400 })
      }
      if (parent.is_active === false) {
        return NextResponse.json({ error: 'Parent agent is inactive' }, { status: 400 })
      }
    }

    // Prevent duplicate active names (case-insensitive) for this user
    try {
      const { count: dupCount, error: dupErr } = await supabase
        .from('agents' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .ilike('name', name)
      if (!dupErr && (dupCount || 0) > 0) {
        return NextResponse.json({ error: 'An agent with this name already exists. Please choose another name.' }, { status: 409 })
      }
    } catch (dupCheckErr) {
      console.warn('Duplicate name pre-check failed:', dupCheckErr)
    }

  // Create new agent directly
  const { data: newAgent, error } = await supabase
      .from('agents' as any)
      .insert({
        user_id: user.id,
        name,
        description: description || '',
        role,
        model,
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 4096,
        color: color || '#6366f1',
        icon: icon || 'robot',
        tags: tags || [],
        system_prompt: systemPrompt,
        tools: tools || [],
        is_default: false,
        is_active: true,
        priority: 5,
  // Sub-agent configuration
  is_sub_agent: parentIdValid ? true : false,
  parent_agent_id: parentIdValid ? parentAgentId : null
      })
      .select()
      .single()

    if (error) {
      // Unique name per user violation
      if ((error as any).code === '23505') {
        return NextResponse.json({ error: 'Agent name already exists for this user' }, { status: 409 })
      }
      console.error('Error creating agent:', error)
      return NextResponse.json({ 
        error: (error as any).message || 'Failed to create agent' 
      }, { status: 500 })
    }

    // Transform response to match frontend format
  const agent = newAgent as any
    const transformedAgent = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      role: agent.role,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.max_tokens,
      color: agent.color,
      icon: agent.icon,
      tags: agent.tags || [],
      prompt: agent.system_prompt,
      tools: agent.tools || [],
      isDefault: agent.is_default,
      priority: agent.priority,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      // Sub-agent fields for immediate client usage
      isSubAgent: !!agent.parent_agent_id,
      parentAgentId: agent.parent_agent_id || null
    }

  // Setup delegation relationships using the safe database function
    try {
      const toolName = ensureDelegationToolForAgent(transformedAgent.id, transformedAgent.name)

      // Persist the delegation tool on parent if this is a sub-agent
      if (parentIdValid) {
        const { data: parentRaw } = await supabase
          .from('agents' as any)
          .select('id,tools')
          .eq('id', parentAgentId)
          .single()
        const parent: any = parentRaw as any
        const currentTools: string[] = Array.isArray(parent?.tools) ? parent.tools : []
        if (!currentTools.includes(toolName)) {
          const nextTools = Array.from(new Set([...(currentTools || []), toolName]))
          const { error: updateParentErr } = await supabase
            .from('agents' as any)
            .update({ tools: nextTools })
            .eq('id', parentAgentId)
          if (updateParentErr) {
            console.warn('Could not persist delegation tool to parent:', updateParentErr)
          }
        }
      }

      // Call the safe delegation setup function (no-op if not sub-agent)
      const { error: delegationError } = await (supabase as any).rpc('safe_setup_agent_delegation', {
        agent_id: transformedAgent.id,
        user_id: user.id
      })
      if (delegationError) {
        console.warn('Warning: Could not setup delegation relationships:', delegationError)
      }
    } catch (delegationErr) {
      console.warn('Warning: Could not setup dynamic delegation or persist tool:', delegationErr)
    }

    return NextResponse.json({ agent: transformedAgent }, { status: 201 })

  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
