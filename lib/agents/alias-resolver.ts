import { canonicalizeAgentId } from './id-canonicalization'
import { isSupabaseEnabled } from '@/lib/supabase/config'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

type CacheEntry = { value: string; expiresAt: number }
const cache = new Map<string, CacheEntry>()

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function resolveAgentCanonicalKey(input: string): Promise<string> {
  const key = input.trim().toLowerCase()
  if (!key) return 'cleo-supervisor'

  // 1) In-memory cache
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && hit.expiresAt > now) return hit.value

  // 2) DB lookup (if enabled)
  if (isSupabaseEnabled) {
    try {
      const supabase = await createServerSupabase()
      if (supabase) {
        const { data, error } = await (supabase as any)
          .from('agent_aliases')
          .select('canonical_key, is_active')
          .eq('alias', key)
          .limit(1)
          .maybeSingle()

        if (!error && data && (data as any).is_active) {
          const canonical = (data as any).canonical_key as string
          cache.set(key, { value: canonical, expiresAt: now + TTL_MS })
          return canonical
        }
      }
    } catch {
      // ignore and fallback
    }
  }

  // 3) Fallback to static mapping
  const canonical = canonicalizeAgentId(key)
  cache.set(key, { value: canonical, expiresAt: now + TTL_MS })
  return canonical
}

export function clearAliasCache() {
  cache.clear()
}
