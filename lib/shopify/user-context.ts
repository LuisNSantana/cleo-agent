/**
 * User Context Integration for Shopify Tools
 * Integrates authentication and user context with Shopify tools
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Get current user ID from session or context
 * This should be integrated with your authentication system
 */
export async function getCurrentUserIdForShopify(): Promise<string> {
  try {
    // This is a placeholder implementation
    // In production, you would:
    // 1. Get user from session/cookies
    // 2. Validate authentication token
    // 3. Return the authenticated user's ID
    
    const supabase = await createClient()
    if (!supabase) {
      throw new Error('Database connection failed')
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error('User not authenticated')
    }

    return user.id
  } catch (error) {
    console.error('Error getting current user for Shopify:', error)
    // Fallback to a default user ID for development
    // In production, this should throw an error
    return 'dev-user-id'
  }
}

/**
 * Validate user has access to specific store
 */
export async function validateStoreAccess(userId: string, storeIdentifier: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) return false

    const { data, error } = await supabase
      .from('shopify_user_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('store_identifier', storeIdentifier)
      .eq('is_active', true)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('Error validating store access:', error)
    return false
  }
}
