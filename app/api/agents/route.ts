/**
 * Agents API Routes
 * Handles CRUD operations for the multi-agent system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Use direct table query to get agents
    const { data: agents, error } = await supabase
      .from('agents' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Transform to match frontend format
    const transformedAgents = (agents || []).map((agent: any) => ({
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
      updatedAt: agent.updated_at
    }))

    return NextResponse.json({ 
      agents: transformedAgents,
      total: transformedAgents.length,
      defaultCount: transformedAgents.filter((a: any) => a.isDefault).length,
      customCount: transformedAgents.filter((a: any) => !a.isDefault).length
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
    const { name, description, role, model, systemPrompt, color, icon, tags, tools, temperature, maxTokens } = body
    
    if (!name || !role || !model || !systemPrompt) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, role, model, systemPrompt' 
      }, { status: 400 })
    }

    // Check agent limit first
    const { data: existingAgents } = await supabase
      .from('agents' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', false)
      .eq('is_active', true)

    if (existingAgents && existingAgents.length >= 10) {
      return NextResponse.json({ 
        error: 'Agent limit reached. Maximum 10 custom agents allowed (plus default agents).' 
      }, { status: 400 })
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
        priority: 5
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating agent:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to create agent' 
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
      updatedAt: agent.updated_at
    }

    return NextResponse.json({ agent: transformedAgent }, { status: 201 })

  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
