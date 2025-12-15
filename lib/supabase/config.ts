function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false
  // Common placeholders from templates
  if (trimmed === 'your_supabase_project_url') return false
  // Supabase URL must be http(s)
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    // Ensure it parses as a URL
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

function isValidSupabaseAnonKey(key: string | undefined): boolean {
  if (!key) return false
  const trimmed = key.trim()
  if (!trimmed) return false
  // Common placeholders from templates
  if (trimmed === 'your_supabase_anon_key') return false
  return true
}

export const isSupabaseEnabled =
  isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  isValidSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
