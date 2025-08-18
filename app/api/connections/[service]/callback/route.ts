import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  
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
      return NextResponse.redirect(`${returnTo}?error=database_error`)
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return NextResponse.redirect(`${returnTo}?error=unauthorized`)
    }

    // Exchange code for access token
    let tokenData: any
    let accountInfo: any

    switch (service) {
      case "google-calendar":
      case "google-drive":
      case "gmail":
  tokenData = await exchangeGoogleCode(code, service, baseUrl)
        console.log('About to get Google user info with token:', tokenData.access_token ? 'present' : 'missing')
        accountInfo = await getGoogleUserInfo(tokenData.access_token)
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
      service_id: service,
      connected: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      account_info: accountInfo,
      scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
      updated_at: new Date().toISOString()
    }
    
    // Store connection data

    const { error: dbError } = await (supabase as any)
      .from("user_service_connections")
      .upsert(connectionData)

    if (dbError) {
      console.error("Error storing connection:", dbError)
      return NextResponse.redirect(`${returnTo}?error=storage_failed`)
    }
    
    // Connection stored successfully

    // Close popup window and notify opener. If no opener, redirect to Settings > Connections.
    const targetOrigin = (() => { try { return new URL(returnTo).origin } catch { return baseUrl } })()
    return new NextResponse(`
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
              console.log('🔧 [OAuth Callback] No opener found, redirecting to:', ${JSON.stringify(returnTo)});
              window.location.replace(${JSON.stringify(returnTo)});
            }
          </script>
          <div style="text-align: center; padding: 40px; font-family: system-ui;">
            <h2>✅ Connection Successful!</h2>
            <p>Successfully connected to ${service}. This window will close automatically.</p>
            <p><a href="${returnTo}">Click here if the window doesn't close</a></p>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error(`Error in ${service} OAuth callback:`, error)
    
    // Return error page that closes popup
    return new NextResponse(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'oauth-error',
                success: false, 
                service: '${service}',
                error: 'Connection failed'
              }, '*');
              window.close();
            } else {
              window.location.replace(${JSON.stringify(request.nextUrl.origin + '?error=callback_failed')});
            }
          </script>
          <p>Connection failed. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    })
  }
}

async function exchangeGoogleCode(code: string, service: string, baseUrl: string): Promise<any> {
  const redirectUri = `${baseUrl}/api/connections/${service}/callback`

  console.log('Exchanging Google code:', { service, redirectUri, codeLength: code.length })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google token exchange error:', response.status, errorText)
    throw new Error(`Failed to exchange Google code for token: ${response.status} ${errorText}`)
  }

  const tokenData = await response.json()
  console.log('Google token exchange success:', { 
    hasAccessToken: !!tokenData.access_token,
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
    accessTokenStart: tokenData.access_token ? tokenData.access_token.substring(0, 20) + '...' : 'none'
  })

  return tokenData
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

  return response.json()
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
