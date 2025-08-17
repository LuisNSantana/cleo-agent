import { tool } from 'ai'
import { z } from 'zod'
import { detectLanguage } from '@/lib/language-detection'

// Enhanced types for Brave Search response (added summarizer and goggles support)
interface BraveSearchResult {
  title: string
  url: string
  description: string
  snippet?: string  // Longer excerpts
  page_age?: string
  extra_snippets?: string[]  // Additional context
  thumbnail?: { src: string }  // Visual enrichment
  meta_url?: {
    hostname: string
    scheme?: string
    path?: string
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
    spellcheck_off?: boolean
    suggested?: string  // For query refinement
  }
  summarizer?: {
    key?: string
    summary?: string  // AI-generated summary
  }
}

// Tavily types (simple mapping)
interface TavilyResult {
  title: string
  url: string
  content: string  // Equivalent to snippet/description
  score: number
  raw_content?: string
}

interface TavilyResponse {
  answer: string
  query: string
  results: TavilyResult[]
  follow_up_questions: string[] | null
  response_time: number
  images?: Array<{ url: string }>
}

// Improved output schema: Added favicon, AI summary, suggested query, refined clusters
const webSearchOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  query: z.string(),
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string(),
    snippet: z.string().optional(),
    hostname: z.string(),
    age: z.string(),
    thumbnail: z.string().optional(),
    favicon: z.string().optional()  // Favicon URL for website logos
  })),
  total_results: z.number().optional(),
  ai_summary: z.string().optional(),  // Brave AI summarizer or Tavily answer
  suggested_query: z.string().optional(),  // For refinements
  insights: z.array(z.string()).optional(),
  clusters: z.array(z.object({
    title: z.string(),
    results: z.array(z.number())
  })).optional(),
  note: z.string().optional(),
  source: z.enum(['brave', 'tavily']).describe('Primary source used')  // New: Indicate which API provided results
})

// Advanced LRU Cache with auto-eviction and size limit
class LRUCache<T> {
  private max: number
  private cache: Map<string, { data: T; expiry: number }>

  constructor(max = 200) {  // Increased for better hit rate in production
    this.max = max
    this.cache = new Map()
  }

  get(key: string): { data: T; expiry: number } | undefined {
    const item = this.cache.get(key)
    if (item) {
      this.cache.delete(key)
      this.cache.set(key, item)
    }
    return item
  }

  set(key: string, value: { data: T; expiry: number }): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value
      if (typeof firstKey === 'string') {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  evictExpired(): void {
    const now = Date.now()
    for (const [key, { expiry }] of this.cache) {
      if (expiry <= now) {
        this.cache.delete(key)
      }
    }
  }
}

const searchCache = new LRUCache<z.infer<typeof webSearchOutputSchema>>(200)

// Enhanced summarization: Generate clustered insights and better summary
function summarizeResults(
  query: string,
  results: Array<{ title: string; description: string; snippet?: string }>,
  lang: 'es' | 'en',
  aiSummary?: string
): { summary: string; insights: string[]; clusters: { title: string; results: number[] }[] } {
  const topResults = results.slice(0, 10)  // Increased for better clustering
  const titles = topResults.map(r => (r.title || '').trim()).filter(Boolean)
  const descriptions = topResults.map(r => (r.description || r.snippet || '').trim()).filter(Boolean)

  // Improved clustering: Use more keywords, filter small clusters
  const clusters: { title: string; results: number[] }[] = []
  const keywordGroups = new Map<string, number[]>()
  topResults.forEach((r, i) => {
    const keywords = [...new Set((r.title + ' ' + r.description).toLowerCase().match(/\b\w{4,}\b/g) || [])].slice(0, 5)  // More keywords
    keywords.forEach(k => {
      if (!keywordGroups.has(k)) keywordGroups.set(k, [])
      keywordGroups.get(k)!.push(i)
    })
  })
  Array.from(keywordGroups.entries())
    .filter(([, idxs]) => idxs.length > 1)  // Min size 2
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)  // Max 4 clusters
    .forEach(([k, idxs]) => clusters.push({ title: k.charAt(0).toUpperCase() + k.slice(1), results: idxs }))

  // Insights: Concise key points from descriptions
  const insights = descriptions.slice(0, 5).map(d => d.slice(0, 120) + '...')

  const summary = (aiSummary ? aiSummary.slice(0, 200) + '...' : '') || (lang === 'es'
    ? `Resumen sobre "${query.trim()}": ${titles[0] || 'varios resultados relevantes.'} (Clusters: ${clusters.map(c => c.title).join(', ') || 'ninguno'}).`
    : `Summary on "${query.trim()}": ${titles[0] || 'several relevant results.'} (Clusters: ${clusters.map(c => c.title).join(', ') || 'none'}).`)

  return { summary, insights, clusters }
}

// Helper function for Tavily search
async function tavilySearch({ query, language, count, use_summarizer }: { query: string; language: 'es' | 'en'; count: number; use_summarizer: boolean }) {
  // Support both TAVILY_API_KEY and TAVILYAPIKEY for flexibility
  const tavilyKey = process.env.TAVILY_API_KEY || (process.env as any).TAVILYAPIKEY
  if (!tavilyKey) {
    throw new Error('TAVILY_API_KEY not configured')
  }

  const tavilyParams = {
    api_key: tavilyKey,
    query,
    search_depth: 'advanced',
    include_images: true,
    include_answer: use_summarizer,
    max_results: count,
    include_raw_content: false,  // Avoid heavy content
    // No direct language, but query lang influences
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tavilyParams)
  })

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`)
  }

  const data: TavilyResponse = await response.json()
  return data
}

export const webSearchTool = tool({
  description: 'Advanced web search with automatic fallback: Primary Tavily (default), if no results fallback to Brave (or vice versa if Brave primary). Optimized for potency: Supports operators, freshness, AI summarizer, Goggles (Brave), clustered insights, extended snippets, favicons. Default English queries for comprehensive results (auto-translate es). Use for fresh news, technical docs. Prioritize current info.',
  inputSchema: z.object({
    query: z.string().min(1).max(400).describe('Search query in English by default (auto-translated if es). Supports: site:domain.com, filetype:pdf, "phrase", -exclude, intitle:term.'),
    count: z.number().min(1).max(50).optional().default(15).describe('Number of results (max 50).'),
    freshness: z.enum(['d', 'w', 'm', 'y', 'pd', 'pw', 'pm', 'py']).optional().describe('Recency: d=day, w=week, etc.'),
    language: z.enum(['es', 'en']).optional().default('en').describe('Language (en for more info).'),
    goggles_id: z.enum(['code', 'research', 'news', 'discussions']).optional().describe('Goggles: code (programming), etc.'),
    use_summarizer: z.boolean().optional().default(true).describe('AI summary.'),
  primary: z.enum(['brave', 'tavily']).optional().default('tavily').describe('Primary API (tavily/brave).')
  }),
  outputSchema: webSearchOutputSchema,
  onInputStart: ({ toolCallId }: { toolCallId?: string }) => {
    console.log('🔍 Starting advanced web search with fallback:', toolCallId);
  },
  onInputAvailable: ({ input, toolCallId }: { input: { query: string }, toolCallId?: string }) => {
    console.log('🔍 Search query ready:', input.query, toolCallId);
  },
  execute: async ({ query, count = 15, freshness, language = 'en', goggles_id, use_summarizer = true, primary = 'brave' }: { query: string, count?: number, freshness?: string, language?: 'es' | 'en', goggles_id?: string, use_summarizer?: boolean, primary?: 'brave' | 'tavily' }) => {
    try {
      // Auto-translate to English if es and en preferred
      const detected = detectLanguage(query)
      let effectiveQuery = query
      if (detected === 'es' && language === 'en') {
        // Placeholder; real: use translate API
        effectiveQuery = query
          .replace(/búsqueda/g, 'search')
          .replace(/noticias/g, 'news')
        console.log(`[WebSearch] Translated: "${query}" -> "${effectiveQuery}"`)
      }

      // Throttling/deduplication (NON-BLOCKING)
      const reqId = (globalThis as any).__requestId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      const store = (globalThis as any).__webSearchPerReq || ((globalThis as any).__webSearchPerReq = {})
      const entry: { count: number; queries: Set<string> } = store[reqId] || (store[reqId] = { count: 0, queries: new Set() })
      const normalized = `${effectiveQuery.trim().toLowerCase()}::${freshness || 'none'}::${goggles_id || 'none'}::${primary}`

      // Build cache key up-front (used by duplicate/limit logic)
      const key = `${normalized}::${count}::${language}::${use_summarizer}`
      const now = Date.now()
      const cachedPre = searchCache.get(key)
      if (entry.queries.has(normalized)) {
        if (cachedPre && cachedPre.expiry > now) {
          return { ...cachedPre.data, note: (cachedPre.data.note || '') + (language === 'es' ? ' (repetida; caché)' : ' (repeated; cache)') }
        }
        // Duplicate but no cache: proceed anyway to allow fallback and fresh fetch
        console.log('[WebSearch] Duplicate query without cache; proceeding to fetch to allow fallback.')
      }
      const newsLike = /(news|noticias|esta\s+semana|hoy|últimas|latest|this\s+week|today)/i.test(normalized) || !!freshness || !!goggles_id
      const maxPerRequest = newsLike ? 5 : 3
      let throttled = false
      if (entry.count >= maxPerRequest) {
        if (cachedPre && cachedPre.expiry > now) {
          return { ...cachedPre.data, note: (cachedPre.data.note || '') + (language === 'es' ? ' (límite; caché)' : ' (limit; cache)') }
        }
        // Hit limit but no cached data: continue with reduced cost
        throttled = true
        use_summarizer = false
        count = Math.min(count, 5)
        console.log('[WebSearch] Limit reached for request; proceeding with reduced parameters to fetch at least one result.')
      }
      entry.count++
      entry.queries.add(normalized)

      searchCache.evictExpired()
  const cached = searchCache.get(key)
      const cacheDuration = (freshness || goggles_id) ? 20 * 60 * 1000 : 90 * 60 * 1000
      if (cached && cached.expiry > now) {
        return { ...cached.data, note: (cached.data.note || '') + (language === 'es' ? ' (caché)' : ' (cache)') }
      }

      let results: any[] = []
      let ai_summary = ''
      let suggested_query = ''
      let source = primary
      let apiResponse: any

      // Primary search
      if (primary === 'brave') {
        const braveKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || process.env.SEARCH_API_KEY
        if (braveKey) {
          const searchParams = new URLSearchParams({
            q: effectiveQuery,
            count: count.toString(),
            country: 'us',
            search_lang: language,
            safesearch: 'moderate',
            spellcheck: '1',
          })
          if (freshness) searchParams.append('freshness', freshness)
          if (goggles_id) searchParams.append('goggles_id', goggles_id)
          if (use_summarizer) searchParams.append('summary', '1')

          const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams}`, {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': braveKey,
            },
          })

          if (response.ok) {
            apiResponse = await response.json() as BraveSearchResponse
            if (apiResponse.web?.results?.length > 0) {  // Changed to >0 for fallback trigger
              results = apiResponse.web.results
              ai_summary = apiResponse.summarizer?.summary || ''
              suggested_query = apiResponse.query.suggested || ''
            }
          }
        }
      } else {  // primary 'tavily'
        apiResponse = await tavilySearch({ query: effectiveQuery, language, count, use_summarizer })
        if (apiResponse.results?.length > 0) {
          results = apiResponse.results.map((r: TavilyResult) => ({
            title: r.title,
            url: r.url,
            description: r.content,
            snippet: r.raw_content || r.content,
            page_age: 'Unknown',
            extra_snippets: [],
            thumbnail: { src: apiResponse.images?.[0]?.url || '' },
            meta_url: { hostname: new URL(r.url).hostname }
          }))
          ai_summary = apiResponse.answer || ''
          suggested_query = apiResponse.follow_up_questions?.[0] || ''
        }
      }

      // Fallback if no results
      if (results.length === 0) {
        console.log(`[WebSearch] No results from primary ${primary}, falling back to ${primary === 'brave' ? 'tavily' : 'brave'}`)
        source = primary === 'brave' ? 'tavily' : 'brave'
        if (source === 'tavily') {
          apiResponse = await tavilySearch({ query: effectiveQuery, language, count, use_summarizer })
          if (apiResponse.results?.length > 0) {
            results = apiResponse.results.map((r: TavilyResult) => ({
              title: r.title,
              url: r.url,
              description: r.content,
              snippet: r.raw_content || r.content,
              page_age: 'Unknown',
              extra_snippets: [],
              thumbnail: { src: apiResponse.images?.[0]?.url || '' },
              meta_url: { hostname: new URL(r.url).hostname }
            }))
            ai_summary = apiResponse.answer || ''
            suggested_query = apiResponse.follow_up_questions?.[0] || ''
          }
        } else {
          const braveKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || process.env.SEARCH_API_KEY
          if (braveKey) {
            const searchParams = new URLSearchParams({
              q: effectiveQuery,
              count: count.toString(),
              country: 'us',
              search_lang: language,
              safesearch: 'moderate',
              spellcheck: '1',
            })
            if (freshness) searchParams.append('freshness', freshness)
            if (goggles_id) searchParams.append('goggles_id', goggles_id)
            if (use_summarizer) searchParams.append('summary', '1')

            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams}`, {
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': braveKey,
              },
            })

            if (response.ok) {
              apiResponse = await response.json() as BraveSearchResponse
              if (apiResponse.web?.results?.length > 0) {
                results = apiResponse.web.results
                ai_summary = apiResponse.summarizer?.summary || ''
                suggested_query = apiResponse.query.suggested || ''
              }
            }
          }
        }
      }

      if (results.length === 0) {
        return {
          success: false,
          message: language === 'es' ? 'No resultados en Brave ni Tavily' : 'No results from Brave or Tavily',
          query: effectiveQuery,
          results: [],
          insights: [],
          clusters: []
        }
      }

      // Unified mapping for both APIs
      const mapped = results.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description || result.content,
        snippet: result.extra_snippets?.join(' ') || result.snippet || result.raw_content || result.content || '',
        hostname: result.meta_url?.hostname || new URL(result.url).hostname,
        age: result.page_age || 'Unknown',
        thumbnail: result.thumbnail?.src || '',
        favicon: `https://www.google.com/s2/favicons?domain=${result.meta_url?.hostname || new URL(result.url).hostname}&sz=64`
      }))
      // Sort by age if available
      const parseAgeToMinutes = (age?: string): number => {
        if (!age || age === 'Unknown') return Number.MAX_SAFE_INTEGER
        const m = age.match(/(\d+)\s*(y|d|h|m|s)/i)
        if (!m) return Number.MAX_SAFE_INTEGER
        const n = parseInt(m[1])
        switch (m[2].toLowerCase()) {
          case 'y': return n * 525600
          case 'd': return n * 1440
          case 'h': return n * 60
          case 'm': return n
          case 's': return n / 60
          default: return Number.MAX_SAFE_INTEGER
        }
      }
      mapped.sort((a, b) => parseAgeToMinutes(a.age) - parseAgeToMinutes(b.age))
      // Dedup by URL
      const seen = new Set<string>()
      const deduped = mapped.filter(r => !seen.has(r.url.toLowerCase()) && seen.add(r.url.toLowerCase()))

      const { summary, insights, clusters } = summarizeResults(effectiveQuery, deduped, language, ai_summary)

      const payload = {
        success: true,
        message: `${results.length} results (deduped to ${deduped.length}) from ${source}`,
        query: effectiveQuery,
        results: deduped,
        total_results: results.length,
        ai_summary,
        suggested_query,
        insights,
        clusters,
        source
      }
      searchCache.set(key, { data: payload as any, expiry: now + cacheDuration })
      console.log(`[WebSearch] Success: ${deduped.length} results from ${source} (clusters: ${clusters.length}, AI summary: ${!!ai_summary})`)
      return payload

    } catch (error) {
      console.error('[WebSearch] Failed:', error)
      return {
        success: false,
        message: `Search error: ${error instanceof Error ? error.message : 'Unknown'}`,
        query,
        results: [],
        insights: [],
        clusters: []
      }
    }
  },
} as any)