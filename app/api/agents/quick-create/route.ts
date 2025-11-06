/**
 * Quick Create Agent API Route
 * End-to-end rapid creation: persist agent -> register runtime -> create chat -> seed greetings.
 * Returns { agent, chatId } so UI can redirect instantly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { AgentRole, CreateAgentRequest } from '@/lib/agents/types'
import { getUnifiedAgentService } from '@/lib/agents/unified-service'
import { registerRuntimeAgent } from '@/lib/agents/orchestrator-adapter'
import { createClient } from '@/lib/supabase/server'
import { normalizeModelId } from '@/lib/openproviders/provider-map'

export const runtime = 'nodejs'
export const maxDuration = 30

function sanitize(str: string, max = 4000) {
  return String(str || '').trim().slice(0, max)
}

const DEFAULT_ICON_POOL = ['🤖','🧠','🚀','🔍','🛠️','📊','📦','🧪','📎','🛰️']

function pickIcon(seed?: string) {
  if (!seed) return DEFAULT_ICON_POOL[Math.floor(Math.random()*DEFAULT_ICON_POOL.length)]
  let hash = 0
  for (let i=0;i<seed.length;i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return DEFAULT_ICON_POOL[hash % DEFAULT_ICON_POOL.length]
}

export async function POST(req: NextRequest) {
  try {
    const body: Partial<CreateAgentRequest & { color?: string; icon?: string; quickTemplate?: string }> = await req.json()
    const { name, description, role, model, tools, prompt, color, icon, quickTemplate } = body

    // Basic validation
    if (!name || !model) {
      return NextResponse.json({ error: 'Missing required fields: name, model' }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const unified = getUnifiedAgentService()

    // Build system prompt fast with optional template shortcuts
    let systemPrompt = prompt?.trim()
    if (!systemPrompt) {
      const baseDesc = description || 'An efficient AI specialist.'
      switch (quickTemplate) {
        case 'research':
          systemPrompt = `You are ${name}, a research synthesis specialist. Be concise, cite sources as bullet points, highlight contradictions. ${baseDesc}`
          break
        case 'planner':
          systemPrompt = `You are ${name}, a strategic planning agent. Break objectives into milestones, add risk notes, ask clarifying questions first. ${baseDesc}`
          break
        case 'writer':
          systemPrompt = `You are ${name}, a high-quality writing assistant. Maintain user voice, propose structure first, then refine iteratively. ${baseDesc}`
          break
        default:
          systemPrompt = `You are ${name}. ${baseDesc} Respond with clarity and take initiative proposing next steps.`
      }
    }

    const agentRole: AgentRole = role || 'specialist'
    const normalizedModel = normalizeModelId(model)

    // Prepare unified agent insert
    const newAgentUnified = await unified.createAgent({
      userId,
      name: sanitize(name, 100),
      description: sanitize(description || '', 2000),
      role: agentRole,
      model: normalizedModel,
      temperature: 0.7,
      maxTokens: 4000,
      tools: (tools || []).slice(0, 25),
      systemPrompt: sanitize(systemPrompt, 8000),
      color: color || '#6366f1',
      icon: icon || pickIcon(name),
      isActive: true,
      isDefault: false,
      priority: 5,
    })

    if (!newAgentUnified) {
      return NextResponse.json({ error: 'Failed to persist agent' }, { status: 500 })
    }

    // Runtime registration for immediate availability
    registerRuntimeAgent({
      id: newAgentUnified.id,
      name: newAgentUnified.name,
      description: newAgentUnified.description || '',
      role: agentRole,
      model: newAgentUnified.model,
      temperature: newAgentUnified.temperature || 0.7,
      maxTokens: newAgentUnified.maxTokens || 4000,
      tools: newAgentUnified.tools || [],
      prompt: newAgentUnified.systemPrompt,
      color: newAgentUnified.color || '#6366f1',
      icon: newAgentUnified.icon || pickIcon(name),
      immutable: false,
      predefined: false,
      dynamic: true,
      userId,
    })

    // Create chat for onboarding
    const chatInsert = await supabase.from('chats').insert({
      user_id: userId,
      title: `${newAgentUnified.name} · Primer contacto`,
      model: normalizedModel,
      system_prompt: systemPrompt,
    }).select('*').single()

    if (chatInsert.error || !chatInsert.data) {
      return NextResponse.json({ error: 'Agent created but failed to create chat' }, { status: 500 })
    }

    const chatId = chatInsert.data.id

    // Seed greeting messages into both messages AND agent_messages (for context loader)
    const nowIso = new Date().toISOString()
    const greeting1 = `✅ Agente "${newAgentUnified.name}" desplegado. Puede ayudarte con: ${newAgentUnified.description || 'tareas especializadas.'} Configurado con modelo ${normalizedModel}.`
    const greeting2 = `👋 Hola, soy ${newAgentUnified.name}. Estoy listo para ayudarte. ¿Cuál es tu primer objetivo?`

    const baseMessages = [greeting1, greeting2]
    const messageRows = baseMessages.map(content => ({
      chat_id: chatId,
      role: 'assistant' as const,
      content,
      created_at: nowIso,
      model: normalizedModel,
      user_id: userId,
      message_group_id: null as any,
      experimental_attachments: null as any,
    }))

    const { error: msgError } = await supabase.from('messages').insert(messageRows as any)
    if (msgError) {
      console.error('[quick-create-agent] Failed inserting greetings into messages:', msgError)
    }

    // Also persist into agent_messages so the smart loader can reconstruct history on first user message
    try {
      const agentMessageRows = baseMessages.map(content => ({
        thread_id: chatId, // chatId acts as thread identifier
        user_id: userId,
        role: 'assistant',
        content,
        metadata: {
          source: 'quick-create-onboarding',
          agent_id: newAgentUnified.id,
          model: normalizedModel,
          chat_id: chatId,
          onboarding: true,
        },
        created_at: nowIso,
      }))
      const { error: agentMsgError } = await (supabase as any).from('agent_messages').insert(agentMessageRows)
      if (agentMsgError) {
        console.error('[quick-create-agent] Failed inserting greetings into agent_messages:', agentMsgError)
      }
    } catch (e) {
      console.error('[quick-create-agent] Exception inserting agent_messages greetings:', e)
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: newAgentUnified.id,
        name: newAgentUnified.name,
        icon: newAgentUnified.icon,
        color: newAgentUnified.color,
        model: newAgentUnified.model,
      },
      chatId,
    })
  } catch (err: any) {
    console.error('[quick-create-agent] error', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
