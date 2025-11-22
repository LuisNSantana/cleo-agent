import { getCurrentUserId } from '@/lib/server/request-context'

/**
 * Verifies that the current request has a valid authenticated user.
 * Uses Supabase server client to check session.
 * 
 * NOTE: This file must ONLY be imported from server components or API routes.
 */
export async function verifyUserHasAccess(): Promise<{ userId: string }> {
  // 1. Check if we already have a userId in the context (fastest)
  const ctxId = getCurrentUserId()
  if (ctxId && ctxId !== '00000000-0000-0000-0000-000000000000') {
    return { userId: ctxId }
  }

  // 2. If not in context, check Supabase auth
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    if (!supabase) throw new Error('Supabase client unavailable')

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error('Unauthorized: No valid session found')
    }

    return { userId: user.id }
  } catch (error) {
    console.error('[AUTH] verifyUserHasAccess failed:', error)
    throw new Error('Unauthorized')
  }
}
