import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { deleteNotionKey, updateNotionKey } from '@/lib/notion/credentials'

async function getCurrentUserId() {
  const supabase = await createClient()
  if (!supabase) return null
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  
  return user.id
}

const UpdateSchema = z.object({ 
  api_key: z.string().min(20).optional(), 
  label: z.string().min(1).max(60).optional(),
  is_active: z.boolean().optional()
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = UpdateSchema.parse(body)

    const result = await updateNotionKey(userId, id, parsed)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notion credentials updated successfully' 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('PUT /api/notion/credentials/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const result = await deleteNotionKey(userId, id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Notion credentials deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/notion/credentials/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
