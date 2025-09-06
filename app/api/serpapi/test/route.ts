import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { testSerpapiKey } from '@/lib/serpapi/credentials'
import { createClient } from '@/lib/supabase/server'

async function getCurrentUserId(){ const supabase = await createClient(); if(!supabase) return null; const { data:{ user }} = await supabase.auth.getUser(); return user?.id||null }

const Schema = z.object({ api_key: z.string().min(20) })

export async function POST(req: NextRequest){
  try {
    const userId = await getCurrentUserId(); if(!userId) return NextResponse.json({ error:'Unauthorized' }, { status:401 })
    const body = await req.json(); const { api_key } = Schema.parse(body)
    const res = await testSerpapiKey(api_key)
    return NextResponse.json(res, { status: res.success ? 200 : 400 })
  } catch(e){
    if (e instanceof z.ZodError) return NextResponse.json({ error:'Validation error', details:e.errors }, { status:400 })
    console.error('SerpAPI test error', e)
    return NextResponse.json({ error:'Internal error' }, { status:500 })
  }
}