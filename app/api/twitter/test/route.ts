/**
 * API endpoint for testing Twitter/X credentials
 * Tests connection to Twitter API with provided credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { testTwitterConnection } from '@/lib/twitter/credentials'

const TestCredentialsSchema = z.object({
  api_key: z.string().min(20),
  api_secret: z.string().min(40),
  access_token: z.string().min(40),
  access_token_secret: z.string().min(40),
  bearer_token: z.string().min(100).optional()
})

/**
 * POST /api/twitter/test
 * Test Twitter API connection with provided credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const credentials = TestCredentialsSchema.parse(body)

    const result = await testTwitterConnection(credentials)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid credentials format', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error testing Twitter credentials:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
