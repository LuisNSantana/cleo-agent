import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { retrieveRelevant, buildContextBlock } from '@/lib/rag/retrieve'
import { indexDocument } from '@/lib/rag/index-document'
import { generatePersonalizedPrompt } from '@/lib/prompts/personality'
import { defaultPreferences, type PersonalitySettings } from '@/lib/user-preference-store/utils'
import { getCleoPrompt } from '@/lib/prompts'
import { pickBestAgent, analyzeDelegationIntent } from '@/lib/agents/delegation'
import { detectEarlyIntent, type RouterDirective } from '@/lib/agents/router'
import { trackFeatureUsage } from '@/lib/analytics'
import { makeDelegationDecision, analyzeTaskComplexity } from '@/lib/agents/complexity-scorer'
import type { AgentConfig } from '@/lib/agents/types'
import { detectImageGenerationIntent } from '@/lib/image-generation/intent-detection'

// Build a dynamic internal hint to steer delegation without exposing it to the user
async function buildInternalDelegationHint(userMessage?: string, recommended?: RouterDirective) {
  const base = `\n\nOPTIMIZED AGENT SYSTEM ACTIVE:
🚀 NEW ARCHITECTURE: 68% tool reduction vs legacy system
⚡ SMART ROUTING: Complexity-based delegation (simple=direct, complex=specialist)
🎯 ZERO OVERLAP: Each agent specialized (Ami=admin, Apu=research, Peter=creation, Emma=ecommerce)
🔧 SUB-AGENTS: Hyper-specialized (Astra=email, Notion Agent=workspace)
� PERFORMANCE: ~80% latency reduction for simple queries, better accuracy for complex`

  // Image-specific optimization: handle quick prompts without delegation
  if (userMessage) {
    const imageIntent = detectImageGenerationIntent(userMessage)
    if (imageIntent.shouldGenerate) {
      return `${base}

🖼️ IMAGE MODE ACTIVE:
- This request is an image generation prompt handled by the built-in Image Studio.
- Do NOT delegate to Astra or any other agent for this.
- Acknowledge the generated image with a concise, vivid caption (<=2 sentences) once it is ready.
- If generation fails, apologize briefly and ask whether the user wants to retry or adjust the prompt.`
    }
  }
  
  // Use enhanced complexity-based analyzer if we have a user message
  if (userMessage && !recommended) {
    try {
      console.log(`🧠 [OPTIMIZATION] Analyzing: "${userMessage.substring(0, 100)}..."`)
      
      // Use the new complexity scorer
      const delegationDecision = await makeDelegationDecision(userMessage)
      const complexity = delegationDecision.complexity
      
      console.log(`📊 [OPTIMIZATION] Score: ${complexity.score}, Route: ${complexity.recommendation}`, {
        shouldDelegate: delegationDecision.shouldDelegate,
        targetAgent: delegationDecision.targetAgent,
        factors: complexity.factors,
        reasoning: delegationDecision.reasoning
      })
      
      if (delegationDecision.shouldDelegate && delegationDecision.targetAgent) {
        // Get dynamic agent mapping from database
        const { getDynamicAgentMapping } = await import('@/lib/agents/dynamic-delegation')
        const agentMap = await getDynamicAgentMapping()
        
        const toolName = agentMap[delegationDecision.targetAgent]
        
        return `${base}

🎯 SMART DELEGATION DECISION:
- Complexity Score: ${complexity.score}/100 (${complexity.recommendation})
- Target: ${delegationDecision.targetAgent.toUpperCase()} specialist
- Tool: ${toolName || 'delegate_to_' + delegationDecision.targetAgent}
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
    const leafToDelegateMap: Record<string, string> = {
      listGmailMessages: 'delegate_to_ami',
      getGmailMessage: 'delegate_to_ami',
      modifyGmailLabels: 'delegate_to_ami',
      trashGmailMessage: 'delegate_to_ami',
      sendGmailMessage: 'delegate_to_astra',
    }

    const canonicalTool = recommended.toolName
    let mappedTool = canonicalTool

    if (recommended.action === 'delegate') {
      if (recommended.leafTool && leafToDelegateMap[recommended.leafTool]) {
        mappedTool = leafToDelegateMap[recommended.leafTool]
      } else if (canonicalTool && leafToDelegateMap[canonicalTool]) {
        mappedTool = leafToDelegateMap[canonicalTool]
      }
    }

    try {
      const low = (userMessage || '').toLowerCase()
      const mentionsEmail = /(email|gmail|correo|bandeja|inbox|correos)/.test(low)
      if (!mappedTool && mentionsEmail && canonicalTool && ['getCurrentDateTime', 'weatherInfo'].includes(canonicalTool)) {
        mappedTool = 'delegate_to_ami'
      }
    } catch {}

    const hasRelativeTime = /\b(hoy|mañana|ayer|esta semana|esta noche|today|tomorrow|yesterday|tonight|this week)\b/i.test(userMessage || '')
    const needsTimeTool = canonicalTool === 'getCurrentDateTime'
    const timeNudge = hasRelativeTime && !needsTimeTool
      ? ' First, call getCurrentDateTime to resolve the exact date/time; then proceed.'
      : ''
    const displayName = recommended.agentName || (mappedTool || canonicalTool || 'specialist').replace(/^delegate_to_/, '')
    const toolPart = mappedTool ? ` Prefer tool: ${mappedTool}.` : canonicalTool ? ` Prefer tool: ${canonicalTool}.` : ''
    const reasonPart = recommended.reasons?.length ? ` Reasons: ${recommended.reasons.join(', ')}.` : ''
    const actionPart = recommended.action === 'delegate'
      ? ' Action: Call this delegation tool now; do not answer directly.'
      : canonicalTool
        ? ' Action: Use this tool immediately; keep response concise.'
        : ''
    const confidencePart = typeof recommended.confidence === 'number'
      ? ` Confidence: ${(recommended.confidence * 100).toFixed(0)}%.`
      : ''

    return `${base}\n- Router recommendation: ${displayName}.${toolPart}${timeNudge}${reasonPart}${actionPart}${confidencePart}`
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
- Relative-time resolution: If the user mentions relative dates (e.g., today/mañana/ayer/this week/tonight), first call getCurrentDateTime to resolve exact date/time in the user’s locale, then proceed with the appropriate tool/delegation.
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
  projectId?: string
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
    projectId,
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

  // Prefer speed by default; only enable RAG when explicitly requested
  let autoRagEnabled = false
  let retrievalRequested = enableSearch || !!documentId || !!projectId || autoRagEnabled
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
        // Greeting/trivial fast-path: skip retrieval to save time for simple chats
        const low = userPlain.trim().toLowerCase()
        const isGreeting = /^(hola|\bhey\b|\bhi\b|hello|buen[oa]s\s+(d[ií]as|tardes|noches)|how are you|como estas|cómo estás|que tal|qué tal)\b/.test(low)
        const isVeryShort = low.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).length <= 6
        const hasNoTaskVerbs = !/(crear|create|build|make|generar|generate|analizar|analyze|buscar|search|investigar|research|enviar|send|programa|code|document|sheet|pdf|notion|calendar|email|gmail|drive)/i.test(low)
        if ((isGreeting || isVeryShort) && hasNoTaskVerbs) {
          retrievalRequested = false
        }
        if (!realUserId || !realUserId.trim()) {
          console.warn('[RAG] Skipping retrieval because realUserId is missing in buildFinalSystemPrompt.')
        } else {
          const normalizedUserId = realUserId.trim()
          try {
            const { data: userDocs } = await (supabase as any)
              .from('documents')
              .select('id')
              .eq('user_id', normalizedUserId)
              .limit(1)
            if (process.env.NODE_ENV !== 'production') {
              console.log('[RAG] DEBUG - Has docs?', Boolean(userDocs?.length))
            }
          } catch {}

          // Dynamic sizing: faster models get smaller budgets for speed
          const fastModel = model === 'grok-3-mini' || model === 'grok-4-fast'
          const topK = fastModel ? 4 : 6
          let retrieved = await retrieveRelevant({
            userId: normalizedUserId,
            query: userPlain,
            topK,
            documentId,
            projectId,
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
                  .eq('user_id', normalizedUserId)
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
                    userId: normalizedUserId,
                    query: userPlain,
                    topK,
                    projectId,
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
                  userId: normalizedUserId,
                  query: profileQuery,
                  topK,
                  documentId,
                  projectId,
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
      }
    } catch (e) {
      console.error('[RAG] retrieval failed', e)
    }
  }

    // Phase 1: layered router hint (Capa 0 early rules -> capability-based)
  let routerHint: RouterDirective | undefined
  
  // First, check if orchestrator already provided a routing hint in system messages
  const orchestratorHint = messages.find(m => 
    m.role === 'system' && 
    typeof m.content === 'string' && 
    m.content.startsWith('🎯 ROUTING DIRECTIVE ')
  )

  if (orchestratorHint && typeof orchestratorHint.content === 'string') {
    const payloadText = orchestratorHint.content.replace('🎯 ROUTING DIRECTIVE ', '').trim()
    try {
      const parsed = JSON.parse(payloadText)
      if (parsed?.type === 'routing-directive' && parsed?.directive) {
        routerHint = parsed.directive as RouterDirective
        console.log('🎯 [Prompt] Using orchestrator routing hint:', routerHint)
      }
    } catch (err) {
      console.warn('⚠️ [Prompt] Failed to parse routing directive payload', err)
    }
  }
  
  // If no orchestrator hint, detect from user message
  if (!routerHint) {
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
        const low = userPlain.trim().toLowerCase()
        const isGreeting = /^(hola|\bhey\b|\bhi\b|hello|buen[oa]s\s+(d[ií]as|tardes|noches)|how are you|como estas|cómo estás|que tal|qué tal)\b/.test(low)
        const isVeryShort = low.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).length <= 6
        const hasNoTaskVerbs = !/(crear|create|build|make|generar|generate|analizar|analyze|buscar|search|investigar|research|enviar|send|programa|code|document|sheet|pdf|notion|calendar|email|gmail|drive)/i.test(low)
        const skipEarly = (isGreeting || isVeryShort) && hasNoTaskVerbs

        if (!skipEarly) {
          const early = detectEarlyIntent(userPlain)
          if (early) {
          routerHint = early
          if (realUserId) {
            ;(async () => {
              try {
                await trackFeatureUsage(realUserId, 'router.early', {
                  delta: 1,
                  metadata: {
                    action: early.action,
                    tool: early.toolName,
                    agent: early.agentName || null,
                    confidence: early.confidence,
                    reasons: early.reasons,
                  },
                })
              } catch {}
            })()
          }
          throw new Error('__EARLY_ROUTER_HINT_FOUND__')
        }
        } else {
          console.log('🧭 [Prompt] Early intent skipped (greeting/simple).')
        }

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
              const normalized = ranked.agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
              routerHint = {
                source: 'early',
                action: 'delegate',
                toolName: `delegate_to_${normalized}`,
                agentId: ranked.agent.id,
                agentName: ranked.agent.name,
                reasons: ranked.reasons,
                confidence: Math.min(0.85, ranked.score ?? 0.85),
              }
            }
          }
        }
      }
    } catch (e) {
      // Non-blocking; ignore early-router sentinel error
    }
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
  const internalHint = await buildInternalDelegationHint(userMessage, routerHint)
  
  // Add agent capability information for smart delegation
  const capabilityInfo = `\n\nAGENT SPECIALIZATION & DELEGATION RULES
- Peter (delegate_to_peter): ONLY for Google Docs/Sheets/Slides creation. Do NOT delegate to Peter for email, calendar, general tasks, or anything outside Google Workspace document creation.
- Ami (delegate_to_ami): General organization, scheduling, email management, file management, and research. Handles Gmail, Calendar, Drive files, and administrative tasks.
- Astra (delegate_to_astra): Long-form email drafting/sending and complex communication workflows. For simple image prompts, stay in the main chat, rely on the built-in image generator, and respond with a short caption instead of delegating.
- Before delegating: Consider if you can handle the task directly with your available tools. Only delegate when the specialist agent has unique capabilities or access.
- Agent visibility: Each agent can see their own tools, tags, and specializations when making delegation decisions.`
  
  const finalSystemPrompt = ragSystemAddon
    ? `${CLEO_IDENTITY_HEADER}\n\n${ragSystemPromptIntro(ragSystemAddon)}\n\n${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${internalHint}${capabilityInfo}`
    : `${CLEO_IDENTITY_HEADER}\n\n${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${internalHint}${capabilityInfo}`

  if (
    (typeof selectedBasePrompt === 'string' && selectedBasePrompt.includes('{{user_lang}}')) ||
    (typeof ragSystemAddon === 'string' && ragSystemAddon.includes('{{user_lang}}'))
  ) {
    let detectedLang = 'en'
    try {
      const lastUserDetect = [...messages].reverse().find(m => m.role === 'user')
      const sampleText = typeof lastUserDetect?.content === 'string'
        ? lastUserDetect?.content
        : Array.isArray(lastUserDetect?.content)
          ? lastUserDetect?.content.map((p: any) => (p?.type === 'text' ? p.text || p.content || '' : '')).join(' ')
          : ''
      if (sampleText) {
        const text = sampleText.toLowerCase()
        const spanishSignals = [/\b(el|la|los|las|un|una|para|con|sobre|desde|cuando|donde)\b/, /\b(?:qué|por qué|cómo|cuándo|dónde|porque|gracias)\b/, /[áéíóúñ]/]
        const portugueseSignals = [/\b(para|como|onde|obrigado|você|não)\b/, /[ãõç]/]
        const frenchSignals = [/\b(le|la|les|des|une|est|pourquoi|merci|avec)\b/]
        if (spanishSignals.some(r => r.test(text))) detectedLang = 'es'
        else if (portugueseSignals.some(r => r.test(text))) detectedLang = 'pt'
        else if (frenchSignals.some(r => r.test(text))) detectedLang = 'fr'
        else if (/\b(danke|bitte|und|nicht|warum)\b/.test(text)) detectedLang = 'de'
        else if (/\b(grazie|perché|come|dove|ciao)\b/.test(text)) detectedLang = 'it'
      }
    } catch {
      // Fallback silently to 'en'
    }

    selectedBasePrompt = typeof selectedBasePrompt === 'string'
      ? selectedBasePrompt.replace(/\{\{user_lang\}\}/g, detectedLang)
      : selectedBasePrompt
    ragSystemAddon = typeof ragSystemAddon === 'string'
      ? ragSystemAddon.replace(/\{\{user_lang\}\}/g, detectedLang)
      : ragSystemAddon
  }

  return { finalSystemPrompt, usedContext: !!ragSystemAddon }
}

function ragSystemPromptIntro(ragBlock: string) {
  return ragBlock
}
