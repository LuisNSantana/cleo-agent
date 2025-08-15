import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate OAuth URL based on service
    let authUrl: string
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectUri = `${baseUrl}/api/connections/${service}/callback`

    switch (service) {
      case "google-calendar":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events"
        ])
        break
      case "google-drive":
        authUrl = generateGoogleOAuthUrl(redirectUri, [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/drive.file"
        ])
        break
      case "notion":
        authUrl = generateNotionOAuthUrl(redirectUri)
        break
      default:
        return NextResponse.json({ error: "Unsupported service" }, { status: 400 })
    }

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error(`Error initiating ${service} connection:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateGoogleOAuthUrl(redirectUri: string, scopes: string[]): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent"
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function generateNotionOAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    owner: "user"
  })

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`
}
