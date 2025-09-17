import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerAgentUpdated, triggerAgentDeleted } from '@/lib/agents/auto-sync'

// PUT /api/agents/:id - Update an agent (partial)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await request.json()

    // Disallow making a sub-agent a parent or creating cycles
    if (body.parentAgentId) {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      if (!uuidRegex.test(body.parentAgentId)) {
        return NextResponse.json({ error: 'Invalid parentAgentId' }, { status: 400 })
      }
      const { data: parentRaw, error: parentErr } = await supabase
        .from('agents' as any)
        .select('id,user_id,is_sub_agent,is_active')
        .eq('id', body.parentAgentId)
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

    // Verify target agent ownership
    const { data: targetRaw, error: targetErr } = await supabase
      .from('agents' as any)
      .select('id,user_id')
      .eq('id', id)
      .single()
    const target: any = targetRaw as any
    if (targetErr || !target || target.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Map body to DB fields
    const updates: any = {}
    if (typeof body.name === 'string') updates.name = body.name
    if (typeof body.description === 'string') updates.description = body.description
    if (typeof body.role === 'string') updates.role = body.role
    if (typeof body.model === 'string') updates.model = body.model
    if (typeof body.temperature === 'number') updates.temperature = body.temperature
    if (typeof body.maxTokens === 'number') updates.max_tokens = body.maxTokens
    if (typeof body.color === 'string') updates.color = body.color
    if (typeof body.icon === 'string') updates.icon = body.icon
    if (Array.isArray(body.tags)) updates.tags = body.tags
    if (Array.isArray(body.tools)) updates.tools = body.tools
    if (typeof body.prompt === 'string') updates.system_prompt = body.prompt
    if (body.parentAgentId === '' || body.parentAgentId === null) {
      updates.parent_agent_id = null
      updates.is_sub_agent = false
    } else if (typeof body.parentAgentId === 'string') {
      updates.parent_agent_id = body.parentAgentId
      updates.is_sub_agent = true
    }

  const { data: updated, error } = await supabase
      .from('agents' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update agent error:', error)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    // Refresh delegation relationships (safe no-op if not a sub-agent)
    try {
      await (supabase as any).rpc('safe_setup_agent_delegation', {
        agent_id: id,
        user_id: user.id
      })
    } catch (e) {
      console.warn('safe_setup_agent_delegation failed after update:', e)
    }

    // 🚀 TRIGGER AUTO-SYNC: Update delegation tools after agent modification
    await triggerAgentUpdated(id, user.id, (updated as any)?.name || 'Unknown Agent')

    return NextResponse.json({ agent: updated })
  } catch (e) {
    console.error('PUT /api/agents/:id error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/agents/:id - Soft delete agent
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Ensure ownership
    const { data: agentRaw, error: agentErr } = await supabase
      .from('agents' as any)
      .select('id,user_id,is_default')
      .eq('id', id)
      .single()
    const agent: any = agentRaw as any
    if (agentErr || !agent || agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Disallow deleting default agents
    if (agent.is_default === true) {
      return NextResponse.json({ error: 'Default agents cannot be deleted' }, { status: 403 })
    }

  const { error } = await supabase
      .from('agents' as any)
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Delete agent error:', error)
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
    }

    // 🚀 TRIGGER AUTO-SYNC: Update delegation tools after agent deletion
    await triggerAgentDeleted(id, user.id, 'Deleted Agent')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/agents/:id error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
