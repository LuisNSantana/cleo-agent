/**
 * Authentication validation service
 * Handles user authentication and authorization checks
 */

import { createClient } from '@/lib/supabase/server'
import { chatLogger } from './logger'

export interface AuthValidationResult {
  success: boolean
  userId: string
  userName?: string  // User's display name from auth metadata
  error?: string
}

export class AuthValidationService {
  /**
   * Validate and resolve authenticated user
   * Prevents userId spoofing by checking against Supabase session
   */
  async validateUser(
    userId: string,
    isAuthenticated: boolean,
    supabase: Awaited<ReturnType<typeof createClient>>
  ): Promise<AuthValidationResult> {
    // If not authenticated, trust the provided userId (for guest mode)
    if (!isAuthenticated || !supabase) {
      return { success: true, userId }
    }

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser()

      if (authErr || !authData?.user) {
        chatLogger.error('User authentication failed', { error: authErr })
        return {
          success: false,
          userId,
          error: 'Unauthorized',
        }
      }

      // Verify userId matches authenticated session
      if (authData.user.id !== userId) {
        chatLogger.warn('UserId mismatch detected', {
          provided: userId,
          authenticated: authData.user.id,
        })
      }

      // Extract user name from metadata (try multiple fields)
      const userName = authData.user.user_metadata?.full_name || 
                      authData.user.user_metadata?.name ||
                      authData.user.user_metadata?.display_name ||
                      authData.user.email?.split('@')[0] || // Fallback to email prefix
                      undefined

      return {
        success: true,
        userId: authData.user.id, // Use authenticated ID
        userName, // Include user's display name for personalization
      }
    } catch (error) {
      chatLogger.error('Failed to validate user', { error })
      return {
        success: false,
        userId,
        error: 'Authentication check failed',
      }
    }
  }
}

export const authValidationService = new AuthValidationService()
