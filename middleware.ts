import { updateSession } from "@/utils/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { validateCsrfToken } from "./lib/csrf"

export async function middleware(request: NextRequest) {
  // Silence noisy dev source-map requests from dependencies (e.g., supabase-js)
  // Next dev overlay may try to fetch /src/*.ts and /_next/src/*.ts which don't exist in our app.
  const p = request.nextUrl.pathname
  if (
    (process.env.NODE_ENV === "development") &&
    (p.startsWith("/src/") || p.startsWith("/_next/src/"))
  ) {
    return new NextResponse(null, { status: 204 }) // no content, avoid 404 spam
  }

  const response = await updateSession(request)

  // CSRF protection for state-changing requests (skip Next.js/Vercel internals and static assets)
  const path = request.nextUrl.pathname
  const isInternal =
    path.startsWith("/_next/") ||
    path.startsWith("/__nextjs_original-stack-frame") ||
    path.startsWith("/__nextjs_live") ||
    path.startsWith("/favicon.ico") ||
    path.startsWith("/vercel") ||
    path.startsWith("/_vercel/")

  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method) && !isInternal) {
    // Only enforce CSRF for same-site navigations or credentialed requests
    const csrfCookie = request.cookies.get("csrf_token")?.value
    const headerToken = request.headers.get("x-csrf-token") || undefined
    // Double-submit: header token must be valid and match cookie prefix (raw part)
    const cookieRaw = csrfCookie?.split(":")[0]
    const headerRaw = headerToken?.split(":")[0]
    const valid = !!headerToken && validateCsrfToken(headerToken)
    const matches = !!cookieRaw && !!headerRaw && cookieRaw === headerRaw

    if (!valid || !matches) {
      return new NextResponse("Invalid CSRF token", { status: 403 })
    }
  }

  // CSP for development and production
  const isDev = process.env.NODE_ENV === "development"

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : ""

  response.headers.set(
    "Content-Security-Policy",
    isDev
  ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://assets.onedollarstats.com https://va.vercel-scripts.com https://vercel.live; frame-src 'self' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob: https://unavatar.io https://www.google.com; connect-src 'self' ws: wss: https://api.openai.com https://api.mistral.ai https://api.supabase.com ${supabaseDomain} https://api.github.com https://collector.onedollarstats.com https://vitals.vercel-analytics.com;`
      : `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://analytics.umami.is https://vercel.live https://assets.onedollarstats.com https://va.vercel-scripts.com; frame-src 'self' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob: https://unavatar.io https://www.google.com; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api.supabase.com ${supabaseDomain} https://api-gateway.umami.dev https://api.github.com https://collector.onedollarstats.com https://vitals.vercel-analytics.com;`
  )

  return response
}

export const config = {
  matcher: [
  // Exclude API, all Next internals, and common assets; allow /src and /_next/src so we can silence them above
  "/((?!api|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}
