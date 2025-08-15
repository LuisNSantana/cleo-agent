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

    // Update the connection status to disconnected and clear tokens
    const { error } = await (supabase as any)
      .from("user_service_connections")
      .update({
        connected: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        account_info: null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userData.user.id)
      .eq("service_id", service)

    if (error) {
      console.error("Error disconnecting service:", error)
      return NextResponse.json({ error: "Failed to disconnect service" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error disconnecting ${service}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
