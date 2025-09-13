import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@huminarylabs.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

export async function sendPushToUser(userId: string, payload: any) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { error: 'Missing VAPID keys' }
  const supabase = await createClient()
  if (!supabase) return { error: 'Supabase disabled' }
  const sb: any = supabase
  const { data, error } = await sb
    .from('web_push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error) return { error: error.message }
  const subs = data || []
  const results = await Promise.allSettled(
    subs.map((s: any) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, JSON.stringify(payload)))
  )
  return { results }
}
