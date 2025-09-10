import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { testNotionKey } from '@/lib/notion/credentials'

const TestSchema = z.object({ 
  api_key: z.string().min(20) 
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TestSchema.parse(body)
    
    const result = await testNotionKey(parsed.api_key)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      data: result.data 
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
