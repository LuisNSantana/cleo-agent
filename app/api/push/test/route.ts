import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/web-push'

export async function POST() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await sendPushToUser(user.id, {
    title: 'Cleo',
    body: 'Una tarea del agente se ha completado ✅',
    data: { url: '/agents/notifications' }
  })
  return NextResponse.json({ ok: true, res })
}
