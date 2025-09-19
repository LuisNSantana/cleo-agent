/**
 * API endpoints for managing Twitter/X user credentials
 * Follows the established patterns from Notion, SerpAPI, and Shopify integrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  addTwitterCredentials, 
  listTwitterCredentials, 
  deleteTwitterCredentials,
  testTwitterConnection
} from '@/lib/twitter/credentials'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId as getCtxUserId } from '@/lib/server/request-context'

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  // Fallback to request-context if Supabase session not present
  return user?.id || getCtxUserId() || null
}

// Validation schema for adding Twitter credentials
const CreateCredentialSchema = z.object({
  api_key: z.string().min(5, 'API key too short').max(200, 'API key too long'),
  api_secret: z.string().min(10, 'API secret too short').max(400, 'API secret too long'),
  access_token: z.string().min(5, 'Access token too short').max(400, 'Access token too long'),
  access_token_secret: z.string().min(5, 'Access token secret too short').max(400, 'Access token secret too long'),
  bearer_token: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined
    return v
  }, z.string().min(20, 'Bearer token too short').max(1000, 'Bearer token too long').optional()),
  label: z.string().min(1, 'Label required').max(60, 'Label too long')
})

/**
 * GET /api/twitter/credentials
 * Get all Twitter credentials for the current user
 */
export async function GET(request: NextRequest) {
  try {
  const userId = await resolveUserId()
    if (!userId) {
      // Return empty credentials array when no user is authenticated
      return NextResponse.json({ 
        success: true,
        credentials: [] 
      })
    }

    const result = await listTwitterCredentials(userId)
    
    console.log('Twitter GET - userId:', userId, 'result:', result)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      credentials: result.data 
    })
  } catch (error) {
    console.error('Error fetching Twitter credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/twitter/credentials
 * Add new Twitter credentials for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateCredentialSchema.parse(body)
  const userId = await resolveUserId()

  // Test connection before saving (best-effort). Do not hard-fail on live test errors.
  const testResult = await testTwitterConnection(validatedData)

    // If user is authenticated, store credentials user-scoped. Otherwise, return validation success only.
    if (userId) {
      const result = await addTwitterCredentials(userId, validatedData)
      if (!result.success) {
        // Enforce max accounts error clarity
        const status = result.error?.includes('Maximum number of Twitter accounts') ? 400 : 400
        return NextResponse.json({ error: result.error }, { status })
      }

      return NextResponse.json({ 
        success: true, 
        saved: true,
        message: 'Twitter credentials added successfully',
        data: result.data,
        connection_test: testResult
      })
    }

    // No session: don’t fail. Confirm validation and explain not persisted.
  return NextResponse.json({
      success: true,
      saved: false,
      message: 'Credentials validated. Not saved (no session). To use without login, set TWITTER_* env vars for system credentials.',
      connection_test: testResult
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error adding Twitter credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/twitter/credentials
 * Delete specific Twitter credentials
 */
export async function DELETE(request: NextRequest) {
  try {
  const userId = await resolveUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const credentialId = searchParams.get('id')
    
    if (!credentialId) {
      return NextResponse.json({ error: 'Credential ID required' }, { status: 400 })
    }

    const result = await deleteTwitterCredentials(userId, credentialId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Twitter credentials deleted successfully' })
  } catch (error) {
    console.error('Error deleting Twitter credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
