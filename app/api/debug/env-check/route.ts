/**
 * TEMPORARY DEBUG ENDPOINT - DELETE AFTER FIXING TWITTER OAUTH
 * 
 * Verifies that environment variables are accessible in the API route context.
 * This helps diagnose why TWITTER_CLIENT_ID might be empty in production.
 * 
 * Usage: GET /api/debug/env-check
 * 
 * SECURITY: Only enable in development or with authentication!
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // SECURITY: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    )
  }

  const envCheck = {
    nodeEnv: process.env.NODE_ENV || 'undefined',
    
    // Twitter OAuth
    twitterClientId: process.env.TWITTER_CLIENT_ID 
      ? `SET (length: ${process.env.TWITTER_CLIENT_ID.length}, starts with: ${process.env.TWITTER_CLIENT_ID.substring(0, 10)}...)` 
      : 'MISSING',
    twitterClientSecret: process.env.TWITTER_CLIENT_SECRET 
      ? `SET (length: ${process.env.TWITTER_CLIENT_SECRET.length})` 
      : 'MISSING',
    
    // Google OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID 
      ? `SET (length: ${process.env.GOOGLE_CLIENT_ID.length})` 
      : 'MISSING',
    
    // Other integrations
    instagramAppId: process.env.INSTAGRAM_APP_ID 
      ? `SET (length: ${process.env.INSTAGRAM_APP_ID.length})` 
      : 'MISSING',
    facebookAppId: process.env.FACEBOOK_APP_ID 
      ? `SET (length: ${process.env.FACEBOOK_APP_ID.length})` 
      : 'MISSING',
    
    // Timestamp
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(envCheck, { 
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}
