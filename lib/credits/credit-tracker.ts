/**
 * Credit Tracking System
 * 
 * Tracks credit usage per user and provides balance checking
 * For beta phase: tracking only, no enforcement
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { 
  calculateCreditsUsed, 
  getModelPricing,
  formatCredits,
  formatUsd,
  calculateTokenCost
} from './model-pricing'

export interface CreditUsageRecord {
  id: string
  user_id: string
  execution_id: string
  thread_id: string
  agent_id: string
  model_name: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  credits_used: number
  usd_cost: number
  created_at: string
}

export interface UserCredits {
  user_id: string
  plan: 'free' | 'pro' | 'pro+' | 'business'
  total_credits: number
  used_credits: number
  remaining_credits: number
  usage_percentage: number
  last_reset_at: string
}

/**
 * Record credit usage for an execution
 */
export async function recordCreditUsage({
  userId,
  executionId,
  threadId,
  agentId,
  modelName,
  inputTokens,
  outputTokens,
}: {
  userId: string
  executionId: string
  threadId: string
  agentId: string
  modelName: string
  inputTokens: number
  outputTokens: number
}): Promise<CreditUsageRecord | null> {
  try {
    const totalTokens = inputTokens + outputTokens
    const usdCost = calculateTokenCost(modelName, inputTokens, outputTokens)
    const creditsUsed = calculateCreditsUsed(modelName, inputTokens, outputTokens)

    const supabase = getSupabaseAdmin()
    
    const { data: record, error } = await supabase
      .from('credit_usage')
      .insert({
        user_id: userId,
        execution_id: executionId,
        thread_id: threadId,
        agent_id: agentId,
        model_name: modelName,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        credits_used: creditsUsed,
        usd_cost: usdCost,
      })
      .select()
      .single()

    if (error) {
      console.error('[CREDITS] Failed to record usage:', error)
      return null
    }

    console.log('💰 [CREDITS] Recorded usage:', {
      user: userId,
      agent: agentId,
      model: modelName,
      tokens: totalTokens,
      credits: creditsUsed,
      usd: formatUsd(usdCost)
    })

    return (record as any) as CreditUsageRecord
  } catch (error) {
    console.error('[CREDITS] Error recording usage:', error)
    return null
  }
}

/**
 * Get user's credit balance and usage
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    const supabase = getSupabaseAdmin()
    
    // Get user's credits from database (now includes total_credits and used_credits columns)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, total_credits, used_credits')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('[CREDITS] Failed to get user:', userError)
      return null
    }

    const plan = (user as any)?.subscription_tier || 'free'
    
    // Use credits from database if available, otherwise fall back to plan defaults
    const totalCredits = (user as any)?.total_credits || (() => {
      // Beta: Free tier users get 1000 credits (10x normal)
      // Post-beta: Will revert to 100 for free tier
      const planCredits: Record<string, number> = {
        free: 1000,  // Beta tier: 1000 credits
        pro: 2500,
        'pro+': 7500,
        business: 999999
      }
      return planCredits[plan] || 1000  // Default to 1000 during beta
    })()

    // Get total used credits from credit_usage table this billing cycle
    const { data: usage, error: usageError } = await supabase
      .from('credit_usage')
      .select('credits_used')
      .eq('user_id', userId)
      .gte('created_at', getStartOfBillingCycle())

    if (usageError) {
      console.error('[CREDITS] Failed to get usage:', usageError)
      return null
    }

    // Calculate used credits from credit_usage table
    const usedCreditsFromTable = (usage as any)?.reduce((sum: number, record: any) => sum + (record.credits_used || 0), 0) || 0
    
    // Also add the used_credits from users table (if manually set)
    const manualUsedCredits = (user as any)?.used_credits || 0
    const totalUsedCredits = usedCreditsFromTable + manualUsedCredits
    
    const remainingCredits = Math.max(0, totalCredits - totalUsedCredits)
    const usagePercentage = totalCredits > 0 ? (totalUsedCredits / totalCredits) * 100 : 0

    console.log('💰 [CREDITS] Balance check:', {
      userId: userId.slice(0, 8),
      plan,
      total: totalCredits,
      used: totalUsedCredits,
      remaining: remainingCredits,
      percentage: `${usagePercentage.toFixed(1)}%`
    })

    return {
      user_id: userId,
      plan: plan as any,
      total_credits: totalCredits,
      used_credits: totalUsedCredits,
      remaining_credits: remainingCredits,
      usage_percentage: usagePercentage,
      last_reset_at: getStartOfBillingCycle()
    }
  } catch (error) {
    console.error('[CREDITS] Error getting user credits:', error)
    return null
  }
}

/**
 * Get start of current billing cycle (monthly)
 */
function getStartOfBillingCycle(): string {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return startOfMonth.toISOString()
}

/**
 * Check if user has enough credits
 * For beta: always returns true, but logs warning
 */
export async function checkCreditsAvailable(
  userId: string,
  requiredCredits: number
): Promise<{ available: boolean; remaining: number }> {
  const userCredits = await getUserCredits(userId)
  
  if (!userCredits) {
    // If we can't check, allow for beta
    console.warn('[CREDITS] Could not check balance, allowing execution (beta mode)')
    return { available: true, remaining: 0 }
  }

  const available = userCredits.remaining_credits >= requiredCredits
  
  if (!available) {
    console.warn(`[CREDITS] User ${userId} has insufficient credits:`, {
      required: requiredCredits,
      remaining: userCredits.remaining_credits,
      plan: userCredits.plan,
      note: 'Allowing execution in beta mode'
    })
    // In beta, we allow even if insufficient
    return { available: true, remaining: userCredits.remaining_credits }
  }

  return { available: true, remaining: userCredits.remaining_credits }
}

/**
 * Get credit usage summary for a thread
 */
export async function getThreadCreditUsage(
  threadId: string
): Promise<{
  totalCredits: number
  totalUsd: number
  totalTokens: number
  byAgent: Record<string, { credits: number; tokens: number }>
}> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data: usage, error } = await supabase
      .from('credit_usage')
      .select('*')
      .eq('thread_id', threadId)

    if (error) {
      console.error('[CREDITS] Failed to get thread usage:', error)
      return { totalCredits: 0, totalUsd: 0, totalTokens: 0, byAgent: {} }
    }

    const byAgent: Record<string, { credits: number; tokens: number }> = {}
    let sumCredits: number = 0
    let sumUsd: number = 0
    let sumTokens: number = 0

    if (usage && Array.isArray(usage)) {
      usage.forEach((record: any) => {
        sumCredits += record.credits_used || 0
        sumUsd += record.usd_cost || 0
        sumTokens += record.total_tokens || 0

        if (!byAgent[record.agent_id]) {
          byAgent[record.agent_id] = { credits: 0, tokens: 0 }
        }
        byAgent[record.agent_id].credits += record.credits_used || 0
        byAgent[record.agent_id].tokens += record.total_tokens || 0
      })
    }

    return { 
      totalCredits: sumCredits, 
      totalUsd: sumUsd, 
      totalTokens: sumTokens, 
      byAgent 
    }
  } catch (error) {
    console.error('[CREDITS] Error getting thread usage:', error)
    return { totalCredits: 0, totalUsd: 0, totalTokens: 0, byAgent: {} }
  }
}
