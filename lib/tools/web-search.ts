import { tool } from 'ai'
import { z } from 'zod'
import { detectLanguage } from '@/lib/language-detection'

interface BraveSearchResult {
  title: string
  url: string
  description: string
  page_age?: string
  meta_url?: {
    hostname: string
  }
}

interface BraveSearchResponse {
  type: string
  web?: {
    type: string
    results: BraveSearchResult[]
  }
  query: {
    original: string
  }
}

// Define output schema for type safety (AI SDK 5 best practice)
const webSearchOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  query: z.string(),
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string(),
    hostname: z.string(),
    age: z.string()
  })),
  total_results: z.number().optional(),
  summary: z.string().optional(),
  insights: z.array(z.string()).optional(),
  note: z.string().optional()
})

// simple in-memory cache for search results
const searchCache: Record<string, { data: z.infer<typeof webSearchOutputSchema>; expiry: number }> = {}

function summarizeResults(
  query: string,
  results: Array<{ title: string; description: string }>,
  lang: 'es' | 'en'
): { summary: string; insights: string[] } {
  const titles = results.slice(0, 6).map(r => (r.title || '').trim()).filter(Boolean)
  // Build insights directly from top result titles to be concrete, not generic
  const insights = titles.slice(0, 3)
  const summary = lang === 'es'
    ? `Resumen breve sobre ${query.trim()}: ${titles[0] || 'se encontraron varias notas relevantes.'}`
    : `Quick take on ${query.trim()}: ${titles[0] || 'several relevant notes found.'}`
  return { summary, insights }
}

export const webSearchTool = tool({
  description: 'Search the web for current information using Brave Search API. Use this when users ask for recent news, current events, latest information, or any topic requiring up-to-date web data.',
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe('The search query to find relevant web information'),
    count: z.number().min(1).max(20).optional().default(10).describe('Number of search results to return (default: 10)'),
  }),
  outputSchema: webSearchOutputSchema,
  onInputStart: ({ toolCallId }: { toolCallId?: string }) => {
    console.log('🔍 Starting web search:', toolCallId);
  },
  onInputAvailable: ({ input, toolCallId }: { input: { query: string }, toolCallId?: string }) => {
    console.log('🔍 Search query ready:', input.query, toolCallId);
  },
  execute: async ({ query, count = 10 }: { query: string, count?: number }) => {
    try {
      // Per-request throttling and deduplication
      const reqId = (globalThis as any).__requestId || 'no-request'
      const store = (globalThis as any).__webSearchPerReq || ((globalThis as any).__webSearchPerReq = {})
      const entry: { count: number; queries: Set<string> } = store[reqId] || (store[reqId] = { count: 0, queries: new Set() })
      const normalized = query.trim().toLowerCase()
      if (entry.queries.has(normalized)) {
        // Duplicate query within the same turn: serve from cache if any, else soft-limit
        const key = `${normalized}::${count}`
        const cached = searchCache[key]
        if (cached) {
          return { ...cached.data, note: (cached.data.note || '') + (detectLanguage(query) === 'es' ? ' (consulta repetida en este turno; usando caché)' : ' (repeated in this turn; using cache)') }
        }
        return {
          success: false,
          message: detectLanguage(query) === 'es' ? 'Búsqueda duplicada en este turno (omitida)' : 'Duplicate search in this turn (skipped)',
          query,
          results: []
        }
      }
  // Allow up to 3 searches for news-like queries to support reasoning models; otherwise 2 per request
  const newsLike = /(news|noticias|esta\s+semana|hoy|últimas|latest|this\s+week|today)/i.test(normalized)
  const maxPerRequest = newsLike ? 3 : 2
  if (entry.count >= maxPerRequest) {
        const key = `${normalized}::${count}`
        const cached = searchCache[key]
        if (cached) {
          return { ...cached.data, note: (cached.data.note || '') + (detectLanguage(query) === 'es' ? ' (límite por turno; usando caché)' : ' (per-turn limit; using cache)') }
        }
        return {
          success: false,
          message: detectLanguage(query) === 'es' ? 'Límite de búsqueda por turno alcanzado' : 'Per-turn search limit reached',
          query,
          results: []
        }
      }
      entry.count++
      entry.queries.add(normalized)

      // Cache first (10 min)
      const key = `${normalized}::${count}`
      const now = Date.now()
      const cached = searchCache[key]
      if (cached && cached.expiry > now) {
        return { ...cached.data, note: (cached.data.note || '') + (detectLanguage(query) === 'es' ? ' (desde caché)' : ' (from cache)') }
      }
      // Support multiple env var names for convenience
      const apiKey =
        process.env.BRAVE_SEARCH_API_KEY ||
        process.env.BRAVE_API_KEY ||
        process.env.SEARCH_API_KEY
      
      if (!apiKey) {
        console.warn('[WebSearch] Brave API key not found in env (BRAVE_SEARCH_API_KEY/BRAVE_API_KEY/SEARCH_API_KEY)')
        throw new Error('BRAVE_SEARCH_API_KEY no está configurada en las variables de entorno')
      }

      console.log(`[WebSearch] Executing search: "${query}" (attempt ${entry.count}/${newsLike ? 3 : 2})`)

      const detected = detectLanguage(query)
      const searchParams = new URLSearchParams({
        q: query,
        count: count.toString(),
        country: 'us',
        search_lang: detected,
        safesearch: 'moderate',
      })

      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`)
      }

  const data: BraveSearchResponse = await response.json()

      if (!data.web?.results || data.web.results.length === 0) {
        return {
          success: false,
          message: `No se encontraron resultados para la consulta: "${query}"`,
          query: data.query.original,
          results: []
        }
      }

      // Deduplicate by hostname and cap to 6; prefer fresher items by page_age when available
      const mapped = data.web.results.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description,
        hostname: result.meta_url?.hostname || new URL(result.url).hostname,
        age: result.page_age || 'Fecha desconocida'
      }))
      // Parse age string like '2d', '5h', '30m' into minutes (lower is fresher)
      const parseAgeToMinutes = (age?: string): number => {
        if (!age) return Number.MAX_SAFE_INTEGER
        const m = String(age).match(/(\d+)\s*(y|yr|years|d|day|days|h|hr|hour|hours|m|min|mins|minute|minutes)/i)
        if (!m) return Number.MAX_SAFE_INTEGER
        const n = parseInt(m[1], 10)
        const unit = m[2].toLowerCase()
        if (unit.startsWith('y')) return n * 525600
        if (unit.startsWith('d')) return n * 1440
        if (unit.startsWith('h')) return n * 60
        return n
      }
      mapped.sort((a, b) => parseAgeToMinutes(a.age) - parseAgeToMinutes(b.age))
      const seen = new Set<string>()
      const deduped = mapped.filter(r => {
        const host = (r.hostname || '').toLowerCase()
        if (seen.has(host)) return false
        seen.add(host)
        return true
      }).slice(0, 6)

      const { summary, insights } = summarizeResults(data.query.original, deduped, detected)

      // Heuristic: if query contains "clide" but top hosts mention "cline", add a soft note
      const qLower = String(data.query.original || '').toLowerCase()
      const hasCline = deduped.some(r => String(r.hostname || '').toLowerCase().includes('cline'))
      const note = (qLower.includes('clide') && hasCline)
        ? (detected === 'es'
            ? '¿Querías decir "Cline"? Varias fuentes apuntan a ese nombre.'
            : 'Did you mean "Cline"? Several sources point to that name.')
        : undefined

      const payload = {
        success: true,
        message: `Se encontraron ${mapped.length} resultados para la consulta: "${data.query.original}"`,
        query: data.query.original,
        results: deduped,
        total_results: mapped.length,
        summary,
        insights,
        note,
      }
      searchCache[key] = { data: payload as any, expiry: now + 10 * 60 * 1000 }
      console.log(`[WebSearch] Success: "${data.query.original}" -> ${deduped.length} results`)
      return payload

    } catch (error) {
      console.error('[WebSearch] Failed:', error)
      return {
        success: false,
        message: `Error al realizar la búsqueda: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        query,
        results: []
      }
    }
  },
} as any)
