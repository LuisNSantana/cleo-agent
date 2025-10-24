import { MODEL_DEFAULT } from "@/lib/config"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { getAppBaseUrl } from "@/lib/utils/app-url"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  // Get dynamic base URL for redirects
  const baseUrl = getAppBaseUrl()

  console.log('🔐 [AUTH CALLBACK] Processing OAuth callback:', {
    hasCode: !!code,
    next,
    baseUrl,
    nodeEnv: process.env.NODE_ENV
  })

  if (!isSupabaseEnabled) {
    return NextResponse.redirect(
      `${baseUrl}/auth/error?message=${encodeURIComponent("Supabase is not enabled in this deployment.")}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/auth/error?message=${encodeURIComponent("Missing authentication code")}`
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = await createGuestServerClient()

  if (!supabase || !supabaseAdmin) {
    return NextResponse.redirect(
      `${baseUrl}/auth/error?message=${encodeURIComponent("Supabase is not enabled in this deployment.")}`
    )
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("❌ [AUTH CALLBACK] Exchange code error:", error)
    return NextResponse.redirect(
      `${baseUrl}/auth/error?message=${encodeURIComponent(error.message)}`
    )
  }

  console.log('✅ [AUTH CALLBACK] Exchange code successful:', {
    hasData: !!data,
    hasUser: !!data?.user,
    userId: data?.user?.id,
    userEmail: data?.user?.email
  })

  const user = data?.user
  if (!user || !user.id || !user.email) {
    return NextResponse.redirect(
      `${baseUrl}/auth/error?message=${encodeURIComponent("Missing user info")}`
    )
  }

  try {
    // Try to insert user only if not exists (exactly like Zola original)
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: user.id,
      email: user.email,
      created_at: new Date().toISOString(),
      message_count: 0,
      premium: false,
      favorite_models: [MODEL_DEFAULT],
    })

    // Only log error if it's not a duplicate key error (23505)
    if (insertError && insertError.code !== "23505") {
      console.error("❌ [AUTH CALLBACK] Error inserting user:", insertError)
    } else {
      console.log('✅ [AUTH CALLBACK] User record ensured in database')
    }
  } catch (err) {
    console.error("❌ [AUTH CALLBACK] Unexpected user insert error:", err)
  }

  // Build redirect URL using the same base URL (no protocol/host detection needed)
  const redirectUrl = `${baseUrl}${next}`
  
  console.log('🔐 [AUTH CALLBACK] Redirecting to:', redirectUrl)

  return NextResponse.redirect(redirectUrl)
}
