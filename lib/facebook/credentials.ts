/**
 * Facebook Credentials Management
 * 
 * Retrieves Facebook OAuth credentials for Pages API from:
 * 1. User service connections (database)
 * 2. System environment variables (fallback)
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/server/request-context'

export interface FacebookCredentials {
  accessToken: string
  pageId?: string
  pageName?: string
}

/**
 * Get active Facebook credentials for a user from database
 */
export async function getActiveFacebookCredentials(
  userId?: string
): Promise<FacebookCredentials | null> {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      console.error('📘 [Facebook] Failed to create Supabase client')
      return null
    }
    
    const userIdToUse = userId || getCurrentUserId()

    if (!userIdToUse) {
      console.log('📘 [Facebook] No user ID available')
      return null
    }

    const { data, error } = await supabase
      .from('user_service_connections')
      .select('access_token, account_info')
      .eq('user_id', userIdToUse)
      .eq('service_id', 'facebook')
      .eq('connected', true)
      .single()

    if (error || !data || !data.access_token) {
      console.log('📘 [Facebook] No active connection found for user')
      return null
    }

    const accountInfo = data.account_info as any

    return {
      accessToken: data.access_token,
      pageId: accountInfo?.pageId,
      pageName: accountInfo?.name,
    }
  } catch (error) {
    console.error('📘 [Facebook] Error retrieving credentials:', error)
    return null
  }
}

/**
 * Get system Facebook credentials from environment variables
 */
export function getSystemFacebookCredentials(): FacebookCredentials | null {
  const accessToken = process.env.FACEBOOK_SYSTEM_ACCESS_TOKEN

  if (!accessToken) {
    console.log('📘 [Facebook] No system credentials configured')
    return null
  }

  return {
    accessToken,
    pageId: process.env.FACEBOOK_SYSTEM_PAGE_ID,
  }
}

/**
 * Get Facebook credentials (user → system fallback)
 */
export async function getFacebookCredentials(
  userId?: string
): Promise<FacebookCredentials> {
  // Try user credentials first
  const userCreds = await getActiveFacebookCredentials(userId)
  if (userCreds) {
    console.log('📘 [Facebook] Using user credentials')
    return userCreds
  }

  // Fallback to system credentials
  const systemCreds = getSystemFacebookCredentials()
  if (systemCreds) {
    console.log('📘 [Facebook] Using system credentials')
    return systemCreds
  }

  throw new Error(
    'No Facebook account connected. Please connect your Facebook account in Settings.'
  )
}
