// Utilities to extract sender info and build a robust avatar URL from an email address

export type SenderInfo = {
  name?: string
  email?: string
  domain?: string
}

// Extracts name/email from RFC 2822 style headers like: "John Doe" <john@acme.com>
export function extractSenderInfo(fromHeader?: string | null): SenderInfo {
  if (!fromHeader) return {}

  const raw = fromHeader.trim()

  // Try angle-bracket form first
  const angleMatch = raw.match(/(?:^|\s)<?([^<>\s@]+@[^<>\s@]+)>?$/)
  let email: string | undefined
  if (angleMatch && angleMatch[1]) {
    email = angleMatch[1].trim()
  }

  // If no angle match, try a loose email pattern anywhere in the string
  if (!email) {
    const loose = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    if (loose) email = loose[0]
  }

  // Try to extract a friendly name (before <email> or before email occurrence)
  let name: string | undefined
  if (email) {
    const idx = raw.indexOf(email)
    const before = idx > 0 ? raw.slice(0, idx) : ''
    name = before.replace(/["<>]/g, '').trim()
    if (!name) name = undefined
  }

  const domain = email?.split('@')[1]?.toLowerCase()

  return { name, email, domain }
}

// Build a resilient avatar URL using unavatar, with graceful fallback to initials
// Note: Using unavatar avoids needing to hash emails for Gravatar in the browser
export function getAvatarUrlForEmail(email?: string, opts?: { size?: number; nameHint?: string; domainFallback?: string }): string | null {
  if (!email) return null
  const size = Math.min(Math.max(opts?.size ?? 64, 16), 256)
  const params = new URLSearchParams()
  params.set('fallback', 'initials')
  params.set('size', String(size))
  if (opts?.nameHint) params.set('name', opts.nameHint)
  // unavatar will try multiple providers (including gravatar) based on the identifier
  return `https://unavatar.io/${encodeURIComponent(email)}?${params.toString()}`
}

// Fallback avatar when we only know the domain (e.g., mailing lists)
export function getDomainFavicon(domain?: string, size: number = 32): string | null {
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}

export function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return '?' 
  const s = String(nameOrEmail).trim()
  if (!s) return '?'
  // If contains spaces, take first char of first two words
  const parts = s.split(/\s+/)
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return s[0]?.toUpperCase() ?? '?'
}
