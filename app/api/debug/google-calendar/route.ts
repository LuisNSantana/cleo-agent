import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Debug Google Calendar connection

    // Check Google Calendar connection
    const { data: connection, error } = await (supabase as any)
      .from("user_service_connections")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("service_id", "google-calendar")
      .single()

    // Connection query completed

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching Google Calendar connection:", error)
      return NextResponse.json({ error: "Failed to fetch connection", details: error }, { status: 500 })
    }

    if (!connection) {
      return NextResponse.json({ 
        status: "not_connected",
        message: "No Google Calendar connection found for this user",
        userId: userData.user.id
      })
    }

    const now = new Date()
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null
    const isExpired = expiresAt ? now >= expiresAt : null

    return NextResponse.json({
      status: "connected",
      userId: userData.user.id,
      connection: {
        id: connection.id,
        connected: connection.connected,
        hasAccessToken: !!connection.access_token,
        hasRefreshToken: !!connection.refresh_token,
        tokenExpiresAt: connection.token_expires_at,
        isTokenExpired: isExpired,
        accountInfo: connection.account_info,
        scopes: connection.scopes,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at
      }
    })

  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
