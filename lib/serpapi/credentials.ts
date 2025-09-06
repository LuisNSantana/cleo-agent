/**
 * SerpAPI User Credential Management
 * Pattern inspired by Shopify credentials but simplified (single active API key per user).
 * If a user has not stored a key, tools will fallback to a global SERPAPI_API_KEY env variable.
 * Keys are encrypted before storage.
 */

import { createClient } from '@/lib/supabase/server'
import { encryptKey, decryptKey } from '@/lib/encryption'
import { z } from 'zod'

// Schema for validation on insertion/update
const SerpapiCredentialSchema = z.object({
	api_key: z.string().min(20, 'API key too short').max(200, 'API key too long'),
	label: z.string().min(1, 'Label required').max(60).default('primary'),
	is_active: z.boolean().default(true)
})

export type SerpapiCredentialInput = z.infer<typeof SerpapiCredentialSchema>

export interface SerpapiCredentialRecord {
	id: string
	user_id: string
	label: string
	api_key: string // encrypted
	is_active: boolean
	created_at: string
	updated_at: string
}

// We reuse the generic user_service_connections table with service_id = 'serpapi'
const SERVICE_ID = 'serpapi'

/**
 * Adds (or replaces existing active) SerpAPI key for a user.
 * We allow multiple rows historically but mark only one active.
 */
export async function addSerpapiKey(userId: string, input: SerpapiCredentialInput) {
	try {
		const parsed = SerpapiCredentialSchema.parse(input)
		const supabase = await createClient()
		if (!supabase) return { success: false, error: 'DB unavailable' }

			const { encrypted, iv } = encryptKey(parsed.api_key)
			const stored = `${encrypted}:${iv}`
			// Upsert pattern: mark previous disconnected
			await supabase.from('user_service_connections').update({ connected: false }).eq('user_id', userId).eq('service_id', SERVICE_ID)
			const { data, error } = await supabase
				.from('user_service_connections')
				.insert({ user_id: userId, service_id: SERVICE_ID, access_token: stored, connected: true, account_info: { label: parsed.label } })
				.select('id, service_id, connected, created_at, updated_at')
				.single()
		if (error) return { success: false, error: error.message }
		return { success: true, data }
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
	}
}

export async function listSerpapiKeys(userId: string) {
	try {
		const supabase = await createClient(); if (!supabase) return { success: false, error: 'DB unavailable' }
			const { data, error } = await supabase
				.from('user_service_connections')
				.select('id,access_token,connected,created_at,updated_at,account_info')
				.eq('user_id', userId)
				.eq('service_id', SERVICE_ID)
				.order('created_at', { ascending: false })
			if (error) return { success: false, error: error.message }
			return { success: true, data: (data || []).map(r => ({ id: r.id, label: (r.account_info as any)?.label || 'primary', is_active: r.connected, created_at: r.created_at, updated_at: r.updated_at })) }
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
	}
}

export async function deleteSerpapiKey(userId: string, id: string) {
	try {
		const supabase = await createClient(); if (!supabase) return { success: false, error: 'DB unavailable' }
		const { error } = await supabase.from('user_service_connections').delete().eq('user_id', userId).eq('id', id).eq('service_id', SERVICE_ID)
		if (error) return { success: false, error: error.message }
		return { success: true }
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
	}
}

/**
 * Returns decrypted active key or null if none found.
 */
export async function getActiveSerpapiKey(userId: string): Promise<string | null> {
	try {
		const supabase = await createClient(); if (!supabase) return null
			const { data, error } = await supabase
				.from('user_service_connections')
				.select('access_token,connected,account_info')
				.eq('user_id', userId)
				.eq('service_id', SERVICE_ID)
				.eq('connected', true)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle()
			if (error || !data?.access_token) return null
		// encrypted:authTag:iv pattern (see other modules). We pass full payload and last segment as iv.
		const parts = data.access_token.split(':')
		if (parts.length < 3) return null
		const iv = parts[parts.length - 1]
		return decryptKey(data.access_token, iv)
	} catch {
		return null
	}
}

/** Quick key validation: minimal query with num=1 */
export async function testSerpapiKey(apiKey: string) {
	try {
		const url = `https://serpapi.com/search.json?engine=google&q=ping&num=1&api_key=${encodeURIComponent(apiKey)}`
		const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'cleo-serpapi-validator' } })
		if (res.status === 401 || res.status === 403) return { success: false, error: 'Invalid or unauthorized key' }
		if (res.status === 429) return { success: false, error: 'Rate limited (429) — key may be valid but exhausted quota' }
		if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
		const json = await res.json()
		if (json?.error) return { success: false, error: json.error }
		return { success: true, credits_used: json.search_metadata?.total_time_taken }
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
	}
}

/**
 * Helper to resolve effective key: user active key > env fallback
 */
export async function resolveSerpapiKey(userId?: string) {
	if (userId) {
		const k = await getActiveSerpapiKey(userId)
		if (k) return k
	}
	return process.env.SERPAPI_API_KEY || ''
}

