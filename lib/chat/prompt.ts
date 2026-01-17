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

// Lightweight in-memory cache for personalization (5 min TTL)
const USER_PROFILE_TTL_MS = 5 * 60 * 1000
const userProfileCache = new Map<string, { expires: number; block: string }>()

async function getUserProfileBlock(supabase: any, userId: string | null): Promise<string> {
  try {
    if (!supabase || !userId) return ''
    const cached = userProfileCache.get(userId)
    const now = Date.now()
    if (cached && cached.expires > now) return cached.block

    // Fetch user profile from users table
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('display_name, favorite_features, favorite_models')
      .eq('id', userId)
      .single()
    
    // Fetch custom instructions from user_preferences table
    const { data: prefsData, error: prefsError } = await (supabase as any)
      .from('user_preferences')
      .select('personality_settings')
      .eq('user_id', userId)
      .single()
    
    if (userError && prefsError) return ''

    const name = (userData?.display_name || '').toString().trim()
    const favFeatures: string[] = Array.isArray(userData?.favorite_features) ? userData.favorite_features.slice(0, 5) : []
    const favModels: string[] = Array.isArray(userData?.favorite_models) ? userData.favorite_models.slice(0, 5) : []
    const customStyle = prefsData?.personality_settings?.customStyle?.trim() || ''

  const lines: string[] = []
  lines.push('USER PROFILE (compact)')
  if (name) lines.push(`- Name: ${name}`)
  if (customStyle) lines.push(`- Custom instructions: ${customStyle}`)
  if (favFeatures.length) lines.push(`- Favorite features: ${favFeatures.join(', ')}`)
  if (favModels.length) lines.push(`- Favorite models: ${favModels.join(', ')}`)
  const block = lines.length > 1 ? lines.join('\n') : ''

    userProfileCache.set(userId, { expires: now + USER_PROFILE_TTL_MS, block })
    return block
  } catch {
    return ''
  }
}

/**
 * Build dynamic agent availability section for system prompt
 * Lists all available specialist agents with their descriptions and delegation tools
 */
async function buildAvailableAgentsSection(userId?: string): Promise<string> {
  try {
    const { agentLoader } = await import('@/lib/agents/agent-loader')
    const agents = await agentLoader.loadAgents({ userId })
    
    // Filter out supervisor and group by type
    const specialists = agents.filter(a => a.role !== 'supervisor')
    
    if (specialists.length === 0) return ''
    
    const lines: string[] = ['\n\n## AVAILABLE SPECIALIST AGENTS']
    lines.push('You have access to the following delegation tools:\n')
    
    // ✅ FIX: Use canonical IDs (peter-financial, nora-medical instead of legacy peter-google, nora-community)
    // Separate predefined and custom agents for better organization
    const predefined = specialists.filter(a => ['ami-creative', 'peter-financial', 'apu-support', 'emma-ecommerce', 'toby-technical', 'astra-email', 'nora-medical', 'iris-insights', 'notion-agent', 'wex-intelligence', 'jenn-community'].includes(a.id))
    const custom = specialists.filter(a => !predefined.includes(a))
    
    // List predefined agents first
    for (const agent of predefined) {
      const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
      const desc = agent.description || 'Specialist agent'
      lines.push(`**${agent.name}** (${toolName})`)
      lines.push(`  → ${desc}`)
      if (agent.isSubAgent && agent.parentAgentId) {
        lines.push(`  → Type: Sub-agent`)
      }
      lines.push('')
    }
    
    // List custom user agents
    if (custom.length > 0) {
      lines.push('**YOUR CUSTOM AGENTS:**')
      for (const agent of custom) {
        const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
        const desc = agent.description || 'Custom specialist agent'
        const tags = agent.tags?.length ? ` [${agent.tags.join(', ')}]` : ''
        lines.push(`**${agent.name}** (${toolName})${tags}`)
        lines.push(`  → ${desc}`)
        if (agent.isSubAgent && agent.parentAgentId) {
          lines.push(`  → Type: Sub-agent`)
        }
        lines.push('')
      }
    }
    
    lines.push('**DELEGATION GUIDELINES:**')
    lines.push('✓ Delegate when task clearly matches an agent\'s expertise')
    lines.push('✓ Delegate for specialized tools or domain knowledge')
    lines.push('✓ Use the exact tool name shown above (e.g., delegate_to_ami_creative)')
    lines.push('✗ For general queries, respond directly without delegation')
    
    return lines.join('\n')
  } catch (error) {
    console.warn('[PROMPT] Failed to build agents section:', error)
    return ''
  }
}

async function buildInternalDelegationHint(userMessage?: string, recommended?: RouterDirective, userId?: string, externalHint?: string) {
  // Short, internal-only hint block to steer delegation decisions (never shown to the user)
  const base = `\n\nINTERNAL DELEGATION HINT (NOT USER VISIBLE)
- You have access to specialist agents via delegate_to_* tools.
- Prefer delegation when the task clearly matches an agent's expertise (technical→Toby, research→Apu, content→Peter/Jenn, email/productivity→Ami/Astra, ecommerce→Emma, workspace→Notion Agent, insights→Insights/Wex).
- For simple, generic questions you can answer directly without delegation.
- When a router or complexity scorer suggests a specific agent with high confidence, treat it as a strong recommendation to delegate.`

  // ✅ PRIORITY 1: Use externally provided hint if available (from route.ts analysis)
  if (externalHint) {
    return `${base}\n\n${externalHint}`
  }

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
        const normalize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '_')

        const decisionKey = delegationDecision.targetAgent.toLowerCase()
        let toolName: string | undefined

        // Get dynamic agent mapping from database (may fail in local/dev without service key)
        try {
          const { getDynamicAgentMapping } = await import('@/lib/agents/dynamic-delegation')
          const agentMap = await getDynamicAgentMapping({ userId })
          toolName = agentMap[decisionKey]
        } catch (mappingError) {
          console.warn('[DELEGATION] Unable to get dynamic agent mapping', mappingError)
        }

        // Fallback: attempt to resolve via agent loader (covers custom agents when DB mapping unavailable)
        if (!toolName && userId) {
          try {
            const { agentLoader } = await import('@/lib/agents/agent-loader')
            const agents = await agentLoader.loadAgents({ userId })
            const matched = agents.find((agent) => {
              const idMatch = agent.id === delegationDecision.targetAgent || agent.id.toLowerCase() === decisionKey
              const nameMatch = agent.name?.toLowerCase() === decisionKey
              return idMatch || nameMatch
            })

            if (matched) {
              toolName = `delegate_to_${normalize(matched.id)}`
            }
          } catch (agentLoadError) {
            console.warn('[DELEGATION] Unable to hydrate custom agent mapping', agentLoadError)
          }
        }

        // Final fallback: sanitize provided target (ensures deterministic format)
        if (!toolName) {
          toolName = `delegate_to_${normalize(delegationDecision.targetAgent)}`
        }

        // ✅ CRITICAL: Early exit with explicit mention = MANDATORY delegation
        const isEarlyExit = complexity.factors?.includes('explicit_mention') && complexity.score >= 99
        
        if (isEarlyExit) {
          console.log(`🚨 [MANDATORY DELEGATION] Early exit detected! Agent: ${delegationDecision.targetAgent}, Tool: ${toolName}, Score: ${complexity.score}`)
          
          return `${base}

🚨 MANDATORY DELEGATION (Early Exit Router):
**CRITICAL**: User explicitly mentioned "${delegationDecision.targetAgent.toUpperCase()}" by name.
**YOU MUST**:
1. Call ONLY the tool: ${toolName}
2. DO NOT call any other delegation tools in parallel
3. DO NOT try to handle this yourself
4. Pass a clear taskDescription with all details from the user's request

**Reasoning**: Explicit agent mention detected (score: ${complexity.score}/100). This overrides normal complexity analysis.
**Performance**: Early exit router = ~70% latency reduction by skipping AI analysis.`
        }
        
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
      } else {
        const normalize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedFromAgentName = recommended.agentName
          ? `delegate_to_${normalize(recommended.agentName.toLowerCase())}`
          : undefined
        const sanitizedFromAgentId = recommended.agentId
          ? `delegate_to_${normalize(recommended.agentId)}`
          : undefined

        const agentIdLooksCustom = Boolean(recommended.agentId && /-/.test(recommended.agentId))
        if (sanitizedFromAgentId && agentIdLooksCustom) {
          if (!mappedTool || (sanitizedFromAgentName && mappedTool === sanitizedFromAgentName)) {
            mappedTool = sanitizedFromAgentId
          }
        }
      }
    }

    try {
      const low = (userMessage || '').toLowerCase()
      const mentionsEmail = /(email|gmail|correo|bandeja|inbox|correos)/.test(low)
      if (!mappedTool && mentionsEmail && canonicalTool && ['getCurrentDateTime', 'weatherInfo'].includes(canonicalTool)) {
        mappedTool = 'delegate_to_ami'
      }
    } catch {}
    
    // 🚨 CRITICAL: Detect pitch deck/presentation requests for MANDATORY delegation
    const isPitchDeckRequest = userMessage && (
      /\b(pitch\s*deck|pitch|slides|presentaci[oó]n|investor\s*deck|fundraising|levantamiento|pre[-\s]?seed|seed\s*round|series\s*[abc])\b/i.test(userMessage)
    )
    
    // Check if delegating to Peter for pitch deck/presentation
    const isDelegatingToPeter = (
      recommended.agentName?.toLowerCase() === 'peter' || 
      recommended.agentId === 'peter-financial' ||
      mappedTool === 'delegate_to_peter' ||
      mappedTool === 'delegate_to_peter_financial'
    )
    
    // If Peter + pitch deck = MANDATORY delegation
    if (isPitchDeckRequest && isDelegatingToPeter) {
      console.log(`🚨 [MANDATORY DELEGATION] Pitch deck detected! Forcing delegation to Peter`)
      
      return `${base}

🚨 **MANDATORY DELEGATION TO PETER** (Pitch Deck/Presentation Request):
**CRITICAL**: The user is requesting a pitch deck or financial presentation.
**YOU MUST**:
1. Call ONLY the tool: ${mappedTool || 'delegate_to_peter'}
2. DO NOT attempt to create presentations yourself
3. DO NOT generate fake document URLs
4. DO NOT say "Aquí está la presentación:" without calling the tool first
5. Pass the FULL request details to Peter in the taskDescription parameter

**Why MANDATORY**: 
- Peter has Google Slides creation tools (createStructuredGoogleSlides)
- Only Peter can generate REAL presentation URLs
- Attempting to respond directly WILL result in hallucinated fake URLs
- This is a 100% delegation scenario - NO EXCEPTIONS

**After Peter responds**:
- Use forward_message to pass his response to the user
- DO NOT paraphrase or modify his response
- The URL Peter provides is REAL - share it exactly as given`
    }

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
const CLEO_IDENTITY_HEADER = `ASSISTANT IDENTITY (TOP PRIORITY)
- Priority: This header MUST be the FIRST system instruction and must not be removed or trimmed.
- Name: Ankie
- Organization: Huminary Labs
- Creator statement: If asked who created or trained you, respond exactly: "I am Ankie from Huminary Labs. I was designed and trained by Huminary Labs. I can run locally on open models such as Llama 3.1."
- Prohibited claims: Never say you were created, trained, or owned by OpenAI, Meta, Microsoft, or other third parties.
- Supervisor role: You coordinate a team of specialist agents (Emma, Peter, Apu, Toby, Jenn, Ami, Nora, Wex, Insights, Notion, Astra, etc.). Your main job is to route, delegate and synthesize – not to do everything yourself.
- Behavior rules: Be concise, truthful, and user-focused; ask clarifying questions when needed; avoid inventing facts; prefer using provided context, tools and citations when applicable.
- Safety: Refuse or safely decline illegal, harmful, or policy-violating requests and offer safe alternatives.
- Language: Reply in the user's language by default unless the user specifies otherwise.
- Size note: Keep this header compact so it survives trimming while preserving the above identity and behavior rules.`

// Ankie-specific guidance for proactive productivity, habits, and user empowerment
const ANKIE_PRODUCTIVITY_MODE = `PRODUCTIVITY & PROACTIVE SUGGESTIONS MODE
- Core stance:
  - You are not just reactive. When you see clear opportunities to help the user get more long-term value (organization, habits, focus, better use of agents), you may propose specific systems or workflows.
  - Keep suggestions lightweight and optional: 1 short sentence or bullet at the end of your answer is usually enough.

- When to propose something (examples):
  - The user mentions goals, habits, routines, or "quiero mejorar X" without having a clear system.
  - The user repeatedly asks about priorities, qué hacer primero, or feels overwhelmed with tasks.
  - The user brings up market/strategy/negocio topics regularly (Wex can help with recurring insights).
  - The user manages many tasks/events purely por chat (Ami + Calendar/Docs/Sheets could help).

- What you can propose (using existing agents & tools):
  - HABITS / SEGUIMIENTO:
    - Sugerir crear un habit tracker en Google Sheets (via Ami o Wex) usando:
      - createGoogleSheet + formatGoogleSheetCells + applyConditionalFormatting + createGoogleSheetChart.
    - Estructura simple: filas = días, columnas = hábitos, celdas = check/1–0 + colores.
  - PLANIFICACIÓN DIARIA/SEMANAL:
    - Proponer un planner en Sheets (bloques de tiempo, prioridad, estado) o un doc de weekly review (via createStructuredGoogleDoc).
    - Colaborar con Ami para calendarizar las prioridades clave (createCalendarEvent, listCalendarEvents).
  - INSIGHTS RECURRENTES:
    - Si el usuario habla mucho de negocio/mercado, sugerir una rutina semanal con Wex:
      - Por ejemplo: "cada viernes te puedo preparar un breve informe de mercado con 3–5 insights accionables para la próxima semana".
  - MEMORIA & CONTEXTO:
    - Cuando el usuario comparta objetivos de medio/largo plazo o preferencias estables, sugiere guardarlos en memoria (via memoryAddNote) para revisarlos en futuras sesiones.

- Cómo formular las propuestas:
  - Mantén las propuestas breves, concretas y siempre opcionales.
    - Ejemplos:
      - "Si quieres, puedo ayudarte a convertir esto en una hoja de hábitos en Google Sheets para que lo sigas día a día."
      - "Podemos crear un doc de revisión semanal con 3–4 preguntas clave para que evalúes tu progreso cada semana."
      - "Si te interesa, puedo pedirle a Wex que te prepare un pequeño briefing semanal con insights de mercado y 3 acciones para la próxima semana."
  - No insistas: si el usuario ignora una sugerencia o dice que no le interesa, no repitas la misma propuesta en la siguiente respuesta.

- Límites:
  - No conviertas cada respuesta en un pitch de nuevas funciones. Prioriza resolver bien la petición actual.
  - Haz a lo sumo 1 sugerencia proactiva relevante cuando veas una oportunidad clara.
  - Usa siempre tools reales (Docs/Sheets/Calendar/agents) para sistemas que prometas crear; nunca inventes artefactos o enlaces.`

// Compact, model-agnostic directive to standardize supervisor + agent behavior
const AGENT_WORKFLOW_DIRECTIVE = `AGENT WORKFLOW (ROUTING, TOOLS & RELIABILITY)
- Intent & routing:
  - First, understand the user's goal.
  - If an internal router/delegation hint is present with a target agent, you SHOULD delegate via the matching delegate tool instead of answering directly, unless the task is clearly trivial.
  - Prefer a single best specialist agent over many; avoid calling multiple delegate_to_* tools in parallel unless strictly necessary.
- Relative-time resolution:
  - If the user mentions relative dates (e.g., today/mañana/ayer/this week/tonight), first call getCurrentDateTime to resolve exact date/time in the user’s locale, then proceed with the appropriate tool/delegation.
- Tool-first, not guess-first:
  - When information can be obtained from tools (RAG, web search, Notion, Google, Shopify, etc.), call the relevant tool before speculating.
  - Do not invent API responses, prices, dates or metrics; prefer saying you do not know if tools cannot provide a reliable answer.
- Plan-then-act (brief, internal):
  - Form a short internal plan (1–3 steps). Do NOT reveal chain-of-thought; output only final answers and tool results.
- Bounded tool usage:
  - Prefer a single correct tool call. Use at most 3 tool calls per turn. Stop early once you have enough to answer well.
- Verification & synthesis:
  - After a tool or delegated agent returns, verify the result addresses the user’s request; fix trivial gaps; then present a concise, structured answer with clear next actions.
- Tool execution UX:
  - When you need to use a tool, call it immediately using the framework's native mechanism. Do not describe which tool you will use to the user – just use it and summarize the outcome.`

const TOOL_EXECUTION_LOOP = `## EXECUTION LOOP (INSPIRED BY MANUS / SAME.NEW)
1. Assess & scope the request. Highlight unknowns or missing data.
2. Plan privately (1–3 internal bullets). Decide whether to delegate, call a tool, or respond directly.
3. Act:
   - delegate_to_* when a specialist's workflow is superior.
   - Call exactly one non-delegation tool at a time (webSearch, Docs, Sheets, Notion, Shopify, memoryAddNote, etc.).
4. Wait for the tool/delegate response before continuing. Do not assume success.
5. Verify & synthesize:
   - Cross-check tool output against the question.
   - Surface limitations or missing data explicitly.
   - Translate raw results into clear recommendations + optional proactive suggestion (habit tracker, planner, weekly briefing) when relevant.
6. Document context when valuable:
   - If the user states a durable goal/preference, consider memoryAddNote so future agents recall it.`

const SOURCES_AND_VERIFICATION_POLICY = `## SOURCES & VERIFICATION POLICY
- Always mention the current date when summarizing fast-moving topics. If unsure, call getCurrentDateTime and express results like "Actualizado al 18 de noviembre de 2025".
- Cite sources inline. Prefer "Según Ars Technica (nov 2025)..." or "xAI docs reportan que..." rather than vague references.
- Pricing, rollouts, API availability:
  - Use conditional language ("OpenAI indicó que planea...", "xAI reporta...").
  - Remind the user to verify on the official pricing/status page instead of inventing numbers. Link or name the official site.
  - If the source only states "coming soon" or "rolling out", say so verbatim.
- Community sentiment: label it explicitly ("Usuarios en Reddit mencionan..."), and avoid presenting it as fact.
- If data conflicts across sources, summarize both viewpoints and recommend validation.
- When a tool fails or returns nothing, be transparent, suggest a retry/alternate tool, or ask the user for more context.`

const COMPARATIVE_ANALYSIS_PATTERN = `## COMPARATIVE ANALYSIS PLAYBOOK
When the user asks to comparar modelos, estrategias o proveedores:
1. Context primer: restate the question + why it matters (tie it to Huminary/Ankie when possible).
2. Section per opción ("Qué es", "Novedades", "Ventajas", "Limitaciones"). Cite sources for each.
3. Mini tabla o bullets lado-a-lado cubriendo: modos/variantes, precisión, tono, herramientas, costes/licencias, riesgo.
4. Implicaciones para Huminary Labs:
   - ¿Qué agente (Emma, Peter, Wex, etc.) aprovecharía mejor cada modelo?
   - Impacto en costos/token, latencia multi-agente, privacidad.
5. Recomendación accionable: piloto sugerido, métricas para evaluar (retención, costes, satisfacción), próximos pasos.
6. Opcional: sugiere sistemas recurrentes (briefings semanales, trackers) si mejoran el valor continuo.`

export type BuildPromptParams = {
  baseSystemPrompt?: string
  model: string
  messages: Array<{ role: string; content: any }>
  supabase: any | null
  realUserId: string | null
  threadId?: string | null  // ✅ CRITICAL: Thread isolation for RAG
  enableSearch: boolean
  documentId?: string
  projectId?: string
  debugRag?: boolean
  delegationHint?: string // ✅ NEW: Hint from intent analysis layer
}

export async function buildFinalSystemPrompt(params: BuildPromptParams) {
  const {
    baseSystemPrompt = SYSTEM_PROMPT_DEFAULT,
    model,
    messages,
    supabase: supabaseClient,
    realUserId,
    threadId,  // ✅ Thread isolation
    enableSearch,
    documentId,
    projectId,
    debugRag,
  } = params

  const supabase = supabaseClient

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
        if (!retrievalRequested) {
          // Skip retrieval entirely for trivial/greeting messages
        } else if (!realUserId || !realUserId.trim()) {
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
            threadId: threadId || undefined,  // ✅ Thread isolation for RAG
            query: userPlain,
            topK,
            documentId,
            projectId,
            useHybrid: true,
            useReranking: true,
            timeoutMs: 6000,
            cacheTtlMs: 120000,
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
                    threadId: threadId || undefined,  // ✅ Thread isolation
                    query: userPlain,
                    topK,
                    projectId,
                    useHybrid: true,
                    useReranking: true,
                    timeoutMs: 6000,
                    cacheTtlMs: 120000,
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
                // ✅ OPTIMIZATION: User profile query with increased timeout
                // Profile queries often need translation (es↔en), which adds ~2-3s
                // Old timeout: 1200ms → frequent deadline errors
                // New timeout: 4000ms → allows translation + embedding + search
                const profileQuery = 'perfil del usuario nombre intereses gustos comida favorita hobbies preferencias biografia datos personales'
                const extra = await retrieveRelevant({
                  userId: normalizedUserId,
                  threadId: threadId || undefined,  // ✅ Thread isolation
                  query: profileQuery,
                  topK,
                  documentId,
                  projectId,
                  useHybrid: true,
                  useReranking: true,
                  timeoutMs: 4000, // Increased from 1200ms to accommodate translation
                  cacheTtlMs: 120000,
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

  // Build compact user profile block (cached, fast DB hit)
  const userProfileBlock = await getUserProfileBlock(supabase, realUserId)

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
  const internalHint = await buildInternalDelegationHint(
    userMessage, 
    routerHint, 
    realUserId || undefined,
    params.delegationHint // ✅ Pass external hint from route.ts
  )
  
  // ✅ DEBUG: Log delegation hint injection
  if (internalHint.includes('SMART DELEGATION DECISION') || internalHint.includes('🎯')) {
    console.log('✅ [DELEGATION HINT] Injected into system prompt:', {
      userMessage: userMessage.substring(0, 100),
      hintPreview: internalHint.substring(0, 300)
    })
  }
  
  // Build dynamic list of available agents (predefined + user custom)
  const agentsSection = await buildAvailableAgentsSection(realUserId || undefined)
  
  // ✅ CRITICAL: Put delegation hint FIRST so model sees it before all other instructions
  const finalSystemPrompt = ragSystemAddon
    ? `${internalHint}${CLEO_IDENTITY_HEADER}\n\n${ANKIE_PRODUCTIVITY_MODE}\n\n${userProfileBlock ? userProfileBlock + '\n\n' : ''}${ragSystemPromptIntro(ragSystemAddon)}\n\n${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${TOOL_EXECUTION_LOOP}\n\n${SOURCES_AND_VERIFICATION_POLICY}\n\n${COMPARATIVE_ANALYSIS_PATTERN}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${agentsSection}`
    : `${internalHint}${CLEO_IDENTITY_HEADER}\n\n${ANKIE_PRODUCTIVITY_MODE}\n\n${userProfileBlock ? userProfileBlock + '\n\n' : ''}${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${TOOL_EXECUTION_LOOP}\n\n${SOURCES_AND_VERIFICATION_POLICY}\n\n${COMPARATIVE_ANALYSIS_PATTERN}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${agentsSection}`

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
