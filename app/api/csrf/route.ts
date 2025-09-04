import { generateCsrfToken } from "@/lib/csrf"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const token = generateCsrfToken()
  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'
  cookieStore.set("csrf_token", token, {
    httpOnly: false, // double-submit requires readable cookie
    secure: isProd,
    sameSite: 'lax',
    path: "/",
    maxAge: 60 * 60 * 2,
  })

  return NextResponse.json({ ok: true })
}
