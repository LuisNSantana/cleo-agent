/**
 * Instagram API Credential Management
 * Secure retrieval of Instagram OAuth tokens from user_service_connections table
 * Follows the established pattern from Twitter credentials
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/server/request-context'

const SERVICE_ID = 'instagram'

export interface InstagramCredentials {
  accessToken: string
  instagramUserId?: string
  username?: string
}

/**
 * Get active Instagram credentials for the current user
 * Returns Instagram User access token from OAuth flow
 */
export async function getActiveInstagramCredentials(
  userId?: string
): Promise<{ success: boolean; data?: InstagramCredentials; error?: string }> {
  try {
    const effectiveUserId = userId || getCurrentUserId()
    
    if (!effectiveUserId) {
      return { success: false, error: 'User ID not provided and no user in context' }
    }

    const supabase = await createClient()
    if (!supabase) {
      return { success: false, error: 'Database unavailable' }
    }

    // Get the most recent connected Instagram account
    const { data, error } = await supabase
      .from('user_service_connections')
      .select('access_token, account_info')
      .eq('user_id', effectiveUserId)
      .eq('service_id', SERVICE_ID)
      .eq('connected', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: 'No Instagram account connected. Please connect your Instagram account in Settings.' 
        }
      }
      return { success: false, error: error.message }
    }

    if (!data?.access_token) {
      return { success: false, error: 'Instagram access token not found' }
    }

    const accountInfo = data.account_info as any
    
    return {
      success: true,
      data: {
        accessToken: data.access_token,
        instagramUserId: accountInfo?.id || accountInfo?.user_id,
        username: accountInfo?.username
      }
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error retrieving Instagram credentials'
    }
  }
}

/**
 * Get system fallback Instagram credentials (for testing/demo)
 * Returns credentials from environment variables
 */
export function getSystemInstagramCredentials(): InstagramCredentials | null {
  const accessToken = process.env.INSTAGRAM_SYSTEM_ACCESS_TOKEN
  const instagramUserId = process.env.INSTAGRAM_SYSTEM_USER_ID

  if (!accessToken) {
    console.warn('System Instagram credentials not configured')
    return null
  }

  return {
    accessToken,
    instagramUserId,
    username: 'system'
  }
}

/**
 * Get Instagram credentials with fallback to system credentials
 * Tries user credentials first, then falls back to system if available
 */
export async function getInstagramCredentials(
  userId?: string
): Promise<InstagramCredentials> {
  const userCreds = await getActiveInstagramCredentials(userId)
  
  if (userCreds.success && userCreds.data) {
    return userCreds.data
  }

  // Fallback to system credentials
  const systemCreds = getSystemInstagramCredentials()
  if (systemCreds) {
    console.log('Using system Instagram credentials as fallback')
    return systemCreds
  }

  throw new Error(
    userCreds.error || 'No Instagram credentials available. Please connect your Instagram account.'
  )
}
