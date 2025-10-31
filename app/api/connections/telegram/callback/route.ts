import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyTelegramAuth, isTelegramAuthValid, formatTelegramUserInfo, TelegramAuthData } from "@/lib/telegram/oauth-helpers"

/**
 * Telegram Login Widget Callback
 * 
 * Telegram uses a different flow than standard OAuth:
 * 1. User clicks Telegram Login button (widget)
 * 2. Widget opens Telegram OAuth dialog
 * 3. User authorizes in Telegram
 * 4. Telegram redirects back with auth data in query params
 * 5. We verify the auth data using HMAC-SHA256
 * 6. Store the connection in database
 * 
 * Query params received:
 * - id: Telegram user ID
 * - first_name: User's first name
 * - last_name: User's last name (optional)
 * - username: User's username (optional)
 * - photo_url: User's profile photo (optional)
 * - auth_date: Unix timestamp of auth
 * - hash: HMAC-SHA256 signature to verify authenticity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract all Telegram auth data from query params
    const authData: TelegramAuthData = {
      id: parseInt(searchParams.get("id") || "0"),
      first_name: searchParams.get("first_name") || "",
      last_name: searchParams.get("last_name") || undefined,
      username: searchParams.get("username") || undefined,
      photo_url: searchParams.get("photo_url") || undefined,
      auth_date: parseInt(searchParams.get("auth_date") || "0"),
      hash: searchParams.get("hash") || ""
    }

    console.log("📱 [Telegram OAuth] Received auth data:", {
      id: authData.id,
      username: authData.username,
      first_name: authData.first_name
    })

    // Validate required fields
    if (!authData.id || !authData.first_name || !authData.hash) {
      console.error("📱 [Telegram OAuth] ❌ Missing required fields")
      return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=invalid_telegram_data`)
    }

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error("📱 [Telegram OAuth] ❌ Missing TELEGRAM_BOT_TOKEN in environment")
      return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=telegram_config_missing`)
    }

    // Verify the auth data signature
    console.log("📱 [Telegram OAuth] Verifying auth data signature...")
    if (!verifyTelegramAuth(authData, botToken)) {
      console.error("📱 [Telegram OAuth] ❌ Invalid signature - possible tampering detected")
      return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=invalid_telegram_signature`)
    }
    console.log("📱 [Telegram OAuth] ✅ Signature verified")

    // Check if auth data is still valid (not older than 24 hours)
    if (!isTelegramAuthValid(authData)) {
      console.error("📱 [Telegram OAuth] ❌ Auth data expired (older than 24 hours)")
      return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=telegram_auth_expired`)
    }
    console.log("📱 [Telegram OAuth] ✅ Auth data is valid")

    // Get current user
    const supabase = await createClient()
    if (!supabase) {
      console.error("📱 [Telegram OAuth] ❌ Failed to create Supabase client")
      return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=database_error`)
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      console.error("📱 [Telegram OAuth] ❌ No user session found")
      return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=no_session`)
    }

    const userId = userData.user.id
    console.log(`📱 [Telegram OAuth] Processing for user: ${userId}`)

    // Format user info for storage
    const userInfo = formatTelegramUserInfo(authData)

    // Check if connection already exists
    const { data: existing } = await supabase
      .from("user_service_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("service_id", "telegram")
      .single()

    if (existing) {
      // Update existing connection
      console.log("📱 [Telegram OAuth] Updating existing connection...")
      const { error: updateError } = await supabase
        .from("user_service_connections")
        .update({
          account_info: userInfo,
          connected: true,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("service_id", "telegram")

      if (updateError) {
        console.error("📱 [Telegram OAuth] ❌ Failed to update connection:", updateError)
        return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=database_update_failed`)
      }
    } else {
      // Create new connection
      console.log("📱 [Telegram OAuth] Creating new connection...")
      const { error: insertError } = await supabase
        .from("user_service_connections")
        .insert({
          user_id: userId,
          service_id: "telegram",
          account_info: userInfo,
          connected: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error("📱 [Telegram OAuth] ❌ Failed to create connection:", insertError)
        return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=database_insert_failed`)
      }
    }

    console.log(`📱 [Telegram OAuth] ✅ Successfully connected Telegram account: @${authData.username || authData.id}`)

    // Redirect back to settings with success message
    return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?telegram=connected`)

  } catch (error) {
    console.error("📱 [Telegram OAuth] ❌ Unexpected error:", error)
    return NextResponse.redirect(`${request.nextUrl.origin}/#settings-connections?error=telegram_connection_failed`)
  }
}
