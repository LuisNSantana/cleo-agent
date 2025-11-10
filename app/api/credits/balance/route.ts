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
      // Return default beta tier if no data (1000 credits during beta)
      return NextResponse.json({
        plan: 'free',
        total_credits: 1000,  // Beta: 1000 credits for free tier
        used_credits: 0,
        remaining_credits: 1000,
        usage_percentage: 0,
        user_id: user.id,
        last_reset_at: new Date().toISOString()
      })
    }

    // Ensure usage_percentage is included
    return NextResponse.json({
      ...balance,
      usage_percentage: balance.usage_percentage || 0
    })
  } catch (error) {
    console.error('[API] Error fetching credit balance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
