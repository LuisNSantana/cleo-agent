import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params
  // Canonicalize service IDs so all Google variants resolve to a single row
  const canonicalService = (() => {
    if (
      service === 'google-workspace' ||
      service === 'gmail' ||
      service === 'google-calendar' ||
      service === 'google-drive' ||
      service === 'google-docs' ||
      service === 'google-sheets' ||
      service === 'google-slides'
    ) return 'google-workspace'
    return service
  })()
  
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
    
    if (userError || !userData?.user) {
      // Graceful unauthenticated fallback: return disconnected instead of 401
      console.warn("[STATUS API] No auth session; returning disconnected status for:", canonicalService)
      // For aggregated UI, it's better to respond 200 with a safe default
      return NextResponse.json({ connected: false, account: null })
    }

    console.log(`[STATUS API] User authenticated: ${userData.user.id}`)

    // Check specific service connection status with more detailed query
    const { data: connection, error } = await (supabase as any)
      .from("user_service_connections")
      .select("connected, account_info, access_token, refresh_token, token_expires_at, updated_at")
      .eq("user_id", userData.user.id)
      .eq("service_id", canonicalService)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
      console.error("[STATUS API] Error fetching connection status:", error)
      return NextResponse.json({ 
        error: "Failed to fetch connection status", 
        details: error.message 
      }, { status: 500 })
    }

    if (!connection) {
      console.log(`[STATUS API] No canonical row for user ${userData.user.id} and service ${service} (canonical: ${canonicalService})`)
      // Fallback: for Google, check legacy variant rows and surface best match
      if (canonicalService === 'google-workspace') {
        const variants = ['gmail','google-calendar','google-drive','google-docs','google-sheets','google-slides']
        const { data: legacyRows, error: legacyErr } = await (supabase as any)
          .from('user_service_connections')
          .select('connected, account_info, access_token, refresh_token, token_expires_at, updated_at, service_id')
          .eq('user_id', userData.user.id)
          .in('service_id', variants)

        if (legacyErr) {
          console.error('[STATUS API] Legacy variant fetch error:', legacyErr)
        }

        const best = (legacyRows || [])
          .sort((a: any, b: any) => {
            // Prefer connected rows, then most recently updated
            if (!!b.connected !== !!a.connected) return (b.connected ? 1 : 0) - (a.connected ? 1 : 0)
            const at = a.updated_at ? new Date(a.updated_at).getTime() : 0
            const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0
            return bt - at
          })[0]

        if (best) {
          console.log(`[STATUS API] Using legacy variant row ${best.service_id} for status surface`)
          return NextResponse.json({
            connected: !!best.connected,
            account: best.account_info?.email || best.account_info?.name || null,
            lastUpdated: best.updated_at
          })
        }
      }

      return NextResponse.json({ connected: false, account: null })
    }

    // Check if token needs refresh (for Google services)
    if (canonicalService === 'google-workspace' && connection.token_expires_at) {
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

  console.log(`[STATUS API] Returning connection status for ${service} (canonical: ${canonicalService}):`, response)
    return NextResponse.json(response)
  } catch (error) {
    console.error(`[STATUS API] Error checking ${service} status:`, error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
