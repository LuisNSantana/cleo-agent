import { emitPipelineEventExternal } from '@/lib/tools/delegation'

/** Delegation Intent Scoring
 * Lightweight lexical + pattern heuristic returning the best target agent and score.
 * This is intentionally simple (O(n) over keyword lists) and easily extendable.
 */

export interface DelegationIntentResult {
  target: string | null
  score: number
  scores: Record<string, number>
  reasons: string[]
}

// Keyword dictionary per agent (lowercase). Weight defaults to 1 unless specified.
// Keep lists compact; we can enrich later.
// This list is dynamically enriched at runtime with user-created agents
type KeywordEntry = string | { k: string; w?: number; match?: 'word' }

const AGENT_KEYWORDS: Record<string, KeywordEntry[]> = {
  'ami-creative': [
    'agenda','agendar','calendario','calendar','schedule','scheduling','meeting','reunión','recordatorio','reminder',
    'organiza','organización','follow up','minutes','acta','asistente','assistant','secretaria'
  ],
  'notion-agent': [
    'notion','workspace','página','page','database','db','tabla','base de datos','propiedad','properties','block'
  ],
  'peter-financial': [
    { k: 'google doc', w: 4 },
    { k: 'documento', w: 3 },
    { k: 'docs', w: 3 },
    { k: 'sheet', w: 2 },
    { k: 'hoja de cálculo', w: 2 },
    { k: 'spreadsheet', w: 2 },
    { k: 'slides', w: 3 },
    { k: 'presentación', w: 3 },
    { k: 'drive', w: 2 },
    { k: 'archivo drive', w: 2 }
  ],
  'apu-support': [
    // Support & troubleshooting, especially when user mentions tickets, incidencias, SLAs or soporte
    'ticket','tickets','incidencia','incidencias','soporte','support','helpdesk','sla','cliente','clientes',
    'investiga','research','buscar','trend','tendencia','web','news','noticias','análisis','comparar','fuentes'
  ],
  'emma-ecommerce': [
    'shopify','ecommerce','tienda','producto','inventario','ventas','carrito','sku','catalogo','checkout'
  ],
  'toby-technical': [
    { k: 'debug', w: 2 }, { k: 'código', w: 2 }, { k: 'code', w: 2 }, { k: 'api', w: 2 }, 
    { k: 'endpoint', w: 2 }, { k: 'deploy', w: 2 }, { k: 'docker', w: 2 }, 
    { k: 'typescript', w: 3 }, { k: 'javascript', w: 3 }, { k: 'next.js', w: 3 },
    { k: 'error stack', w: 2 }, { k: 'refactor', w: 2 }, { k: 'architecture', w: 2 },
    { k: 'base de código', w: 2 }, { k: 'build error', w: 3 }, { k: 'integration tests', w: 2 },
    { k: 'docker compose', w: 2 }, { k: 'fix', w: 2 }, { k: 'failing', w: 2 }
  ],
  'astra-email': [
    // Específico para EMAIL/CORREO (no genérico "mensaje")
    { k: 'email', w: 2 }, { k: 'correo', w: 2 }, { k: 'gmail', w: 2 },
    { k: 'enviar correo', w: 3 }, { k: 'enviar email', w: 3 },
    'compose email','draft email','responder correo','reply email','firma email',
    'inbox','bandeja entrada','resumen correo','resumen email','correos','emails',
    'asunto','subject line','destinatario','cc','bcc','adjunto','attachment'
  ],
  'nora-medical': [ // ✅ FIX: Corrected from nora-community to nora-medical
    'salud','health','medicina','medical','diagnóstico','síntomas','tratamiento','receta','prescription',
    'doctor','hospital','consulta médica','enfermedad','disease','wellness','bienestar'
  ],
  'jenn-community': [ // Social media & community management (NO email)
    // General social media (NO incluir "mensaje" genérico - confunde con email)
    'comunidad','community','engagement','social strategy','campaña','followers','audiencia',
    { k: 'redes sociales', w: 2 }, { k: 'social media', w: 2 },
    'contenido social','analytics social','schedule post','programar publicación',
    
    // Twitter/X - Alta prioridad
    { k: 'tweet', w: 3 }, { k: 'twitter', w: 3 }, { k: 'x.com', w: 3 },
    { k: 'publicar tweet', w: 3 }, { k: 'post tweet', w: 3 },
    'hilo twitter','thread','trending','hashtag',
    
    // Instagram - Alta prioridad
    { k: 'instagram', w: 3 }, { k: 'ig', w: 2 }, { k: 'insta', w: 2 },
    { k: 'post instagram', w: 3 }, { k: 'publicar instagram', w: 3 },
    'carousel','carrusel','reel','reels','stories','historia','ig post',
    'insights instagram','instagram analytics','foto instagram','image post',
    
    // Facebook - Alta prioridad
    { k: 'facebook', w: 3 }, { k: 'fb', w: 2 },
    { k: 'página facebook', w: 3 }, { k: 'facebook page', w: 3 },
    { k: 'post facebook', w: 3 }, { k: 'publicar facebook', w: 3 },
    'programar facebook','schedule facebook','facebook insights','page insights',
    
  // Telegram - MUY ALTA PRIORIDAD (evitar confusión con email)
  { k: 'telegram', w: 4, match: 'word' },
    { k: 'canal telegram', w: 4 }, { k: 'channel telegram', w: 4 },
    { k: 'publicar telegram', w: 4 }, { k: 'enviar telegram', w: 4 },
    { k: 'broadcast telegram', w: 4 }, { k: 'mensaje telegram', w: 4 },
    { k: 'anuncio telegram', w: 3 }, { k: 'telegram announcement', w: 3 },
    { k: 'telegram channel', w: 4 }, { k: 'telegram broadcast', w: 4 },
    { k: 'telegram message', w: 4 }, { k: 'post telegram', w: 4 }
  ],
  'iris-insights': [
    { k: 'insight', w: 2 }, { k: 'insights', w: 2 }, 'resumen ejecutivo','hallazgos','recomendaciones','riesgos','tendencias',
    'pdf','documento','doc','google doc','evidencia','referencias','sintetiza','analiza','analisis','análisis',
    'informe','reporte','executive summary','mapa de evidencias','fuentes','citas','briefing','executive brief'
  ],
  'wex-intelligence': [
    // Strategic / competitive / market intelligence
    'insights de mercado','inteligencia competitiva','competitive intelligence','análisis de mercado','market analysis',
    'competidores','competencia','posicionamiento','strategy','estrategia','swot','porter','moat','diferenciación',
    'white space','oportunidades de mercado','tam','sam','som'
  ]
}

// Optional penalties or boosts based on message length or structure
function structuralAdjustments(rawScore: number, text: string): number {
  if (text.length < 15) return rawScore * 0.85 // short queries: reduce certainty
  if (/\n/.test(text) && text.length > 120) return rawScore * 1.05 // multi-line structured
  return rawScore
}

// Normalize into 0..1 range (simple logistic-ish squashing)
function normalizeScore(count: number, totalKeywords: number): number {
  if (count <= 0) return 0
  const ratio = count / Math.max(4, totalKeywords) // dampen very long lists
  return Math.min(1, ratio)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesKeyword(text: string, entry: KeywordEntry): boolean {
  if (typeof entry === 'string') return text.includes(entry)
  const keyword = entry.k.toLowerCase()
  if (entry.match === 'word') {
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
    return regex.test(text)
  }
  return text.includes(keyword)
}

function weightFor(entry: KeywordEntry): number {
  if (typeof entry === 'string') return 1
  return typeof entry.w === 'number' ? entry.w : 1
}

/**
 * Enrich keywords dynamically with user-created agents
 * This is called at runtime to include custom agents in intent detection
 */
export function enrichKeywordsWithAgents(agents: Array<{ id: string; name: string; tags?: string[]; description?: string }>): void {
  for (const agent of agents) {
    // Skip if already defined or if it's the supervisor
    if (AGENT_KEYWORDS[agent.id] || agent.id === 'cleo-supervisor') continue
    
    // Generate keywords from agent name, tags, and description
    const keywords: string[] = []
    
    // Add name variations (lowercase)
    keywords.push(agent.name.toLowerCase())
    
    // Add tags if available
    if (agent.tags && agent.tags.length > 0) {
      keywords.push(...agent.tags.map(t => t.toLowerCase()))
    }
    
    // Extract key terms from description (words longer than 4 chars)
    if (agent.description) {
      const descWords = agent.description.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4 && /^[a-z]+$/.test(w))
        .slice(0, 5) // Max 5 terms from description
      keywords.push(...descWords)
    }
    
    AGENT_KEYWORDS[agent.id] = keywords
  }
}

export function scoreDelegationIntent(userMessage: string, opts?: { debug?: boolean; availableAgents?: string[] }): DelegationIntentResult {
  const text = userMessage.toLowerCase()
  const scores: Record<string, number> = {}
  const reasons: string[] = []
  const keywordSelections: Record<string, KeywordEntry[]> = {}

  // Filter to only score available agents (performance optimization)
  const agentsToScore = opts?.availableAgents 
    ? Object.keys(AGENT_KEYWORDS).filter(id => opts.availableAgents!.includes(id))
    : Object.keys(AGENT_KEYWORDS)

  for (const agentId of agentsToScore) {
    let keywords = AGENT_KEYWORDS[agentId]
    if (!keywords || keywords.length === 0) continue

    if (agentId === 'jenn-community' && !text.includes('telegram')) {
      keywords = keywords.filter(entry => {
        const keyword = typeof entry === 'string' ? entry : entry.k
        return !keyword.includes('telegram')
      })
      if (!keywords.length) continue
    }

    keywordSelections[agentId] = keywords

    let hitCount = 0
    for (const entry of keywords) {
      if (matchesKeyword(text, entry)) {
        hitCount += weightFor(entry)
      }
    }
    const base = normalizeScore(hitCount, keywords.length)
    const adjusted = structuralAdjustments(base, text)
    scores[agentId] = adjusted
  }

  // Determine best target
  let target: string | null = null
  let best = 0
  for (const [agentId, sc] of Object.entries(scores)) {
    if (sc > best) {
      best = sc
      target = sc >= 0.05 ? agentId : null // ignore noise
    }
  }

  // Compose reasons (top 3 positive matches for the chosen agent)
  if (target) {
    const kw = keywordSelections[target] || AGENT_KEYWORDS[target] || []
    const matched = kw
      .filter(entry => matchesKeyword(text, entry))
      .slice(0, 3)
      .map(e => (typeof e === 'string' ? e : e.k))
    if (matched.length) reasons.push(`matched: ${matched.join(', ')}`)
    reasons.push(`score:${best.toFixed(2)}`)
  }

  // Optionally emit debug SSE event (global flag checked by caller for perf isolation)
  if (opts?.debug) {
    try {
      emitPipelineEventExternal?.({
        type: 'delegation-intent',
        target,
        score: best,
        scores,
        reasons,
        timestamp: new Date().toISOString()
      })
    } catch {}
  }

  return { target, score: best, scores, reasons }
}
