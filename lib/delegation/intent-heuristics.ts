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
const AGENT_KEYWORDS: Record<string, Array<string | { k: string; w: number }>> = {
  'ami-creative': [
    'agenda','agendar','calendario','calendar','schedule','scheduling','meeting','reunión','recordatorio','reminder',
    'email','correo','inbox','resumen correo','organiza','organización','follow up','minutes'
  ],
  'notion-agent': [
    'notion','workspace','página','page','database','db','tabla','base de datos','propiedad','properties','block'
  ],
  'peter-google': [
    'google doc','documento','docs','sheet','hoja de cálculo','spreadsheet','slides','presentación','drive','archivo drive'
  ],
  'apu-support': [
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
    'enviar correo','compose email','draft email','responder correo','firma','inbox zero'
  ],
  'nora-community': [
    'comunidad','community','engagement','social strategy','campaña','followers','audiencia','redes sociales'
  ],
  'luna-content-creator': [
    'escribe tweet','copy','contenido creativo','post viral','hashtags','hilo','thread'
  ],
  'zara-analytics-specialist': [
    'analytics','métricas','stats','estadísticas','kpi','performance social','engagement rate'
  ],
  'viktor-publishing-specialist': [
    'programar publicación','schedule post','publicar','calendarizar contenido','publish now'
  ],
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

export function scoreDelegationIntent(userMessage: string, opts?: { debug?: boolean }): DelegationIntentResult {
  const text = userMessage.toLowerCase()
  const scores: Record<string, number> = {}
  const reasons: string[] = []

  for (const agentId of Object.keys(AGENT_KEYWORDS)) {
    const keywords = AGENT_KEYWORDS[agentId]
    let hitCount = 0
    for (const entry of keywords) {
      const k = typeof entry === 'string' ? entry : entry.k
      const weight = typeof entry === 'string' ? 1 : entry.w
      if (text.includes(k)) {
        hitCount += weight
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
    const kw = AGENT_KEYWORDS[target]
    const matched = kw.filter(entry => {
      const k = typeof entry === 'string' ? entry : entry.k
      return text.includes(k)
    }).slice(0, 3).map(e => (typeof e === 'string' ? e : e.k))
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
