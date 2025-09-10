import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { addNotionKey, listNotionKeys, testNotionKey } from '@/lib/notion/credentials'

async function getCurrentUserId() {
  const supabase = await createClient()
  if (!supabase) return null
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  
  return user.id
}

const AddSchema = z.object({ 
  api_key: z.string().min(20), 
  label: z.string().min(1).max(60)
})

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await listNotionKeys(userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, credentials: result.data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = AddSchema.parse(body)
    
    // Test the API key first
    const testResult = await testNotionKey(parsed.api_key)
    if (!testResult.success) {
      return NextResponse.json({ 
        error: `API key validation failed: ${testResult.error}` 
      }, { status: 400 })
    }

    const result = await addNotionKey(userId, {
      api_key: parsed.api_key,
      label: parsed.label || 'primary',
      is_active: true
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notion API key stored & active', 
      id: result.data?.id 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
