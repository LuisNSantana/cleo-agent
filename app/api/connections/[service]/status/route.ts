import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  
  try {
    console.log(`[STATUS API] Checking ${service} status...`)
    
    const supabase = await createClient()
    
    if (!supabase) {
      console.error("[STATUS API] Supabase client not available")
      return NextResponse.json({ error: "Database not available" }, { status: 500 })
    }

    console.log("[STATUS API] Supabase client created successfully")
    
    let userData, userError
    try {
      const result = await supabase.auth.getUser()
      userData = result.data
      userError = result.error
    } catch (authError) {
      console.error("[STATUS API] Auth error caught:", authError)
      userError = authError
    }
    
    if (userError) {
      console.error("[STATUS API] Supabase auth error:", userError)
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: (userError as any)?.message || 'Unknown auth error',
        code: (userError as any)?.code || 'unknown'
      }, { status: 401 })
    }
    
    if (!userData?.user) {
      console.error("[STATUS API] No user data found in session")
      return NextResponse.json({ error: "No user session" }, { status: 401 })
    }

    console.log(`[STATUS API] User authenticated: ${userData.user.id}`)

    // Check specific service connection status with more detailed query
    const { data: connection, error } = await (supabase as any)
      .from("user_service_connections")
      .select("connected, account_info, access_token, refresh_token, token_expires_at, updated_at")
      .eq("user_id", userData.user.id)
      .eq("service_id", service)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
      console.error("[STATUS API] Error fetching connection status:", error)
      return NextResponse.json({ 
        error: "Failed to fetch connection status", 
        details: error.message 
      }, { status: 500 })
    }

    if (!connection) {
      console.log(`[STATUS API] No connection found for user ${userData.user.id} and service ${service}`)
      return NextResponse.json({
        connected: false,
        account: null
      })
    }

    // Check if token needs refresh (for Google services)
    if (service.startsWith('google') && connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at)
      const now = new Date()
      const isExpired = expiresAt <= now
      
      console.log(`[STATUS API] Token status for ${service}: expires at ${expiresAt}, is expired: ${isExpired}`)
      
      if (isExpired) {
        console.log(`[STATUS API] Token expired for service ${service}, may need refresh`)
      }
    }

    const response = {
      connected: connection?.connected || false,
      account: connection?.account_info?.email || connection?.account_info?.name || null,
      lastUpdated: connection?.updated_at
    }

    console.log(`[STATUS API] Returning connection status for ${service}:`, response)
    return NextResponse.json(response)
  } catch (error) {
    console.error(`[STATUS API] Error checking ${service} status:`, error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
