import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { retrieveRelevant, buildContextBlock } from '@/lib/rag/retrieve'
import { indexDocument } from '@/lib/rag/index-document'
import { generatePersonalizedPrompt } from '@/lib/prompts/personality'
import { defaultPreferences, type PersonalitySettings } from '@/lib/user-preference-store/utils'
import { getCleoPrompt } from '@/lib/prompts'
import { pickBestAgent, analyzeDelegationIntent } from '@/lib/agents/delegation'
import { detectEarlyIntent } from '@/lib/agents/router'
import { trackFeatureUsage } from '@/lib/analytics'
import { makeDelegationDecision, analyzeTaskComplexity } from '@/lib/agents/complexity-scorer'
import type { AgentConfig } from '@/lib/agents/types'

// Build a dynamic internal hint to steer delegation without exposing it to the user
function buildInternalDelegationHint(userMessage?: string, recommended?: { name: string; toolName?: string; reasons?: string[] }) {
  const base = `\n\nOPTIMIZED AGENT SYSTEM ACTIVE:
🚀 NEW ARCHITECTURE: 68% tool reduction vs legacy system
⚡ SMART ROUTING: Complexity-based delegation (simple=direct, complex=specialist)
🎯 ZERO OVERLAP: Each agent specialized (Ami=admin, Apu=research, Peter=creation, Emma=ecommerce)
🔧 SUB-AGENTS: Hyper-specialized (Astra=email, Notion Agent=workspace)
� PERFORMANCE: ~80% latency reduction for simple queries, better accuracy for complex`
  
  // Use enhanced complexity-based analyzer if we have a user message
  if (userMessage && !recommended) {
    try {
      console.log(`🧠 [OPTIMIZATION] Analyzing: "${userMessage.substring(0, 100)}..."`)
      
      // Use the new complexity scorer
      const delegationDecision = makeDelegationDecision(userMessage)
      const complexity = delegationDecision.complexity
      
      console.log(`📊 [OPTIMIZATION] Score: ${complexity.score}, Route: ${complexity.recommendation}`, {
        shouldDelegate: delegationDecision.shouldDelegate,
        targetAgent: delegationDecision.targetAgent,
        factors: complexity.factors,
        reasoning: delegationDecision.reasoning
      })
      
      if (delegationDecision.shouldDelegate && delegationDecision.targetAgent) {
        // Updated agent mapping for optimized system
        const agentMap: Record<string, string> = {
          'ami': 'delegate_to_ami',          // Admin/coordination
          'peter': 'delegate_to_peter',      // Google Workspace creation
          'emma': 'delegate_to_emma',        // E-commerce
          'apu': 'delegate_to_apu',          // Research & intelligence (consolidated)
          'wex': 'delegate_to_wex',          // Automation
          'astra': 'delegate_to_astra',      // Email specialist (sub-agent)
          'notion-agent': 'delegate_to_notion_agent'  // Notion specialist (sub-agent)
        }
        const toolName = agentMap[delegationDecision.targetAgent]
        
        return `${base}

🎯 SMART DELEGATION DECISION:
- Complexity Score: ${complexity.score}/100 (${complexity.recommendation})
- Target: ${delegationDecision.targetAgent.toUpperCase()} specialist
- Tool: ${toolName}
- Reasoning: ${delegationDecision.reasoning}
- Optimization: Focused specialist vs legacy 25+ tool overload
- Expected: 60-75% better accuracy with domain expertise`
      } else {
        return `${base}

⚡ DIRECT RESPONSE OPTIMIZATION:
- Complexity Score: ${complexity.score}/100 (${complexity.recommendation})
- Route: Direct response (no delegation needed)
- Reasoning: ${delegationDecision.reasoning}
- Performance Gain: ~2-3 seconds saved vs unnecessary delegation
- Optimization: Smart routing prevents over-delegation`
      }
      
    } catch (error) {
      console.warn('⚠️ [OPTIMIZATION] Analysis failed, falling back:', error)
      
      // Fallback to legacy analyzer
      try {
        const analysis = analyzeDelegationIntent(userMessage)
        if (analysis && analysis.confidence > 0.5) {
          console.log(`🎯 [DELEGATION] Legacy fallback detected agent:`, {
            agent: analysis.agentName,
            agentId: analysis.agentId,
            confidence: Math.round(analysis.confidence * 100) + '%'
          })
          const toolPart = ` Use tool: ${analysis.toolName}.`
          const reasonPart = analysis.reasoning.length ? ` Reasons: ${analysis.reasoning.slice(0, 2).join(', ')}.` : ''
          return `${base}\n- Legacy analysis: ${analysis.agentName}.${toolPart}${reasonPart}`
        }
      } catch (legacyError) {
        console.warn('⚠️ [DELEGATION] Legacy analysis also failed:', legacyError)
      }
    }
  }
  
  // Fallback to provided recommendation
  if (recommended) {
    console.log(`📋 [DELEGATION] Using router recommendation:`, recommended)
    // Map leaf tool hints (e.g., Gmail list/get) to actual delegate tools available to Cleo
    const leafToDelegateMap: Record<string, string> = {
      // Gmail triage → Ami delegate
      listGmailMessages: 'delegate_to_ami',
      getGmailMessage: 'delegate_to_ami',
      modifyGmailLabels: 'delegate_to_ami',
      trashGmailMessage: 'delegate_to_ami',
      // Gmail compose/send → Astra delegate
      sendGmailMessage: 'delegate_to_astra',
    }
    let mappedTool = recommended.toolName && leafToDelegateMap[recommended.toolName]
    // Fallback by agent name if tool not provided
    if (!mappedTool && /ami/i.test(recommended.name || '')) mappedTool = 'delegate_to_ami'
    if (!mappedTool && /astra/i.test(recommended.name || '')) mappedTool = 'delegate_to_astra'

    const toolPart = (mappedTool || recommended.toolName)
      ? ` Prefer tool: ${mappedTool || recommended.toolName}.`
      : ''
    const reasonPart = recommended.reasons && recommended.reasons.length ? ` Reasons: ${recommended.reasons.join(', ')}.` : ''
    // Encourage immediate action to avoid "direct_or_clarify" fallthroughs
    const actionPart = mappedTool ? ' Action: Call this tool now; do not answer directly.' : ''
    return `${base}\n- Router recommendation: ${recommended.name}.${toolPart}${reasonPart}${actionPart}`
  }
  
  console.log(`🔄 [DELEGATION] No delegation hints available`)
  return base
}

// High-priority identity header (must be first to survive any trimming)
const CLEO_IDENTITY_HEADER = `CLEO IDENTITY (TOP PRIORITY)
- Priority: This header MUST be the FIRST system instruction and must not be removed or trimmed.
- Name: Cleo
- Organization: Huminary Labs
- Creator statement: If asked who created or trained you, respond exactly: "I am Cleo from Huminary Labs. I was designed and trained by Huminary Labs. I can run locally on open models such as Llama 3.1."
- Prohibited claims: Never say you were created, trained, or owned by OpenAI, Meta, Microsoft, or other third parties.
- Role: An emotionally intelligent, helpful, multitasking assistant focused on simplifying the user's life — assisting with reasoning, writing, and productivity.
- Behavior rules: Be concise, truthful, and user-focused; ask clarifying questions when needed; avoid inventing facts; prefer using provided context and cite sources when applicable.
- Safety: Refuse or safely decline illegal, harmful, or policy-violating requests and offer safe alternatives.
- Language: Reply in the user's language by default unless the user specifies otherwise.
- Size note: Keep this header compact so it survives trimming while preserving the above identity and behavior rules.`

// Compact, model-agnostic directive to standardize agent behavior for reliability and speed
const AGENT_WORKFLOW_DIRECTIVE = `AGENT WORKFLOW (RELIABILITY & SPEED)
- Routing: If an internal router hint is present, you MUST delegate via the matching delegate tool instead of answering directly. Examples: email triage→delegate_to_ami (which will use Gmail list/read), email compose→delegate_to_astra, Google Workspace→delegate_to_peter, Notion→delegate_to_notion_agent.
- Plan-then-act (brief): Form a short plan internally (1–2 steps). Do NOT reveal chain-of-thought; output only final answers and tool results.
- Tool-first: Prefer a single correct tool call. Use at most 3 calls per turn. Stop early when sufficient.
- Safety/timeouts: Keep calls quick; if a tool stalls or partial data is enough, stop and summarize. Ask one concise follow-up only if truly needed.
- Verification: After a tool returns, verify it answers the user’s request; fix trivial gaps; then present a concise result with clear next action.`

export type BuildPromptParams = {
  baseSystemPrompt?: string
  model: string
  messages: Array<{ role: string; content: any }>
  supabase: any | null
  realUserId: string | null
  enableSearch: boolean
  documentId?: string
  debugRag?: boolean
}

export async function buildFinalSystemPrompt(params: BuildPromptParams) {
  const {
    baseSystemPrompt = SYSTEM_PROMPT_DEFAULT,
    model,
    messages,
    supabase,
    realUserId,
    enableSearch,
    documentId,
    debugRag,
  } = params

  console.log(`🔍 buildFinalSystemPrompt called with:`, {
    model,
    hasBaseSystemPrompt: Boolean(baseSystemPrompt),
    baseSystemPromptLength: baseSystemPrompt?.length || 0,
    enableSearch,
    documentId,
  })

  // If a specific baseSystemPrompt is provided, check if it's from frontend with USER ADDENDUM
  // If so, extract the base prompt and apply our optimization logic
  let selectedBasePrompt: string
  
  if (baseSystemPrompt && baseSystemPrompt !== SYSTEM_PROMPT_DEFAULT && !baseSystemPrompt.includes('USER ADDENDUM')) {
    // Use the provided system prompt directly (legacy behavior)
    selectedBasePrompt = baseSystemPrompt
    console.log(`📋 Using provided system prompt (${baseSystemPrompt.length} chars)`)
  } else {
    // Determine the appropriate prompt variant based on the model
    let promptVariant: 'default' | 'local' | 'llama31' | 'cybersecurity' = 'default'
    
    if (model.includes('llama3.1') || model.includes('llama-3.1')) {
      promptVariant = 'llama31' // Use optimized Llama 3.1 prompt
    } else if (model.startsWith('ollama:') || model.includes('local')) {
      promptVariant = 'local' // Use local optimized prompt for other local models
    }

    // Get the appropriate base prompt
    selectedBasePrompt = getCleoPrompt(model, promptVariant)
    
    console.log(`🎯 Using prompt variant: ${promptVariant} for model: ${model}`)
    console.log(`📏 Base prompt length: ${selectedBasePrompt.length} characters`)
    console.log(`📝 Selected prompt preview:`, selectedBasePrompt.substring(0, 200) + '...')

    // If there's a USER ADDENDUM, append it to our optimized prompt
    if (baseSystemPrompt && baseSystemPrompt.includes('USER ADDENDUM')) {
      const addendumMatch = baseSystemPrompt.match(/USER ADDENDUM:\n([\s\S]*)$/)
      if (addendumMatch) {
        selectedBasePrompt += `\n\nUSER ADDENDUM:\n${addendumMatch[1]}`
        console.log(`📋 Appended USER ADDENDUM to optimized prompt`)
      }
    }
  }

  const autoRagEnabled = true
  const retrievalRequested = enableSearch || !!documentId || autoRagEnabled
  let ragSystemAddon = ''

  if (retrievalRequested) {
    try {
      const lastUser = messages.slice().reverse().find((m) => m.role === 'user')
      let userPlain = ''
      if (lastUser) {
        if (typeof lastUser.content === 'string') userPlain = lastUser.content
        else if (Array.isArray(lastUser.content)) {
          userPlain = lastUser.content
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p.text || p.content || '')
            .join('\n')
        }
      }

      if (userPlain.trim()) {
        try {
          const { data: userDocs } = await (supabase as any)
            .from('documents')
            .select('id')
            .eq('user_id', realUserId)
            .limit(1)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[RAG] DEBUG - Has docs?', Boolean(userDocs?.length))
          }
        } catch {}

        // Dynamic sizing: faster models get smaller budgets for speed
        const fastModel = model === 'grok-3-mini'
        const topK = fastModel ? 4 : 6
        let retrieved = await retrieveRelevant({
          userId: realUserId!,
          query: userPlain,
          topK,
          documentId,
          useHybrid: true,
          useReranking: true,
        })

        if (retrieved.length) {
          ragSystemAddon = buildContextBlock(retrieved)
          if (debugRag) console.log('[RAG] Context preview:\n' + ragSystemAddon.slice(0, 400))
        } else {
          if (!documentId && supabase && !fastModel) {
            try {
              const { data: docs } = await (supabase as any)
                .from('documents')
                .select('id, updated_at')
                .eq('user_id', realUserId)
                .order('updated_at', { ascending: false })
                .limit(3)
              if (docs?.length) {
                for (const d of docs) {
                  const { count } = await (supabase as any)
                    .from('document_chunks')
                    .select('id', { count: 'exact', head: true })
                    .eq('document_id', d.id)
                  if (!count || count === 0) {
                    try { await indexDocument(d.id, { force: true }) } catch {}
                  }
                }
                // retry
                retrieved = await retrieveRelevant({
                  userId: realUserId!,
                  query: userPlain,
                  topK,
                  useHybrid: true,
                  useReranking: true,
                })
                if (retrieved.length) ragSystemAddon = buildContextBlock(retrieved)
              }
            } catch {}
          }
        }

  if (!fastModel && ragSystemAddon && ragSystemAddon.trim().length > 0) {
          const currentChunkCount = (ragSystemAddon.match(/\n---\n/g) || []).length
          if (currentChunkCount < 3) {
            try {
              const profileQuery = 'perfil del usuario nombre intereses gustos comida favorita hobbies preferencias biografia datos personales'
              const extra = await retrieveRelevant({
                userId: realUserId!,
                query: profileQuery,
    topK,
                documentId,
                useHybrid: true,
                useReranking: true,
              })
              if (extra.length) {
                const extraBlock = buildContextBlock(extra)
                if (extraBlock && extraBlock.length > 0) ragSystemAddon += '\n' + extraBlock
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error('[RAG] retrieval failed', e)
    }
  }

  // Phase 1: layered router hint (Capa 0 early rules -> capability-based)
  let routerHint: { name: string; toolName?: string; reasons?: string[] } | undefined
  try {
    const lastUser = messages.slice().reverse().find((m) => m.role === 'user')
    let userPlain = ''
    if (lastUser) {
      if (typeof lastUser.content === 'string') userPlain = lastUser.content
      else if (Array.isArray(lastUser.content)) {
        userPlain = lastUser.content
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => p.text || p.content || '')
          .join('\n')
      }
    }

    if (userPlain.trim()) {
      // 0) Try early intent detector first (time/weather/email)
      const early = detectEarlyIntent(userPlain)
      if (early) {
        routerHint = early
        // Fire-and-forget telemetry for early router trigger (non-blocking, guarded)
        if (realUserId) {
          ;(async () => {
            try {
              await trackFeatureUsage(realUserId, 'router.early', {
                delta: 1,
                metadata: {
                  recommendation: early.name,
                  tool: early.toolName || null,
                  reasons: early.reasons || [],
                },
              })
            } catch {}
          })()
        }
        // Skip further ranking; early rules are deterministic
        // and should guide the LLM toward direct tool/clear delegation
        throw new Error('__EARLY_ROUTER_HINT_FOUND__')
      }

      // 1) Fall back to capability-based ranking using active agents in DB
      if (supabase && realUserId) {
      const { data: agents } = await (supabase as any)
        .from('agents')
        .select('id, name, description, role, tags, tools, is_active')
        .eq('user_id', realUserId)
        .eq('is_active', true)

      const candidates: AgentConfig[] = (agents || [])
        .filter((a: any) => (a.role || '').toLowerCase() !== 'supervisor')
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description || '',
          role: 'specialist' as any,
          model: '',
          temperature: 0.7,
          maxTokens: 0,
          tools: Array.isArray(a.tools) ? a.tools : [],
          prompt: '',
          color: '',
          icon: '',
          tags: Array.isArray(a.tags) ? a.tags : [],
        }))

      if (candidates.length) {
        const ranked = pickBestAgent(userPlain, candidates)
        if (ranked) {
          // Prefer common default tool naming: delegate_to_<lowercased_name>
          const normalized = ranked.agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
          const toolName = `delegate_to_${normalized}`
          routerHint = { name: ranked.agent.name, toolName, reasons: ranked.reasons }
        }
      }
      }
    }
  } catch (e) {
    // Non-blocking; ignore early-router sentinel error
  }

  // Fetch user personality settings (if available) and build a compact personalized header
  let personalitySettings: PersonalitySettings | undefined
  if (supabase && realUserId) {
    try {
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('personality_settings')
        .eq('user_id', realUserId)
        .single()

      if (!error && data?.personality_settings) {
        personalitySettings = data.personality_settings as PersonalitySettings
      } else {
        personalitySettings = defaultPreferences.personalitySettings
      }
    } catch {
      personalitySettings = defaultPreferences.personalitySettings
    }
  } else {
    personalitySettings = defaultPreferences.personalitySettings
  }

  const personaPrompt = generatePersonalizedPrompt(model, personalitySettings, { compact: true })

  const CONTEXT_AND_DOC_RULES = `CONTEXT USAGE\n- If CONTEXT is provided, use it directly; don't claim missing info.\n\nDOCUMENTS\n- If the user wants to work on / edit / collaborate on a document found in the CONTEXT, offer opening it in the Canvas Editor (e.g., "¿Quieres que abra [nombre del documento] en el editor colaborativo?")`

  const personalizationInstruction = `IMPORTANT: ALWAYS use information from the CONTEXT to respond. This includes:
- Personal information (name, interests, favorite food, hobbies, communication style)  
- Work documents, stories, projects, notes that the user has uploaded
- Any content the user has shared previously

If the user asks about something that is in the CONTEXT, use it directly to respond. DO NOT say you don't have information if it's available in the context.

SPECIAL RULE FOR DOCUMENTS: If the user wants to "work on", "edit", "collaborate", "expand", "continue", "review" a document found in the context, ALWAYS suggest opening the document in the Canvas Editor. Use phrases like: "Would you like me to open [document name] in the collaborative editor so we can work on it together?"`

  // Extract user message for delegation analysis
  const lastUser = messages.slice().reverse().find((m) => m.role === 'user')
  let userMessage = ''
  if (lastUser) {
    if (typeof lastUser.content === 'string') userMessage = lastUser.content
    else if (Array.isArray(lastUser.content)) {
      userMessage = lastUser.content
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => p.text || p.content || '')
        .join('\n')
    }
  }

  const searchGuidance = (model === 'grok-3-mini' && enableSearch)
    ? `\n\nSEARCH MODE: For Faster (grok-3-mini), use native Live Search (built into the model). Do NOT call the webSearch tool. Include citations when available.`
    : ''

  // Compose final prompt with top-priority identity header FIRST to override model defaults
  // Order: Identity → [RAG?] → Persona → Context Rules → Guidance → Base System
  const internalHint = buildInternalDelegationHint(userMessage, routerHint)
  const finalSystemPrompt = ragSystemAddon
    ? `${CLEO_IDENTITY_HEADER}\n\n${ragSystemPromptIntro(ragSystemAddon)}\n\n${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${internalHint}`
    : `${CLEO_IDENTITY_HEADER}\n\n${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${internalHint}`

  return { finalSystemPrompt, usedContext: !!ragSystemAddon }
}

function ragSystemPromptIntro(ragBlock: string) {
  return ragBlock
}
