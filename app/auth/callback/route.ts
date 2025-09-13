import { MODEL_DEFAULT } from "@/lib/config"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (!isSupabaseEnabled) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Supabase is not enabled in this deployment.")}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Missing authentication code")}`
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = await createGuestServerClient()

  if (!supabase || !supabaseAdmin) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Supabase is not enabled in this deployment.")}`
    )
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Auth error:", error)
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    )
  }

  console.log('🔍 [AUTH DEBUG] Exchange code result:', {
    hasData: !!data,
    hasUser: !!data?.user,
    userId: data?.user?.id,
    userEmail: data?.user?.email
  })

  const user = data?.user
  if (!user || !user.id || !user.email) {
    console.error('🚨 [AUTH DEBUG] Missing user data:', {
      hasUser: !!user,
      hasId: !!user?.id,
      hasEmail: !!user?.email,
      userData: user
    })
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Missing user info")}`
    )
  }

  // Debug logging
  console.log('🔍 [AUTH DEBUG] User data:', {
    id: user.id,
    email: user.email,
    idType: typeof user.id,
    idLength: user.id?.length
  })

  // NO manual insert - let the trigger handle it automatically
  // The trigger 'on_auth_user_created_safe' already inserts into public.users

  // Wait a moment for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Verify user was created in public.users
  try {
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, favorite_models")
      .eq("id", user.id)
      .single()

    console.log('🔍 [AUTH DEBUG] User verification:', {
      found: !!userData,
      userData,
      fetchError
    })
  } catch (err) {
    console.error("User verification error:", err)
  }

  // Ensure existing users also have MODEL_DEFAULT in their favorites (prepend if missing)
  try {
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("favorite_models")
      .eq("id", user.id)
      .single()

    if (!fetchError && existingUser) {
      const favs: string[] = existingUser.favorite_models || []
      if (!favs.includes(MODEL_DEFAULT)) {
        const updated = [MODEL_DEFAULT, ...favs]
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({ favorite_models: updated })
          .eq("id", user.id)

        if (updateError) {
          console.error("Failed to update favorite_models for user:", updateError)
        }
      }
    }
  } catch (err) {
    console.error("Error ensuring MODEL_DEFAULT in favorites:", err)
  }

  // Use NEXT_PUBLIC_APP_URL if available (for ngrok), otherwise construct from host
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (() => {
    const host = request.headers.get("host")
    const protocol = host?.includes("localhost") ? "http" : "https"
    return `${protocol}://${host}`
  })()

  const redirectUrl = `${baseUrl}${next}`
  
  // Debug logging for ngrok issues
  console.log('🔍 [AUTH CALLBACK DEBUG]')
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
  console.log('Host header:', request.headers.get("host"))
  console.log('Constructed baseUrl:', baseUrl)
  console.log('Next path:', next)
  console.log('Final redirectUrl:', redirectUrl)

  return NextResponse.redirect(redirectUrl)
}
