import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { exchangeTwitterCode, getTwitterUserInfo } from "@/lib/twitter/oauth-helpers"
import { 
  exchangeInstagramCode, 
  exchangeInstagramForLongLivedToken,
  getInstagramUserInfo 
} from "@/lib/instagram/oauth-helpers"
import { 
  exchangeFacebookCode, 
  exchangeFacebookForLongLivedToken,
  getFacebookUserInfo 
} from "@/lib/facebook/oauth-helpers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  // Canonicalize Google variants to a unified service_id row
  const canonicalService = (
    service === 'google-workspace' ||
    service === 'gmail' ||
    service === 'google-calendar' ||
    service === 'google-drive' ||
    service === 'google-docs' ||
    service === 'google-sheets' ||
    service === 'google-slides'
  ) ? 'google-workspace' : service
  
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Derive base URL from the incoming request to avoid env mismatches
    const baseUrl = request.nextUrl.origin
    // Capture where the user started the connect flow to support proper fallback redirects
    // For Settings > Connections, we want to return there for better UX
    let returnTo = baseUrl
    if (state) {
      try {
        const parsed = JSON.parse(decodeURIComponent(state)) as { returnTo?: string }
        if (parsed?.returnTo && typeof parsed.returnTo === 'string') {
          returnTo = parsed.returnTo
        }
      } catch (_) {
        // ignore malformed state
      }
    }
    
    // If the returnTo is the main app page, redirect to settings instead for better UX
    if (returnTo === baseUrl || returnTo === baseUrl + '/') {
      returnTo = baseUrl + '/#settings-connections'
    }

    if (error) {
      return NextResponse.redirect(`${returnTo}?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return NextResponse.redirect(`${returnTo}?error=no_code`)
    }

    const supabase = await createClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return NextResponse.redirect(`${returnTo}?error=database_error`)
    }

    console.log("Attempting to get user session...")
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error("Supabase auth error:", userError)
      return NextResponse.redirect(`${returnTo}?error=auth_error&details=${encodeURIComponent(userError.message)}`)
    }
    
    if (!userData?.user) {
      console.error("No user found in session")
      return NextResponse.redirect(`${returnTo}?error=no_session`)
    }

    console.log(`Processing OAuth callback for user: ${userData.user.id}, service: ${service}`)

    // Exchange code for access token
    let tokenData: any
    let accountInfo: any

    switch (service) {
      case "google-calendar":
      case "google-drive":
      case "gmail":
      case "google-workspace":
        console.log(`Processing Google OAuth for service: ${service}`)
        tokenData = await exchangeGoogleCode(code, service, baseUrl)
        console.log('Google token exchange successful, fetching user info...')
        // Get Google user info with token
        accountInfo = await getGoogleUserInfo(tokenData.access_token)
        console.log('Google user info retrieved successfully')
        break
      case "twitter":
      case "x":
        console.log(`🐦 [Twitter OAuth] Processing Twitter OAuth for service: ${service}`)
        console.log(`🐦 [Twitter OAuth] Checking for code verifier cookie...`)
        
        const codeVerifier = request.cookies.get('twitter_code_verifier')?.value
        if (!codeVerifier) {
          console.error('🐦 [Twitter OAuth] ❌ Missing Twitter code verifier cookie')
          console.log('🐦 [Twitter OAuth] Available cookies:', request.cookies.getAll().map(c => c.name))
          return NextResponse.redirect(`${returnTo}?error=session_expired`)
        }
        console.log(`🐦 [Twitter OAuth] ✅ Code verifier found (length: ${codeVerifier.length})`)
        
        const clientId = process.env.TWITTER_CLIENT_ID
        const clientSecret = process.env.TWITTER_CLIENT_SECRET
        
        if (!clientId || !clientSecret) {
          console.error('🐦 [Twitter OAuth] ❌ Missing Twitter credentials in environment')
          return NextResponse.redirect(`${returnTo}?error=twitter_config_missing`)
        }
        console.log(`🐦 [Twitter OAuth] ✅ Client ID and Secret configured`)
        
        const redirectUri = `${baseUrl}/api/connections/${service}/callback`
        console.log(`🐦 [Twitter OAuth] Redirect URI: ${redirectUri}`)
        console.log(`🐦 [Twitter OAuth] Authorization code: ${code.substring(0, 20)}...`)
        
        try {
          console.log(`🐦 [Twitter OAuth] Exchanging code for access token...`)
          tokenData = await exchangeTwitterCode({ 
            code, 
            codeVerifier, 
            redirectUri, 
            clientId,
            clientSecret 
          })
          console.log('🐦 [Twitter OAuth] ✅ Token exchange successful')
          console.log(`🐦 [Twitter OAuth] Token type: ${tokenData.token_type || 'bearer'}`)
          console.log(`🐦 [Twitter OAuth] Has refresh token: ${!!tokenData.refresh_token}`)
          console.log(`🐦 [Twitter OAuth] Expires in: ${tokenData.expires_in || 'unknown'}`)
        } catch (tokenError) {
          console.error('🐦 [Twitter OAuth] ❌ Token exchange failed:', tokenError)
          throw tokenError
        }
        
        try {
          console.log('🐦 [Twitter OAuth] Fetching user info...')
          accountInfo = await getTwitterUserInfo(tokenData.access_token)
          console.log('🐦 [Twitter OAuth] ✅ User info retrieved:', accountInfo?.data?.username || 'unknown')
        } catch (userInfoError) {
          console.error('🐦 [Twitter OAuth] ❌ Failed to fetch user info:', userInfoError)
          throw userInfoError
        }
        
        console.log('🐦 [Twitter OAuth] ✅ Twitter OAuth completed successfully')
        // Clear the code verifier cookie after successful exchange
        break
      case "instagram":
        console.log(`📸 [Instagram OAuth] Processing Instagram OAuth`)
        
        const instagramClientId = process.env.INSTAGRAM_APP_ID
        const instagramClientSecret = process.env.INSTAGRAM_APP_SECRET
        
        if (!instagramClientId || !instagramClientSecret) {
          console.error('📸 [Instagram OAuth] ❌ Missing Instagram credentials in environment')
          return NextResponse.redirect(`${returnTo}?error=instagram_config_missing`)
        }
        
        const instagramRedirectUri = `${baseUrl}/api/connections/${service}/callback`
        console.log(`📸 [Instagram OAuth] Redirect URI: ${instagramRedirectUri}`)
        
        try {
          console.log(`📸 [Instagram OAuth] Exchanging code for short-lived access token...`)
          const shortLivedToken = await exchangeInstagramCode({
            code,
            clientId: instagramClientId,
            clientSecret: instagramClientSecret,
            redirectUri: instagramRedirectUri
          })
          console.log('📸 [Instagram OAuth] ✅ Short-lived token obtained')
          
          console.log('📸 [Instagram OAuth] Exchanging for long-lived token (60 days)...')
          tokenData = await exchangeInstagramForLongLivedToken({
            accessToken: shortLivedToken.access_token,
            clientSecret: instagramClientSecret
          })
          console.log('📸 [Instagram OAuth] ✅ Long-lived token obtained')
          
          console.log('📸 [Instagram OAuth] Fetching user info...')
          accountInfo = await getInstagramUserInfo(tokenData.access_token)
          console.log(`📸 [Instagram OAuth] ✅ User info retrieved: @${accountInfo?.username || 'unknown'}`)
        } catch (instagramError) {
          console.error('📸 [Instagram OAuth] ❌ Instagram OAuth failed:', instagramError)
          throw instagramError
        }
        
        console.log('📸 [Instagram OAuth] ✅ Instagram OAuth completed successfully')
        break
      case "facebook":
        console.log(`📘 [Facebook OAuth] Processing Facebook OAuth`)
        
        const facebookClientId = process.env.FACEBOOK_APP_ID
        const facebookClientSecret = process.env.FACEBOOK_APP_SECRET
        
        if (!facebookClientId || !facebookClientSecret) {
          console.error('📘 [Facebook OAuth] ❌ Missing Facebook credentials in environment')
          return NextResponse.redirect(`${returnTo}?error=facebook_config_missing`)
        }
        
        const facebookRedirectUri = `${baseUrl}/api/connections/${service}/callback`
        console.log(`📘 [Facebook OAuth] Redirect URI: ${facebookRedirectUri}`)
        
        try {
          console.log(`📘 [Facebook OAuth] Exchanging code for short-lived access token...`)
          const shortLivedFbToken = await exchangeFacebookCode({
            code,
            clientId: facebookClientId,
            clientSecret: facebookClientSecret,
            redirectUri: facebookRedirectUri
          })
          console.log('📘 [Facebook OAuth] ✅ Short-lived token obtained')
          
          console.log('📘 [Facebook OAuth] Exchanging for long-lived token (60 days)...')
          tokenData = await exchangeFacebookForLongLivedToken({
            accessToken: shortLivedFbToken.access_token,
            clientId: facebookClientId,
            clientSecret: facebookClientSecret
          })
          console.log('📘 [Facebook OAuth] ✅ Long-lived token obtained')
          
          console.log('📘 [Facebook OAuth] Fetching user info...')
          accountInfo = await getFacebookUserInfo(tokenData.access_token)
          console.log(`📘 [Facebook OAuth] ✅ User info retrieved: ${accountInfo?.name || 'unknown'}`)
        } catch (facebookError) {
          console.error('📘 [Facebook OAuth] ❌ Facebook OAuth failed:', facebookError)
          throw facebookError
        }
        
        console.log('📘 [Facebook OAuth] ✅ Facebook OAuth completed successfully')
        break
      case "notion":
        tokenData = await exchangeNotionCode(code, baseUrl)
        accountInfo = await getNotionUserInfo(tokenData.access_token)
        break
      default:
        return NextResponse.redirect(`${returnTo}?error=unsupported_service`)
    }

    // Store connection data with explicit connected=true
    const connectionData = {
      user_id: userData.user.id,
      service_id: canonicalService,
      connected: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      account_info: accountInfo,
      scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
      updated_at: new Date().toISOString()
    }
    
  console.log("Storing connection data for user:", userData.user.id, "service:", canonicalService, "(original:", service, ")")

    const { error: dbError } = await (supabase as any)
      .from("user_service_connections")
      .upsert(connectionData)

    if (dbError) {
      console.error("Error storing connection:", dbError)
      return NextResponse.redirect(`${returnTo}?error=storage_failed&details=${encodeURIComponent(dbError.message)}`)
    }
    
  console.log("Connection stored successfully for service:", canonicalService)
    
    // Connection stored successfully

    // Close popup window and notify opener. If no opener, redirect to Settings > Connections.
    const targetOrigin = (() => { try { return new URL(returnTo).origin } catch { return baseUrl } })()
    
    // Add success parameter to returnTo URL
    const returnToUrl = new URL(returnTo)
    returnToUrl.searchParams.set('success', `${service}_connected`)
    const finalReturnTo = returnToUrl.toString()
    
    const response = new NextResponse(`
      <html>
        <head>
          <title>Connection Successful</title>
        </head>
        <body>
          <script>
            console.log('🔧 [OAuth Callback] Processing successful connection for ${service}');
            if (window.opener && !window.opener.closed) {
              console.log('🔧 [OAuth Callback] Posting message to opener');
              window.opener.postMessage({ 
                type: 'oauth-success',
                success: true, 
                service: '${service}' 
              }, ${JSON.stringify(targetOrigin)});
              window.close();
            } else {
              console.log('🔧 [OAuth Callback] No opener found, redirecting to:', ${JSON.stringify(finalReturnTo)});
              window.location.replace(${JSON.stringify(finalReturnTo)});
            }
          </script>
          <div style="text-align: center; padding: 40px; font-family: system-ui;">
            <h2>✅ Connection Successful!</h2>
            <p>Successfully connected to ${service}. This window will close automatically.</p>
            <p><a href="${finalReturnTo}">Click here if the window doesn't close</a></p>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    })
    
    // Clear Twitter code verifier cookie if this was a Twitter/X OAuth flow
    if (service === 'twitter' || service === 'x') {
      response.cookies.delete('twitter_code_verifier')
    }
    
    return response
  } catch (error) {
    console.error(`Error in ${service} OAuth callback:`, error)
    
    // Manejar errores específicos de rate limiting
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let userFriendlyError = 'connection_failed'
    
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      userFriendlyError = 'rate_limit_exceeded'
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      userFriendlyError = 'authorization_failed'
    } else if (errorMessage.includes('code_verifier') || errorMessage.includes('Missing')) {
      userFriendlyError = 'session_expired'
    }
    
    // Return error page that closes popup or redirects
    return new NextResponse(`
      <html>
        <head>
          <title>Connection Failed</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'oauth-error',
                success: false, 
                service: '${service}',
                error: '${userFriendlyError}'
              }, '*');
              window.close();
            } else {
              window.location.replace(${JSON.stringify(request.nextUrl.origin + `/integrations?error=${userFriendlyError}`)});
            }
          </script>
          <div style="text-align: center; padding: 40px; font-family: system-ui;">
            <h2>❌ Connection Failed</h2>
            <p>Unable to complete the connection. Please try again later.</p>
            <p><a href="/integrations">Return to Integrations</a></p>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    })
  }
}

async function exchangeGoogleCode(code: string, service: string, baseUrl: string): Promise<any> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    })
    throw new Error('Google OAuth credentials not configured')
  }

  const data = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${baseUrl}/api/connections/${service}/callback`,
  }

  console.log('Exchanging Google code with data:', { 
    ...data, 
    client_secret: '[REDACTED]',
    code: code.substring(0, 10) + '...'
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google token exchange failed:', response.status, errorText)
    throw new Error(`Failed to exchange Google code: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('Google token exchange successful:', { 
    access_token_length: result.access_token?.length,
    has_refresh_token: !!result.refresh_token,
    expires_in: result.expires_in
  })
  
  return result
}

async function getGoogleUserInfo(accessToken: string): Promise<any> {
  const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google userinfo API error:', response.status, errorText)
    console.error('Access token length:', accessToken ? accessToken.length : 'undefined')
    throw new Error(`Failed to get Google user info: ${response.status} ${errorText}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    const errorText = await response.text()
    console.error('Google API returned non-JSON response:', { contentType, body: errorText.substring(0, 200) })
    throw new Error(`Google API returned non-JSON response: ${contentType}`)
  }

  try {
    return await response.json()
  } catch (parseError) {
    console.error('Failed to parse Google API response as JSON:', parseError)
    throw new Error('Failed to parse Google API response')
  }
}

async function exchangeNotionCode(code: string, baseUrl: string): Promise<any> {
  const redirectUri = `${baseUrl}/api/connections/notion/callback`

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to exchange Notion code for token")
  }

  return response.json()
}

async function getNotionUserInfo(accessToken: string): Promise<any> {
  const response = await fetch("https://api.notion.com/v1/users/me", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
  })
  
  if (!response.ok) {
    throw new Error("Failed to get Notion user info")
  }

  return response.json()
}
