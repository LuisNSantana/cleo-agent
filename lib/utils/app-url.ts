/**
 * Get the application base URL dynamically based on environment
 * Supports local development, preview deployments, and production
 */
export function getAppBaseUrl(): string {
  // Priority 1: Explicit NEXT_PUBLIC_APP_URL (for ngrok, tunnels, custom domains)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Priority 2: Browser window location (client-side)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Priority 3: Development localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  // Priority 4: Vercel preview/production URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Priority 5: Production domain fallback
  return 'https://www.imcleo.com'
}

/**
 * Check if we're running in local development
 */
export function isLocalDevelopment(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.startsWith('192.168.')
  }
  
  return process.env.NODE_ENV === 'development' || 
         process.env.VERCEL_ENV === 'development'
}

/**
 * Get auth callback URL for OAuth redirects
 */
export function getAuthCallbackUrl(): string {
  return `${getAppBaseUrl()}/auth/callback`
}

/**
 * Get auth redirect URL after successful login
 */
export function getAuthRedirectUrl(next?: string): string {
  const baseUrl = getAppBaseUrl()
  return next ? `${baseUrl}${next}` : baseUrl
}
