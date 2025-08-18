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

    // Check connection status for each service
    const { data: connections, error } = await (supabase as any)
      .from("user_service_connections")
      .select("service_id, connected, account_info")
      .eq("user_id", userData.user.id)

    if (error) {
      console.error("Error fetching connections:", error)
      return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 })
    }

    // Format response
    const connectionStatus: Record<string, { connected: boolean; account?: string }> = {}
    
    connections?.forEach((conn: any) => {
      connectionStatus[conn.service_id] = {
        connected: conn.connected,
        account: conn.account_info?.email || conn.account_info?.name
      }
    })

    // Ensure all services have a status
    const services = ["google-calendar", "google-drive", "gmail", "notion"]
    services.forEach((serviceId) => {
      if (!connectionStatus[serviceId]) {
        connectionStatus[serviceId] = { connected: false }
      }
    })

  return NextResponse.json(connectionStatus)
  } catch (error) {
  // console.error("Error in connections status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
