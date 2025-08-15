import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
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

    // Check specific service connection status
    const { data: connection, error } = await (supabase as any)
      .from("user_service_connections")
      .select("connected, account_info")
      .eq("user_id", userData.user.id)
      .eq("service_id", service)
      .single()

    console.log(`🔍 Checking connection status for service "${service}" and user "${userData.user.id}":`, {
      hasConnection: !!connection,
      connected: connection?.connected,
      error: error?.code || error?.message
    })

    if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
      console.error("Error fetching connection status:", error)
      return NextResponse.json({ error: "Failed to fetch connection status" }, { status: 500 })
    }

    const response = {
      connected: connection?.connected || false,
      account: connection?.account_info?.email || connection?.account_info?.name || null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error(`Error checking ${service} status:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
