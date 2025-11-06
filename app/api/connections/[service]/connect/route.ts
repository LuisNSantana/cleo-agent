import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTwitterOAuthUrl, generateCodeVerifier, generateCodeChallenge } from "@/lib/twitter/oauth-helpers"
import { generateNotionOAuthUrl } from "@/lib/notion/oauth-helpers"
import { generateInstagramOAuthUrl } from "@/lib/instagram/oauth-helpers"
import { generateFacebookOAuthUrl } from "@/lib/facebook/oauth-helpers"
import { randomBytes } from "crypto"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.redirect(new URL('/?error=database_unavailable', request.url))
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url))
    }

    // Generate OAuth URL based on service
    let authUrl: string
    // Always derive base URL from the current request to avoid mismatches (e.g. tunnels, custom domains)
    const baseUrl = request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/connections/${service}/callback`

    // Capture where the user started the connect flow to support proper fallback redirects
    // Prefer Referer header (page initiating the request), fallback to baseUrl
    const referer = request.headers.get("referer") || `${baseUrl}/integrations`
    
    // Generate secure random state for CSRF protection
    const stateNonce = randomBytes(16).toString('base64url')
    const statePayload = encodeURIComponent(
      JSON.stringify({ service, returnTo: referer, nonce: stateNonce })
    )

    switch (service) {
      case "twitter":
      case "x":
        // OAuth 2.0 with PKCE for Twitter/X
        // CRITICAL: Validate Twitter credentials are configured
        const twitterClientId = process.env.TWITTER_CLIENT_ID
        const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET
        
        // DEBUG: Log credential status (masked)
        console.log('🐦 [TWITTER-OAUTH-CONNECT] Environment check:', {
          nodeEnv: process.env.NODE_ENV,
          hasClientId: !!twitterClientId,
          hasClientSecret: !!twitterClientSecret,
          clientIdLength: twitterClientId?.length || 0,
          clientIdPrefix: twitterClientId?.substring(0, 10) || 'EMPTY',
          timestamp: new Date().toISOString()
        })
        
        if (!twitterClientId || !twitterClientSecret) {
          console.error('❌ [TWITTER-OAUTH] Missing credentials:', {
            hasClientId: !!twitterClientId,
            hasClientSecret: !!twitterClientSecret
          })
          return NextResponse.redirect(
            new URL('/?error=twitter_credentials_missing&message=Admin must configure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in environment variables', request.url)
          )
        }
        
        const codeVerifier = generateCodeVerifier()
        const codeChallenge = generateCodeChallenge(codeVerifier)
        
        authUrl = generateTwitterOAuthUrl({
          clientId: twitterClientId,
          redirectUri,
          codeChallenge,
          state: statePayload,
          scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
        })
        
        // DEBUG: Log generated OAuth URL (client_id should NOT be empty)
        console.log('🐦 [TWITTER-OAUTH-CONNECT] Generated OAuth URL:', {
          hasClientIdParam: authUrl.includes('client_id=' + twitterClientId),
          urlLength: authUrl.length,
          urlPreview: authUrl.substring(0, 100) + '...',
          redirectUri
        })
        
        // Store code verifier in cookie and redirect to Twitter OAuth
        const twitterResponse = NextResponse.redirect(authUrl)
        twitterResponse.cookies.set('twitter_code_verifier', codeVerifier, {
          httpOnly: true,
          secure: true, // Required for SameSite=None
          sameSite: 'none', // CRITICAL: Allow cross-site cookie for OAuth redirect from Twitter
          maxAge: 10 * 60, // 10 minutes
          path: '/' // Ensure cookie is available for callback route
        })
        
        console.log('🐦 [TWITTER-OAUTH-CONNECT] Redirecting to Twitter OAuth...')
        return twitterResponse
        
      case "google-calendar":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events"
        ], statePayload)
        return NextResponse.redirect(authUrl)
        
      case "google-drive":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/drive.file"
        ], statePayload)
        return NextResponse.redirect(authUrl)
        
      case "google-docs":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/documents",
          "https://www.googleapis.com/auth/drive.file"
        ], statePayload)
        return NextResponse.redirect(authUrl)
        
      case "google-sheets":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file"
        ], statePayload)
        return NextResponse.redirect(authUrl)
        
      case "gmail":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          // Gmail scopes: read, modify labels, and send
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/gmail.send",
        ], statePayload)
        return NextResponse.redirect(authUrl)
        
      case "google-workspace":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          // Google Workspace comprehensive scopes
          "https://www.googleapis.com/auth/documents",
          "https://www.googleapis.com/auth/spreadsheets", 
          "https://www.googleapis.com/auth/presentations",
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/drive",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/gmail.send"
        ], statePayload)
        return NextResponse.redirect(authUrl)
        
      case "notion":
        authUrl = generateNotionOAuthUrl({
          clientId: process.env.NOTION_CLIENT_ID || "",
          redirectUri,
          state: statePayload
        })
        return NextResponse.redirect(authUrl)
        
      case "instagram":
        authUrl = generateInstagramOAuthUrl({
          clientId: process.env.INSTAGRAM_APP_ID || "",
          redirectUri,
          state: statePayload,
          scopes: [
            "instagram_business_basic",
            "instagram_business_manage_messages",
            "instagram_business_manage_comments",
            "instagram_business_content_publish",
            "instagram_business_manage_insights"
          ]
        })
        return NextResponse.redirect(authUrl)
        
      case "facebook":
        authUrl = generateFacebookOAuthUrl({
          clientId: process.env.FACEBOOK_APP_ID || "",
          redirectUri,
          state: statePayload,
          scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_read_user_content"]
        })
        return NextResponse.redirect(authUrl)
        
      default:
        return NextResponse.redirect(new URL(`/integrations?error=unsupported_service`, request.url))
    }
  } catch (error) {
    console.error(`Error initiating ${service} connection:`, error)
    return NextResponse.redirect(new URL(`/integrations?error=connection_failed`, request.url))
  }
}

function generateGoogleOAuthUrl(redirectUri: string, scopes: string[], state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  })

  if (state) params.set("state", state)

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
