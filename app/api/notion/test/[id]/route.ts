import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testNotionKey } from '@/lib/notion/credentials'
import { decryptKey } from '@/lib/encryption'

async function getCurrentUserId() {
  const supabase = await createClient()
  if (!supabase) return null
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  
  return user.id
}

export async function POST(
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
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 })
    }

    // Get the credential from database
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    const { data: credential, error } = await supabase
      .from('user_service_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('service_id', 'notion')
      .eq('id', id)
      .single()

    if (error || !credential || !credential.access_token) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 })
    }

    // Decrypt the API key
    // Format in DB: "encryptedText:authTag:iv"
    const parts = credential.access_token.split(':')
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid credential format' }, { status: 400 })
    }

    const [encryptedText, authTag, iv] = parts
    const encryptedWithTag = `${encryptedText}:${authTag}`
    
    const apiKey = decryptKey(encryptedWithTag, iv)
    
    // Test the API key
    const result = await testNotionKey(apiKey)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notion connection successful',
      data: result.data 
    })
  } catch (error) {
    console.error('POST /api/notion/test/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
