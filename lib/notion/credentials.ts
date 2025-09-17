/**
 * Notion API User Credential Management
 * Secure storage and management of Notion API keys for user-specific workspace access.
 * Follows the established patterns from SerpAPI and Skyvern integrations.
 * Keys are encrypted before storage and can be validated against Notion API.
 */

import { createClient } from '@/lib/supabase/server'
import { encryptKey, decryptKey } from '@/lib/encryption'
import { z } from 'zod'

// Schema for validation on insertion/update
const NotionCredentialSchema = z.object({
  api_key: z.string().min(20, 'API key too short').max(200, 'API key too long'),
  label: z.string().min(1, 'Label required').max(60),
  is_active: z.boolean().default(true)
})

export type NotionCredentialInput = z.infer<typeof NotionCredentialSchema>

export interface NotionCredentialRecord {
  id: string
  user_id: string
  label: string
  api_key: string // encrypted
  is_active: boolean
  created_at: string
  updated_at: string
}

// We reuse the generic user_service_connections table with service_id = 'notion'
const SERVICE_ID = 'notion'

/**
 * Adds (or replaces existing active) Notion API key for a user.
 * We allow multiple rows historically but mark only one active.
 */
export async function addNotionKey(userId: string, input: NotionCredentialInput) {
  try {
    const parsed = NotionCredentialSchema.parse(input)
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable' }

    const { encrypted, iv } = encryptKey(parsed.api_key)
    const stored = `${encrypted}:${iv}`
    
    // Upsert pattern: mark previous disconnected
    await supabase
      .from('user_service_connections')
      .update({ connected: false })
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
    
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

export async function listNotionKeys(userId: string) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable' }
    
    const { data, error } = await supabase
      .from('user_service_connections')
      .select('id,access_token,connected,created_at,updated_at,account_info')
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .order('created_at', { ascending: false })
    
    if (error) return { success: false, error: error.message }
    
    return { 
      success: true, 
      data: (data || []).map(r => ({
        id: r.id,
        label: (r.account_info as any)?.label || 'primary',
        api_key: '', // Don't expose encrypted key in list view
        is_active: r.connected,
        created_at: r.created_at,
        updated_at: r.updated_at
      }))
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function deleteNotionKey(userId: string, id: string) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable' }
    
    const { error } = await supabase
      .from('user_service_connections')
      .delete()
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .eq('id', id)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateNotionKey(userId: string, id: string, updates: Partial<NotionCredentialInput>) {
  try {
    const supabase = await createClient()
    if (!supabase) return { success: false, error: 'DB unavailable' }
    
    // Prepare update data
    const updateData: any = {}
    
    if (updates.api_key) {
      const { encrypted, iv } = encryptKey(updates.api_key)
      updateData.access_token = `${encrypted}:${iv}`
    }
    
    if (updates.is_active !== undefined) {
      updateData.connected = updates.is_active
    }
    
    if (updates.label) {
      updateData.account_info = { label: updates.label }
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { error } = await supabase
      .from('user_service_connections')
      .update(updateData)
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .eq('id', id)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Returns decrypted active key or null if none found.
 */
export async function getActiveNotionKey(userId: string): Promise<string | null> {
  try {
    console.log('[Notion][getActiveNotionKey] Called with userId:', userId)
    const supabase = await createClient()
    if (!supabase) {
      console.warn('[Notion][getActiveNotionKey] Supabase client not available')
      return null
    }
    const { data, error } = await supabase
      .from('user_service_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('service_id', SERVICE_ID)
      .eq('connected', true)
      .limit(1)
      .single()
    if (error || !data?.access_token) {
      console.warn('[Notion][getActiveNotionKey] No token found or error:', error)
      return null
    }
    const raw = String(data.access_token)
    const parts = raw.split(':')
    console.log('[Notion][getActiveNotionKey] Raw token parts:', parts.length)
    if (parts.length === 3) {
      const [encryptedText, authTag, iv] = parts
      const encryptedWithTag = `${encryptedText}:${authTag}`
      return decryptKey(encryptedWithTag, iv)
    }
    if (parts.length === 2) {
      const [encryptedWithTag, iv] = parts
      return decryptKey(encryptedWithTag, iv)
    }
    if (parts.length > 3) {
      const iv = parts.pop() as string
      const authTag = parts.pop() as string
      const encryptedText = parts.join(':')
      const encryptedWithTag = `${encryptedText}:${authTag}`
      return decryptKey(encryptedWithTag, iv)
    }
    return null
  } catch (err) {
    console.error('[Notion][getActiveNotionKey] Exception:', err)
    return null
  }
}

/** Quick key validation: test authentication with Notion API */
export async function testNotionKey(apiKey: string) {
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    })
    
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Invalid or expired API key' }
    }
    
    if (!response.ok) {
      return { success: false, error: `Notion API error: ${response.status}` }
    }
    
    const data = await response.json()
    return { 
      success: true, 
      data: { 
        user: data.name || data.person?.email || 'Unknown user',
        workspace: data.object === 'user' ? 'Valid' : 'Invalid'
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    }
  }
}

/**
 * Helper to resolve effective key: user active key > env fallback
 */
export async function resolveNotionKey(userId?: string) {
  console.log('[Notion][resolveNotionKey] Called with userId:', userId)
  if (userId) {
    const k = await getActiveNotionKey(userId)
    if (k) {
      console.log('[Notion][resolveNotionKey] Found user token')
      return k
    }
    console.warn('[Notion][resolveNotionKey] No user token found, falling back to env')
  }
  return process.env.NOTION_API_KEY || ''
}
