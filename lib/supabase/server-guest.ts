import type { Database } from "@/app/types/database.types"
import { createServerClient } from "@supabase/ssr"
import { isSupabaseEnabled } from "./config"

export async function createGuestServerClient() {
  // Allow using an admin client even if anon envs are not set (for backend-only use)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('[Supabase] Missing required envs for admin client:', {
      hasUrl: Boolean(url),
      hasServiceKey: Boolean(serviceKey),
    })
    return null
  }

  try {
    return createServerClient<Database>(
      url,
      serviceKey,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )
  } catch (e) {
    console.error('[Supabase] Failed to create admin client:', e)
    return null
  }
}
