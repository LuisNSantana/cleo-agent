/**
 * Agents API Routes
 * Handles CRUD operations for the multi-agent system
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { ensureDelegationToolForAgent } from '@/lib/tools'
import { APU_AGENT, WEX_AGENT, PETER_AGENT } from '@/lib/agents/config'
import { ALL_PREDEFINED_AGENTS } from '@/lib/agents/predefined'
import { AgentRegistry } from '@/lib/agents/registry'

export async function GET(request: NextRequest) {
  try {
  const url = new URL(request.url)
  const includeParam = url.searchParams.get('includeSubAgents')
  const includeSubAgents = includeParam === '1' || includeParam === 'true'
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  logger.debug('Current user ID:', user.id)

    // OPTIMIZED APPROACH: Hybrid architecture
    // 1. Default agents from local config (immutable, fast)
    // 2. User agents from database (mutable, personalized)
    
    // Get user-created agents from database ONLY
    const { data: userAgents, error: userAgentsError } = await supabase
      .from('agents' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_sub_agent', false) // only top-level agents here by default
      .order('created_at', { ascending: false })

    if (userAgentsError) {
      logger.error('Error fetching user agents:', userAgentsError)
      return NextResponse.json({ error: 'Failed to fetch user agents' }, { status: 500 })
    }

    logger.debug('User agents from DB:', userAgents?.length || 0)

    // Create hybrid agent list: Local defaults + User agents
    const enrichedAgents: any[] = []
    
    // 1. Add predefined agents from local config
    const predefinedList = includeSubAgents
      ? ALL_PREDEFINED_AGENTS
      : ALL_PREDEFINED_AGENTS.filter(a => !a.isSubAgent)

    for (const cfg of predefinedList) {
      enrichedAgents.push({
        id: cfg.id,
        name: cfg.name,
        description: cfg.description,
        role: cfg.role,
        model: cfg.model,
        temperature: cfg.temperature,
        max_tokens: cfg.maxTokens,
        color: cfg.color,
        icon: cfg.icon,
        tags: cfg.tags,
        tools: cfg.tools,
        predefined: true,
        is_default: true,
        immutable: true, // Cannot be modified
        priority: 50, // Default priority for local agents
        is_active: true,
        source: 'local', // Indicates this is from local config
        updated_at: new Date().toISOString(),
        // Sub-agent hints for UI
        is_sub_agent: !!cfg.isSubAgent,
        parent_agent_id: cfg.parentAgentId || null,
        system_prompt: cfg.prompt
      })
    }

  // 2. Add user-created agents from database (exclude those with same names as predefined)
    const predefinedNames = new Set(ALL_PREDEFINED_AGENTS.map(cfg => cfg.name.toLowerCase()))
    
    if (userAgents && userAgents.length > 0) {
      for (const agent of userAgents) {
        // Skip user agents that have the same name as predefined agents
        if (predefinedNames.has((agent as any).name?.toLowerCase())) {
          console.log(`Skipping duplicate user agent: ${(agent as any).name}`)
          continue
        }
        
        enrichedAgents.push({
          ...(agent as any),
          predefined: false,
          is_default: false,
          immutable: false, // User agents can be modified
          source: 'database' // Indicates this is from database
        })
      }
    }

    // 2b. Optionally include user sub-agents from DB
    if (includeSubAgents) {
      const { data: userSubs, error: userSubsError } = await supabase
        .from('agents' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_sub_agent', true)
        .order('created_at', { ascending: false })

      if (userSubsError) {
        console.error('Error fetching user sub-agents:', userSubsError)
      } else if (userSubs && userSubs.length > 0) {
        for (const agent of userSubs) {
          enrichedAgents.push({
            ...(agent as any),
            predefined: false,
            is_default: false,
            immutable: false,
            source: 'database'
          })
        }
      }
    }

    // 3. Sort agents: predefined first, then user agents by creation date
    enrichedAgents.sort((a, b) => {
  if (a.predefined && !b.predefined) return -1
      if (!a.predefined && b.predefined) return 1
      if (a.predefined && b.predefined) return a.priority - b.priority
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  logger.debug('Total agents returned:', enrichedAgents.length, 
        '(predefined:', enrichedAgents.filter(a => a.predefined).length, 
        'user:', enrichedAgents.filter(a => !a.predefined).length, 
        'includeSubAgents:', includeSubAgents, ')')

    // 4. Transform to frontend format
    const transformedAgents = enrichedAgents.map((agent: any) => ({
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
      isDefault: agent.predefined || agent.is_default,
      immutable: agent.immutable || agent.predefined, // Predefined agents are immutable
      priority: agent.priority || 50,
      updatedAt: agent.updated_at,
      source: agent.source, // 'local' or 'database'
      // Sub-agent fields
      parentAgentId: agent.parent_agent_id || null,
      isSubAgent: !!agent.is_sub_agent
    }))

    return NextResponse.json({ 
      agents: transformedAgents,
      total: transformedAgents.length,
      defaultCount: transformedAgents.filter((a: any) => a.isDefault).length,
      customCount: transformedAgents.filter((a: any) => !a.isDefault).length,
      performance: {
        optimized: true,
        source: 'hybrid_architecture',
        db_queries: 1, // Only one DB query for user agents
        local_agents: ALL_PREDEFINED_AGENTS.length
      }
    })

  } catch (error) {
    logger.error('Agents API error:', error)
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

    // Check that name is not a reserved predefined agent name
    const reservedNames = ALL_PREDEFINED_AGENTS.map(a => a.name.toLowerCase())
    if (reservedNames.includes(name.toLowerCase())) {
      return NextResponse.json({ 
        error: `Agent name '${name}' is reserved. Please choose a different name.` 
      }, { status: 400 })
    }

    // Check agent limit for user-created agents only
    const { count: agentCount, error: countError } = await supabase
      .from('agents' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (countError) {
      logger.error('Error checking agent count:', countError)
      return NextResponse.json({ 
        error: 'Failed to check agent limit' 
      }, { status: 500 })
    }

    if (agentCount && agentCount >= 10) {
      return NextResponse.json({ 
        error: 'Agent limit reached. Maximum 10 custom agents allowed.' 
      }, { status: 400 })
    }

    // Validate parentAgentId if provided
    if (parentAgentId) {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      
      if (!uuidRegex.test(parentAgentId)) {
        return NextResponse.json({ error: 'Invalid parentAgentId format' }, { status: 400 })
      }

      // Verify parent exists and is accessible (either user's agent or predefined)
      const { data: parentRaw, error: parentErr } = await supabase
        .from('agents' as any)
        .select('id,user_id,is_sub_agent,is_active,name')
        .eq('id', parentAgentId)
        .single()

      if (parentErr || !parentRaw) {
        return NextResponse.json({ error: 'Parent agent not found' }, { status: 400 })
      }

      const parent = parentRaw as any
      if (parent.user_id !== user.id) {
        return NextResponse.json({ error: 'Parent agent does not belong to current user' }, { status: 403 })
      }
      if (parent.is_sub_agent) {
        return NextResponse.json({ error: 'Sub-agents cannot be parents' }, { status: 400 })
      }
      if (!parent.is_active) {
        return NextResponse.json({ error: 'Parent agent is inactive' }, { status: 400 })
      }
    }

    // Check for duplicate names (case-insensitive)
    const { count: dupCount, error: dupErr } = await supabase
      .from('agents' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .ilike('name', name)

    if (!dupErr && (dupCount || 0) > 0) {
      return NextResponse.json({ 
        error: 'An agent with this name already exists. Please choose another name.' 
      }, { status: 409 })
    }

    // Create new user agent
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
        predefined: false,
        immutable: false,
        is_active: true,
        priority: 5,
        // Sub-agent fields
        is_sub_agent: !!parentAgentId,
        parent_agent_id: parentAgentId || null
      })
      .select()
      .single()

    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json({ error: 'Agent name already exists' }, { status: 409 })
      }
      logger.error('Error creating agent:', error)
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
      isDefault: false,
      immutable: false,
      priority: agent.priority,
      source: 'database',
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      isSubAgent: !!agent.parent_agent_id,
      parentAgentId: agent.parent_agent_id || null
    }

  logger.info('Created new user agent:', transformedAgent.name, 'ID:', transformedAgent.id)

    return NextResponse.json({ agent: transformedAgent }, { status: 201 })

  } catch (error) {
    logger.error('Create agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
