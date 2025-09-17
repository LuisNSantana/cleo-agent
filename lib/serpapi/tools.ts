/**
 * SerpAPI Tool Suite for Apu Agent
 * Provides structured, typed search capabilities over Google (base), News, Scholar, Autocomplete, Maps
 * Implements caching, basic rate limiting per request, and safety fallbacks.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { resolveSerpapiKey } from './credentials'
import { getCurrentUserId } from '@/lib/server/request-context'

// Simple in-memory cache (shared in server runtime). TTL short to avoid stale data.
interface CacheEntry { data: any; expiry: number }
const serpCache: Record<string, CacheEntry> = (globalThis as any).__serpapiCache || ((globalThis as any).__serpapiCache = {})

function setCache(key: string, data: any, ttlMs = 60_000) {
	serpCache[key] = { data, expiry: Date.now() + ttlMs }
}
function getCache(key: string) {
	const e = serpCache[key]
	if (e && e.expiry > Date.now()) return e.data
	return null
}

// Shared fetch wrapper
async function serpFetch(params: Record<string, string | number | boolean | undefined>, apiKey: string) {
	const qs = Object.entries(params)
		.filter(([, v]) => v !== undefined && v !== null && v !== '')
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&')
	const url = `https://serpapi.com/search.json?${qs}&api_key=${encodeURIComponent(apiKey)}`
	const res = await fetch(url, { headers: { 'User-Agent': 'cleo-apu-serpapi' } })
	if (res.status === 401 || res.status === 403) throw new Error('Unauthorized SerpAPI key')
	if (res.status === 429) throw new Error('Rate limited (429) from SerpAPI')
	if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`)
	return res.json()
}

// Base schemas
const baseSearchInput = {
	q: z.string().min(1).max(300).describe('Query text. Prefer English for broader results; Spanish supported.'),
	num: z.number().min(1).max(20).default(10).describe('Number of organic results (1-20).'),
	safe: z.enum(['active', 'off']).default('off').describe('Safe search filter.'),
	location: z.string().optional().describe('Location bias (e.g., "Madrid,Spain", "United States").'),
	hl: z.string().optional().describe('Host language code (en, es, fr...).'),
	gl: z.string().optional().describe('Country code for results (us, es, fr).')
}

// Rate limit per request context (not persisted). Prevent tool abuse inside one reasoning pass.
interface ReqLimit { count: number; started: number }
const perReqLimits: Record<string, ReqLimit> = (globalThis as any).__serpapiReqLimits || ((globalThis as any).__serpapiReqLimits = {})

function checkLimit(tag: string, max = 6) {
	const now = Date.now()
	const bucket = perReqLimits[tag] || (perReqLimits[tag] = { count: 0, started: now })
	if (now - bucket.started > 15_000) { // reset after 15s
		bucket.count = 0; bucket.started = now
	}
	bucket.count++
	if (bucket.count > max) throw new Error('Too many SerpAPI calls in single request context')
}

// Utility to normalize organic results for consistent output shape
function normalizeOrganic(raw: any[]): Array<{ title: string; link: string; snippet?: string }> {
	return (raw || []).slice(0, 20).map((r: any) => ({
		title: r.title || r.heading || 'Untitled',
		link: r.link || r.url || '',
		snippet: r.snippet || r.snippet_highlighted_words?.join(' ') || r.content
	}))
}

// GENERAL SEARCH ------------------------------------------------------------
export const serpGeneralSearchTool = tool({
	description: 'SerpAPI Google general search. Structured organic results with caching & light limits.',
	inputSchema: z.object(baseSearchInput),
	execute: async (input) => {
		// Normalize common alias used by models
		const anyIn = input as any
		if (!('q' in input) && typeof anyIn?.query === 'string') {
			(input as any).q = anyIn.query
		}
		if (!input.q || !String(input.q).trim()) {
			return { error: 'Missing query. Provide q (or query) with your search text.' }
		}
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured (user or env).' }
		const cacheKey = `general:${JSON.stringify(input)}:${userId || 'anon'}`
		const cached = getCache(cacheKey)
		if (cached) return { ...cached, cached: true }
		checkLimit(userId || 'anon')
		try {
			const json = await serpFetch({ engine: 'google', q: input.q, num: input.num, safe: input.safe, location: input.location, hl: input.hl, gl: input.gl }, key)
			const organic = normalizeOrganic(json.organic_results)
			const result = { query: input.q, results: organic, engine: 'google', timing: json.search_metadata?.total_time_taken }
			setCache(cacheKey, result)
			return result
		} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

// NEWS SEARCH ---------------------------------------------------------------
export const serpNewsSearchTool = tool({
	description: 'SerpAPI Google News search for current event related queries.',
	inputSchema: z.object({ ...baseSearchInput, q: baseSearchInput.q.describe('News query'), tbs: z.string().optional().describe('Time based search, e.g., qdr:d (day), qdr:w (week)') }),
	execute: async (input) => {
		// Normalize alias for query
		const anyIn = input as any
		if (!('q' in input) && typeof anyIn?.query === 'string') {
			(input as any).q = anyIn.query
		}
		if (!input.q || !String(input.q).trim()) {
			return { error: 'Missing query. Provide q (or query) with your news search text.' }
		}
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		const cacheKey = `news:${JSON.stringify(input)}:${userId || 'anon'}`
		const cached = getCache(cacheKey); if (cached) return { ...cached, cached: true }
		checkLimit(userId || 'anon')
		try {
			const json = await serpFetch({ engine: 'google_news', q: input.q, hl: input.hl, gl: input.gl, num: input.num, tbs: input.tbs }, key)
			const articles = (json.articles || []).slice(0, input.num).map((a: any) => ({
				title: a.title,
				link: a.link,
				source: a.source,
				date: a.date,
				snippet: a.snippet
			}))
			const result = { query: input.q, articles, engine: 'google_news', timing: json.search_metadata?.total_time_taken }
			setCache(cacheKey, result, 45_000)
			return result
		} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

// SCHOLAR (fallback) --------------------------------------------------------
export const serpScholarSearchTool = tool({
	description: 'SerpAPI Google Scholar search (academic). If engine quota restricted, returns fallback notice.',
	inputSchema: z.object({ ...baseSearchInput, num: baseSearchInput.num.default(8) }),
	execute: async (input) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		const cacheKey = `scholar:${JSON.stringify(input)}:${userId || 'anon'}`
		const cached = getCache(cacheKey); if (cached) return { ...cached, cached: true }
		checkLimit(userId || 'anon')
		try {
			const json = await serpFetch({ engine: 'google_scholar', q: input.q, num: input.num, hl: input.hl }, key)
			if (json?.error) throw new Error(json.error)
			const papers = (json.organic_results || []).slice(0, input.num).map((p: any) => ({
				title: p.title,
				link: p.link,
				snippet: p.snippet,
				cited_by: p.inline_links?.cited_by?.total || null,
				publication: p.publication || p.source,
				year: p.publication_info?.summary?.match(/\b(19|20)\d{2}\b/)?.[0] || null
			}))
			const result = { query: input.q, papers, engine: 'google_scholar' }
			setCache(cacheKey, result, 120_000)
			return result
		} catch (e) {
			return { error: e instanceof Error ? e.message : 'Unknown error', fallback: 'Consider general search if Scholar quota blocked.' }
		}
	}
})

// AUTOCOMPLETE --------------------------------------------------------------
export const serpAutocompleteTool = tool({
	description: 'SerpAPI Google autocomplete suggestions for a partial query.',
	inputSchema: z.object({ prefix: z.string().min(1).max(100).describe('Partial query prefix'), hl: z.string().optional() }),
	execute: async ({ prefix, hl }) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		const cacheKey = `ac:${prefix}:${hl || 'na'}:${userId || 'anon'}`
		const cached = getCache(cacheKey); if (cached) return { ...cached, cached: true }
		checkLimit(userId || 'anon')
		try {
			const json = await serpFetch({ engine: 'google_autocomplete', q: prefix, hl }, key)
			const suggestions = (json.suggestions || []).map((s: any) => s.value || s)
			const result = { prefix, suggestions, engine: 'google_autocomplete' }
			setCache(cacheKey, result, 30_000)
			return result
		} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

// MAPS / LOCATION -----------------------------------------------------------
export const serpLocationSearchTool = tool({
	description: 'SerpAPI Google Maps local results (places).',
	inputSchema: z.object({ q: z.string().min(1), ll: z.string().optional().describe('Latitude,Longitude or data key'), type: z.string().optional(), num: z.number().min(1).max(10).default(5) }),
	execute: async (input) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		const cacheKey = `loc:${JSON.stringify(input)}:${userId || 'anon'}`
		const cached = getCache(cacheKey); if (cached) return { ...cached, cached: true }
		checkLimit(userId || 'anon')
		try {
			const json = await serpFetch({ engine: 'google_maps', q: input.q, ll: input.ll, type: input.type, num: input.num }, key)
			const local_results = (json.local_results || []).slice(0, input.num).map((r: any) => ({
				title: r.title,
				rating: r.rating,
				reviews: r.reviews,
				type: r.type,
				address: r.address,
				phone: r.phone,
				link: r.link
			}))
			const result = { query: input.q, places: local_results, engine: 'google_maps' }
			setCache(cacheKey, result, 90_000)
			return result
		} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

// RAW (debug / advanced) ----------------------------------------------------
export const serpRawTool = tool({
	description: 'Raw SerpAPI passthrough. Accepts limited known params; returns JSON subset for debugging advanced queries.',
	inputSchema: z.object({
		engine: z.string().min(1).describe('SerpAPI engine (e.g., google, google_news, google_scholar, google_maps).'),
		q: z.string().optional(),
		params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Additional query params'),
		num: z.number().min(1).max(20).optional(),
		hl: z.string().optional(),
		gl: z.string().optional()
	}),
	execute: async ({ engine, q, params = {}, num, hl, gl }) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		checkLimit(userId || 'anon', 4)
		try {
			const merged: Record<string, any> = { engine, q, num, hl, gl, ...params }
			const json = await serpFetch(merged, key)
			// Return limited subset to prevent huge payload flooding tokens
			const subset: any = {
				search_metadata: json.search_metadata,
				search_parameters: json.search_parameters,
				organic_results: (json.organic_results || []).slice(0, 5),
				error: json.error
			}
			return subset
		} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

// MARKETS (initial wrappers) -------------------------------------------------
// Note: Finance engines in SerpAPI vary by plan; we use stable engines (google, google_news)
// and normalize a compact shape with graceful fallbacks.

export const stockQuoteTool = tool({
	description: 'Get a quick stock quote context via Google results (beta). Returns top organic link and any detected finance snippet.',
	inputSchema: z.object({
		symbol: z.string().min(1).describe('Ticker symbol, e.g., AAPL, MSFT, TSLA'),
		hl: z.string().optional(),
		gl: z.string().optional()
	}),
	execute: async ({ symbol, hl, gl }) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		checkLimit(userId || 'anon')
		try {
			const q = `${symbol} stock price`
			const json = await serpFetch({ engine: 'google', q, hl, gl, num: 5 }, key)
			const organic = normalizeOrganic(json.organic_results)
			// Best-effort extraction from knowledge_graph/answer_box if present
			const kg = (json as any).knowledge_graph || {}
			const answer = (json as any).answer_box || {}
			const finance = {
				name: kg.title || kg.name || symbol,
				price: answer.price || kg.price || null,
				currency: answer.currency || kg.currency || null,
				price_change: answer.price_change || kg.price_change || null,
				price_change_percent: answer.price_change_percent || kg.price_change_percentage || null,
				as_of: answer.datetime || kg.date || json.search_metadata?.created_at || null
			}
			const sources = organic.slice(0, 3).map(r => ({ title: r.title, link: r.link }))
			return { symbol, query: q, finance, sources, engine: 'google' }
		} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

export const marketNewsTool = tool({
	description: 'Get latest market news for a ticker via Google News (beta).',
	inputSchema: z.object({
		symbol: z.string().min(1).describe('Ticker symbol, e.g., AAPL'),
		tbs: z.string().optional().describe('Time window, e.g., qdr:d (day), qdr:w (week)'),
		hl: z.string().optional(),
		gl: z.string().optional(),
		num: z.number().min(1).max(10).default(6)
	}),
		execute: async ({ symbol, tbs, hl, gl, num }) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		checkLimit(userId || 'anon')
		try {
			const q = `${symbol} stock`
				// Primary: Google News
				try {
					const json = await serpFetch({ engine: 'google_news', q, hl, gl, num, tbs }, key)
					const articles = (json.articles || []).slice(0, num).map((a: any) => ({
						title: a.title,
						link: a.link,
						source: a.source,
						date: a.date,
						snippet: a.snippet
					}))
					if (articles.length > 0) return { symbol, query: q, articles, engine: 'google_news' }
				} catch (err) {
					// Proceed to fallback
				}
				// Fallback: General Google search restricted to news-y sources
				const altQ = `${symbol} stock site:reuters.com OR site:bloomberg.com OR site:cnbc.com OR site:finance.yahoo.com`
				const count = Math.min(10, Math.max(5, typeof num === 'number' ? num : 6))
				const gjson = await serpFetch({ engine: 'google', q: altQ, hl, gl, num: count }, key)
				const organic = normalizeOrganic(gjson.organic_results)
				const articles = organic.slice(0, num).map((r: any) => ({
					title: r.title,
					link: r.link,
					source: (r.link || '').split('/')[2] || 'source',
					date: undefined,
					snippet: r.snippet
				}))
				return { symbol, query: altQ, articles, engine: 'google (fallback)' }
			} catch (e) { return { error: e instanceof Error ? e.message : 'Unknown error' } }
	}
})

// STOCK CHART CANDIDATES & VOLATILITY (best-effort via SerpAPI) -----------
export const stockChartAndVolatilityTool = tool({
	description: 'Get chart candidates (Google/Yahoo Finance links, thumbnails) and a best-effort volatility proxy using SerpAPI results. Useful for rendering a chart (via screenshot or external chart service) and quick context.',
	inputSchema: z.object({
		symbol: z.string().min(1).describe('Ticker symbol, e.g., AAPL, MSFT, TSLA'),
		period: z.enum(['1d','5d','1m','3m','6m','ytd','1y','5y','max']).default('1m').describe('Desired chart period (target view only; data not fetched).'),
		timeframe: z.enum(['intraday','daily','weekly']).default('daily').describe('Desired timeframe granularity (target view only).'),
		hl: z.string().optional(),
		gl: z.string().optional()
	}),
	execute: async ({ symbol, period, timeframe, hl, gl }) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { success: false, error: 'No SerpAPI key configured.' }
		checkLimit(userId || 'anon')
		try {
			const q = `${symbol} stock price`
			const json = await serpFetch({ engine: 'google', q, hl, gl, num: 10 }, key)
					const organic = (json.organic_results || []).slice(0, 10)
					type ChartCandidate = {
						title: string
						link: string
						snippet?: string
						domain?: string
						thumbnail?: string
					}
			// Prefer common finance sites
			const preferredDomains = ['finance.yahoo.com', 'google.com/finance', 'www.marketwatch.com', 'www.investing.com', 'www.bloomberg.com']
					const candidates: ChartCandidate[] = organic
						.map((r: any): ChartCandidate => ({
					title: r.title || r.heading || 'Untitled',
					link: r.link || r.url || '',
					snippet: r.snippet || r.snippet_highlighted_words?.join(' '),
					domain: (r.link || r.url || '').split('/').slice(0,3).join('/'),
							thumbnail: (r.thumbnail || r.richtitle_data?.image?.src) || undefined
				}))
						.filter((c: ChartCandidate) => c.link)
						.sort((a: ChartCandidate, b: ChartCandidate) => {
					const aPref = preferredDomains.some(d => (a.link || '').includes(d)) ? 1 : 0
					const bPref = preferredDomains.some(d => (b.link || '').includes(d)) ? 1 : 0
					return bPref - aPref
				})
				.slice(0, 6)

			// Try to extract quick finance context & a crude intraday volatility proxy if possible
			const kg: any = (json as any).knowledge_graph || {}
			const ab: any = (json as any).answer_box || {}
			const price = ab.price || kg.price || null
			const currency = ab.currency || kg.currency || null
			const open = ab?.open || kg?.open || null
			const dayHigh = ab?.high || kg?.high || null
			const dayLow = ab?.low || kg?.low || null
			let volatility_proxy: number | null = null
			if (open && dayHigh && dayLow) {
				const o = Number(String(open).replace(/[^0-9.\-]/g, ''))
				const hi = Number(String(dayHigh).replace(/[^0-9.\-]/g, ''))
				const lo = Number(String(dayLow).replace(/[^0-9.\-]/g, ''))
				if (o > 0 && hi && lo) volatility_proxy = (hi - lo) / o
			}

			const as_of = ab.datetime || kg.date || json.search_metadata?.created_at || null

			return {
				success: true,
				symbol,
				period,
				timeframe,
				chart_candidates: candidates,
				finance_summary: { price, currency, as_of },
				volatility_proxy,
				notes: volatility_proxy === null ? 'Volatility proxy needs intraday high/low/open; if unavailable, consider generating a chart or using table fallback.' : undefined
			}
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}
})

// GOOGLE TRENDS SEARCH -----------------------------------------------------
export const serpTrendsSearchTool = tool({
	description: 'SerpAPI Google Trends search for trending topics, interest over time, and related queries.',
	inputSchema: z.object({
		q: z.string().min(1).max(200).describe('Search query or topic to analyze trends for'),
		geo: z.string().optional().describe('Geographic location (e.g., "US", "ES", "US-CA", "worldwide")'),
		date: z.string().optional().describe('Date range (e.g., "today 12-m", "today 5-y", "2023-01-01 2023-12-31")'),
		cat: z.string().optional().describe('Category ID (e.g., "0" for all, "3" for business, "7" for health)'),
		data_type: z.enum(['TIMESERIES', 'GEO_MAP', 'RELATED_TOPICS', 'RELATED_QUERIES']).default('TIMESERIES').describe('Type of trends data to retrieve')
	}),
	execute: async (input) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		
		const cacheKey = `trends:${JSON.stringify(input)}:${userId || 'anon'}`
		const cached = getCache(cacheKey)
		if (cached) return { ...cached, cached: true }
		
		checkLimit(userId || 'anon')
		
		try {
			const json = await serpFetch({ 
				engine: 'google_trends', 
				q: input.q,
				geo: input.geo,
				date: input.date,
				cat: input.cat,
				data_type: input.data_type
			}, key)
			
			let result: any = { query: input.q, data_type: input.data_type, engine: 'google_trends' }
			
			// Parse different types of trends data
			if (input.data_type === 'TIMESERIES' && json.interest_over_time) {
				result.interest_over_time = json.interest_over_time.timeline_data
			} else if (input.data_type === 'RELATED_TOPICS' && json.related_topics) {
				result.related_topics = {
					rising: json.related_topics.rising?.map((t: any) => ({ topic: t.topic?.title, value: t.value })) || [],
					top: json.related_topics.top?.map((t: any) => ({ topic: t.topic?.title, value: t.value })) || []
				}
			} else if (input.data_type === 'RELATED_QUERIES' && json.related_queries) {
				result.related_queries = {
					rising: json.related_queries.rising?.map((q: any) => ({ query: q.query, value: q.value })) || [],
					top: json.related_queries.top?.map((q: any) => ({ query: q.query, value: q.value })) || []
				}
			} else if (input.data_type === 'GEO_MAP' && json.interest_by_region) {
				result.interest_by_region = json.interest_by_region
			}
			
			setCache(cacheKey, result, 300_000) // 5 minute cache for trends
			return result
		} catch (e) { 
			return { error: e instanceof Error ? e.message : 'Unknown error' } 
		}
	}
})

// TRENDING NOW SEARCH ------------------------------------------------------
export const serpTrendingNowTool = tool({
	description: 'SerpAPI Google Trends Trending Now - get current trending search queries and topics.',
	inputSchema: z.object({
		geo: z.string().default('US').describe('Geographic location (e.g., "US", "ES", "GB", "worldwide")'),
		hl: z.string().default('en').describe('Language code (e.g., "en", "es", "fr")')
	}),
	execute: async (input) => {
		const userId = getCurrentUserId()
		const key = await resolveSerpapiKey(userId)
		if (!key) return { error: 'No SerpAPI key configured.' }
		
		const cacheKey = `trending_now:${JSON.stringify(input)}:${userId || 'anon'}`
		const cached = getCache(cacheKey)
		if (cached) return { ...cached, cached: true }
		
		checkLimit(userId || 'anon')
		
		try {
			const json = await serpFetch({ 
				engine: 'google_trends_trending_now',
				geo: input.geo,
				hl: input.hl
			}, key)
			
			const trending = {
				geo: input.geo,
				language: input.hl,
				trending_searches: json.trending_searches?.map((search: any) => ({
					query: search.query?.query,
					formattedTraffic: search.formattedTraffic,
					relatedQueries: search.relatedQueries?.map((rq: any) => rq.query),
					image: search.image?.imageUrl,
					news: search.articles?.map((article: any) => ({
						title: article.title,
						url: article.url,
						source: article.source,
						time: article.timeAgo
					}))
				})) || [],
				realtime_searches: json.realtime_searches?.map((search: any) => ({
					query: search.query?.query,
					formattedTraffic: search.formattedTraffic,
					relatedQueries: search.relatedQueries?.map((rq: any) => rq.query)
				})) || []
			}
			
			setCache(cacheKey, trending, 180_000) // 3 minute cache for trending now
			return trending
		} catch (e) { 
			return { error: e instanceof Error ? e.message : 'Unknown error' } 
		}
	}
})

// COLLECTION EXPORT ---------------------------------------------------------
export const serpapiTools = {
	serpGeneralSearch: serpGeneralSearchTool,
	serpNewsSearch: serpNewsSearchTool,
	serpScholarSearch: serpScholarSearchTool,
	serpAutocomplete: serpAutocompleteTool,
	serpLocationSearch: serpLocationSearchTool,
	serpRaw: serpRawTool,
	// Trends
	serpTrendsSearch: serpTrendsSearchTool,
	serpTrendingNow: serpTrendingNowTool,
	// Markets
	stockQuote: stockQuoteTool,
	marketNews: marketNewsTool,
	stockChartAndVolatility: stockChartAndVolatilityTool
}

export type SerpapiToolNames = keyof typeof serpapiTools

// ---------------------------------------------------------------------------
// (Optional) Credential management tool helpers (internal use or future UI)
// Keeping minimal; not automatically registered globally to avoid clutter.
// ---------------------------------------------------------------------------
import { addSerpapiKey, listSerpapiKeys, deleteSerpapiKey, testSerpapiKey } from './credentials'

export const addSerpapiKeyTool = tool({
	description: 'Store (and activate) a SerpAPI key for current user (replaces previous active).',
	inputSchema: z.object({
		api_key: z.string().min(20).describe('SerpAPI API key'),
		label: z.string().min(1).max(60).default('primary')
	}),
		execute: async ({ api_key, label }) => {
		const userId = getCurrentUserId(); if (!userId) return { success: false, error: 'No user context' }
		const test = await testSerpapiKey(api_key)
		if (!test.success) return { success: false, error: `Key validation failed: ${test.error}` }
			const r = await addSerpapiKey(userId, { api_key, label: label || 'primary', is_active: true })
		if (!r.success) return { success: false, error: r.error }
		return { success: true, message: 'SerpAPI key stored & active', id: r.data?.id }
	}
})

export const listSerpapiKeysTool = tool({
	description: 'List stored SerpAPI keys (metadata only).',
	inputSchema: z.object({}),
	execute: async () => {
		const userId = getCurrentUserId(); if (!userId) return { success: false, error: 'No user context' }
		const r = await listSerpapiKeys(userId)
		return r.success ? { success: true, keys: r.data } : { success: false, error: r.error }
	}
})

export const deleteSerpapiKeyTool = tool({
	description: 'Delete a stored SerpAPI key by id.',
	inputSchema: z.object({ id: z.string().min(1) }),
	execute: async ({ id }) => {
		const userId = getCurrentUserId(); if (!userId) return { success: false, error: 'No user context' }
		const r = await deleteSerpapiKey(userId, id)
		return r.success ? { success: true } : { success: false, error: r.error }
	}
})

export const testSerpapiKeyTool = tool({
	description: 'Test a SerpAPI key (not stored) to verify validity/quota.',
	inputSchema: z.object({ api_key: z.string().min(20) }),
	execute: async ({ api_key }) => await testSerpapiKey(api_key)
})

export const serpapiCredentialTools = {
	addSerpapiKey: addSerpapiKeyTool,
	listSerpapiKeys: listSerpapiKeysTool,
	deleteSerpapiKey: deleteSerpapiKeyTool,
	testSerpapiKey: testSerpapiKeyTool
}

