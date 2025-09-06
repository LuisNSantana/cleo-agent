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

// COLLECTION EXPORT ---------------------------------------------------------
export const serpapiTools = {
	serpGeneralSearch: serpGeneralSearchTool,
	serpNewsSearch: serpNewsSearchTool,
	serpScholarSearch: serpScholarSearchTool,
	serpAutocomplete: serpAutocompleteTool,
	serpLocationSearch: serpLocationSearchTool,
	serpRaw: serpRawTool
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

