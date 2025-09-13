/**
 * X/Twitter API User Credential Management
 * Secure storage and management of Xexport async function listTwitterCredentials(userId: string) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable', data: [] }
    
    console.log('listTwitterCredentials - userId:', userId, 'SERVICE_ID:', SERVICE_ID)
    
    const { data, error } = await supabase
      .from('user_service_connections')
      .select('id,access_token,connected,created_at,updated_at,account_info')
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .order('created_at', { ascending: false })
    
    console.log('listTwitterCredentials - query result:', { data, error })
    
    if (error) return { success: false, error: error.message, data: [] }keys for user-specific access.
 * Follows the established patterns from SerpAPI, Notion and Shopify integrations.
 * Keys are encrypted before storage and can be validated against X/Twitter API.
 */

import { createClient } from '@/lib/supabase/server'
import { encryptKey, decryptKey } from '@/lib/encryption'
import { z } from 'zod'

// Schema for validation on insertion/update
const TwitterCredentialSchema = z.object({
  // Be permissive: lengths vary by app/account; stronger validation is at runtime when actually used
  api_key: z.string().min(5, 'API key too short').max(200, 'API key too long'),
  api_secret: z.string().min(10, 'API secret too short').max(400, 'API secret too long'),
  access_token: z.string().min(5, 'Access token too short').max(400, 'Access token too long'),
  access_token_secret: z.string().min(5, 'Access token secret too short').max(400, 'Access token secret too long'),
  bearer_token: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined
    return v
  }, z.string().min(20, 'Bearer token too short').max(1000, 'Bearer token too long').optional()),
  label: z.string().min(1, 'Label required').max(60)
})

export type TwitterCredentialInput = z.infer<typeof TwitterCredentialSchema>

// We reuse the generic user_service_connections table with service_id = 'twitter'
const SERVICE_ID = 'twitter'

/**
 * Adds (or replaces existing active) Twitter API credentials for a user.
 * We allow multiple rows historically but mark only one active.
 */
export async function addTwitterCredentials(userId: string, input: TwitterCredentialInput) {
  try {
    const parsed = TwitterCredentialSchema.parse(input)
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable' }

    // Enforce max 3 credentials per user for Twitter
    const { count, error: countError } = await supabase
      .from('user_service_connections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)

    if (countError) {
      return { success: false, error: countError.message }
    }
    if ((count ?? 0) >= 3) {
      return { success: false, error: 'Maximum number of Twitter accounts (3) reached' }
    }

    // Encrypt all credentials into a JSON object
    const credentials = {
      api_key: parsed.api_key,
      api_secret: parsed.api_secret,
      access_token: parsed.access_token,
      access_token_secret: parsed.access_token_secret,
      bearer_token: parsed.bearer_token
    }
    
    const { encrypted, iv } = encryptKey(JSON.stringify(credentials))
    const stored = `${encrypted}:${iv}`
    
    const { data, error } = await supabase
      .from('user_service_connections')
      .insert({ 
        user_id: userId, 
        service_id: SERVICE_ID, 
        access_token: stored, 
        connected: true, 
        account_info: { label: parsed.label } 
      })
      .select('id, service_id, connected, created_at, updated_at')
      .single()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function listTwitterCredentials(userId: string) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable', data: [] }
    
    console.log('listTwitterCredentials - userId:', userId, 'SERVICE_ID:', SERVICE_ID)
    
    const { data, error } = await supabase
      .from('user_service_connections')
      .select('id,access_token,connected,created_at,updated_at,account_info')
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .order('created_at', { ascending: false })
    
    console.log('listTwitterCredentials - query result:', { data, error })
    
    if (error) return { success: false, error: error.message, data: [] }
    
    // Decrypt and parse credentials
    const decryptedData = (data || []).map(record => {
      try {
        const raw = record.access_token
        if (!raw) return null
        
        const parts = raw.split(':')
        let decrypted: string
        
        if (parts.length === 2) {
          // Old format: encrypted:iv
          const [encryptedWithTag, iv] = parts
          decrypted = decryptKey(encryptedWithTag, iv)
        } else if (parts.length === 3) {
          // Current format: encryptedData:authTag:iv
          // Need to reconstruct the encryptedWithTag format that decryptKey expects
          const [encryptedData, authTag, iv] = parts
          const encryptedWithTag = `${encryptedData}:${authTag}`
          decrypted = decryptKey(encryptedWithTag, iv)
        } else {
          throw new Error(`Invalid credential format: expected 2 or 3 parts, got ${parts.length}`)
        }
        
        const credentials = JSON.parse(decrypted)
        return {
          id: record.id,
          label: (record.account_info as any)?.label || 'Twitter Account',
          connected: record.connected,
          created_at: record.created_at,
          updated_at: record.updated_at,
          credentials
        }
      } catch (decryptError) {
        console.error('Failed to decrypt Twitter credential:', record.id, decryptError)
        // Return the record without credentials instead of filtering it out
        return {
          id: record.id,
          label: (record.account_info as any)?.label || 'Twitter Account',
          connected: record.connected,
          created_at: record.created_at,
          updated_at: record.updated_at,
          credentials: null // Mark as failed to decrypt
        }
      }
    }).filter(Boolean)
    
    console.log('listTwitterCredentials - decryptedData:', decryptedData)
    
    return { success: true, data: decryptedData }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error', data: [] }
  }
}

/**
 * Get active Twitter credentials for a user
 */
export async function getActiveTwitterCredentials(userId: string) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable', data: null }
    
    const { data, error } = await supabase
      .from('user_service_connections')
      .select('access_token,account_info')
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .eq('connected', true)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null } // No active credentials
      }
      return { success: false, error: error.message, data: null }
    }
    
    // Decrypt credentials
    const raw = data.access_token
    if (!raw) return { success: false, error: 'Invalid credential data', data: null }
    
    const parts = raw.split(':')
    let decrypted: string
    // Support both legacy (2-part) and current (3-part) formats
    if (parts.length === 2) {
      const [encryptedWithTag, iv] = parts
      decrypted = decryptKey(encryptedWithTag, iv)
    } else if (parts.length === 3) {
      const [encryptedData, authTag, iv] = parts
      const encryptedWithTag = `${encryptedData}:${authTag}`
      decrypted = decryptKey(encryptedWithTag, iv)
    } else {
      return { success: false, error: `Invalid credential format: expected 2 or 3 parts, got ${parts.length}`, data: null }
    }
    
    const credentials = JSON.parse(decrypted)
    
    return { success: true, data: credentials }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error', data: null }
  }
}

/**
 * Delete Twitter credentials
 */
export async function deleteTwitterCredentials(userId: string, credentialId: string) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable' }
    
    const { error } = await supabase
      .from('user_service_connections')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Test Twitter API connection
 */
export async function testTwitterConnection(credentials: {
  api_key: string
  api_secret: string
  access_token: string
  access_token_secret: string
  bearer_token?: string
}) {
  try {
    // Only attempt network validation when a Bearer token is provided.
    // OAuth 1.0a access tokens aren't usable as Bearer tokens for v2 endpoints.
    if (!credentials.bearer_token) {
      return {
        success: true,
        message: 'Credentials accepted. Skipped live validation (no bearer_token provided).',
      }
    }

    const response = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${credentials.bearer_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const userData = await response.json()
      return {
        success: true,
        message: `Successfully connected to Twitter as @${userData.data?.username || 'unknown'}`,
        data: userData
      }
    }

    const errorData = await response.json().catch(() => ({}))
    return {
      success: false,
      error: `Twitter API error: ${errorData.detail || response.statusText}`
    }
  } catch (error) {
    console.error('Twitter connection test failed:', error)
    return { success: false, error: 'Failed to connect to Twitter API' }
  }
}

/**
 * Get system Twitter credentials (fallback for development)
 */
export function getSystemTwitterCredentials() {
  return {
    api_key: process.env.TWITTER_API_KEY || '',
    api_secret: process.env.TWITTER_API_SECRET || '',
    access_token: process.env.TWITTER_ACCESS_TOKEN || '',
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
    bearer_token: process.env.TWITTER_BEARER_TOKEN || ''
  }
}
