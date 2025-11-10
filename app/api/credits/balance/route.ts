import { NextRequest, NextResponse } from 'next/server'
import { getUserCredits } from '@/lib/credits/credit-tracker'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/credits/balance
 * Get user's current credit balance
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const balance = await getUserCredits(user.id)

    if (!balance) {
      // Return default free tier if no data
      return NextResponse.json({
        plan: 'free',
        total_credits: 100,
        used_credits: 0,
        remaining_credits: 100,
        usage_percentage: 0
      })
    }

    return NextResponse.json(balance)
  } catch (error) {
    console.error('[API] Error fetching credit balance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
