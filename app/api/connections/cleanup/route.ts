import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Endpoint to clean up failed/stale connections
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔧 [Cleanup] Cleaning up stale connections for user:`, userData.user.id)

    // Remove connections that are marked as not connected and have no valid tokens
    const { error } = await (supabase as any)
      .from("user_service_connections")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("connected", false)

    if (error) {
      console.error("Error cleaning up connections:", error)
      return NextResponse.json({ error: "Failed to clean up connections" }, { status: 500 })
    }

    console.log(`🔧 [Cleanup] Successfully cleaned up stale connections`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in cleanup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
