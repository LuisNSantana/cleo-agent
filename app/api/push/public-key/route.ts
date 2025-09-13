import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return NextResponse.json({ error: 'VAPID public key not set' }, { status: 404 })
  return NextResponse.json({ key })
}
