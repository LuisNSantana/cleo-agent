/**
 * Server Admin Supabase Client
 * Uses service role key for administrative operations that bypass RLS
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin operations')
    }
    
    adminClient = createClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('[SupabaseAdmin] Initialized admin client with service role key')
  }
  
  return adminClient
}

/**
 * Seed default agents for a user using admin privileges (bypasses RLS)
 */
export async function seedDefaultAgentsForUser(userId: string, defaultAgents: any[]) {
  try {
    const admin = getSupabaseAdmin()
    
    console.log(`[SupabaseAdmin] Seeding ${defaultAgents.length} default agents for user ${userId}`)
    
    const { data, error } = await admin
      .from('agents')
      .insert(defaultAgents)
      .select('id, name')
    
    if (error) {
      console.error('[SupabaseAdmin] Error seeding default agents:', error)
      throw error
    }
    
    console.log(`[SupabaseAdmin] Successfully seeded ${data?.length || 0} agents:`, 
      data?.map(a => ({ id: a.id, name: a.name })))
    
    return data
  } catch (error) {
    console.error('[SupabaseAdmin] Failed to seed default agents:', error)
    throw error
  }
}
