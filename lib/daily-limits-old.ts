import { createClient } from "@/lib/supabase/server"
import { ModelConfig } from "./models/types"

/**
 * Daily Usage Limits for Premium Models
 * 
 * Tracks and enforces daily usage limits for premium models like:
 * - GPT-5: 12 uses/day
 * - Claude 4 Sonnet: 7 uses/day  
 * - Gemini 2.5 Flash Image Preview: 5 images/day
 */
export class DailyLimitsManager {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Check if user can use a model today
   */
  async canUseModel(userId: string, modelId: string, model: ModelConfig): Promise<{ canUse: boolean; remaining: number; limit: number }> {
    if (!model.dailyLimit) {
      return { canUse: true, remaining: -1, limit: -1 } // No limit for this model
    }

    try {
      const supabase = await this.getSupabase()
      if (!supabase) {
        console.warn('Supabase not available, allowing unlimited usage')
        return { canUse: true, remaining: model.dailyLimit, limit: model.dailyLimit }
      }

      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // Get daily limit record using raw SQL
      const { data, error } = await supabase
        .rpc('fn_get_daily_limit', {
          p_user_id: userId,
          p_model_id: modelId,
          p_usage_date: today,
          p_default_limit: model.dailyLimit
        })

      if (error) {
        console.error('Error checking daily limits:', error)
        return { canUse: true, remaining: model.dailyLimit, limit: model.dailyLimit }
      }

      const record = data?.[0]
      if (!record) {
        return {
          canUse: true,
          remaining: model.dailyLimit,
          limit: model.dailyLimit
        }
      }

      const remaining = Math.max(0, record.daily_limit - record.usage_count)
      
      return {
        canUse: record.usage_count < record.daily_limit,
        remaining,
        limit: record.daily_limit
      }
    } catch (error) {
      console.error('Error in canUseModel:', error)
      return { canUse: true, remaining: model.dailyLimit, limit: model.dailyLimit }
    }
  }

  /**
   * Record model usage (increment counter)
   */
  async recordUsage(userId: string, modelId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      if (!supabase) {
        console.warn('Supabase not available, cannot record usage')
        return
      }

      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // Increment usage count using raw SQL to handle race conditions
      const { error } = await supabase.rpc('increment_daily_usage', {
        p_user_id: userId,
        p_model_id: modelId,
        p_usage_date: today
      })

      if (error) {
        console.error('Error recording daily usage:', error)
      }
    } catch (error) {
      console.error('Error in recordUsage:', error)
    }
  }

  /**
   * Get user's remaining usage for all premium models today
   */
  async getUserDailyStatus(userId: string): Promise<Record<string, { used: number; remaining: number; limit: number }>> {
    // Placeholder implementation
    const status: Record<string, { used: number; remaining: number; limit: number }> = {}
    
    // Known premium models with their limits
    const premiumModels = {
      'gpt-5': 12,
      'openrouter:anthropic/claude-sonnet-4': 7,
      'openrouter:google/gemini-2.5-flash-image-preview': 5
    }

    for (const [modelId, limit] of Object.entries(premiumModels)) {
      const used = 0 // This would come from database
      status[modelId] = {
        used,
        remaining: Math.max(0, limit - used),
        limit
      }
    }

    return status
  }

  /**
   * Get fallback model for vision tasks when primary model doesn't support vision
   */
  static getVisionFallbackModel(primaryModelId: string): string | null {
    // If user is using grok-4-fast:free (no vision), fallback to vision-capable model
    if (primaryModelId === 'openrouter:x-ai/grok-4-fast:free') {
      return 'openrouter:google/gemini-2.5-flash-lite' // Economical multimodal option
    }
    
    // For other text-only models, use GPT-4o mini as fallback
    const textOnlyModels = [
      'openrouter:deepseek/deepseek-chat-v3.1:free',
      'openrouter:mistralai/mistral-small-3.2-24b-instruct:free'
    ]
    
    if (textOnlyModels.includes(primaryModelId)) {
      return 'gpt-4o-mini' // OpenAI's vision-capable fallback
    }

    return null // Primary model already supports vision
  }

  /**
   * Check if an attachment requires vision capabilities
   */
  static requiresVision(attachments: any[]): boolean {
    if (!attachments || attachments.length === 0) return false
    
    return attachments.some(attachment => {
      const fileType = attachment.type || attachment.contentType || ''
      return fileType.startsWith('image/') || 
             fileType.includes('pdf') ||
             fileType.includes('document')
    })
  }

  /**
   * Get the appropriate model for a request, with fallback for vision
   */
  static async getModelForRequest(
    primaryModelId: string, 
    attachments: any[] = [], 
    userId?: string
  ): Promise<{ modelId: string; reason?: string }> {
    
    // If no attachments that require vision, use primary model
    if (!this.requiresVision(attachments)) {
      return { modelId: primaryModelId }
    }

    // Check if primary model supports vision
    // This would be better to check from the model config, but for now we hardcode
    const visionCapableModels = [
      'gpt-4o-mini',
      'gpt-5',
      'openrouter:anthropic/claude-sonnet-4',
      'openrouter:google/gemini-2.5-flash',
      'openrouter:google/gemini-2.5-flash-lite'
    ]

    if (visionCapableModels.includes(primaryModelId)) {
      return { modelId: primaryModelId }
    }

    // Primary model doesn't support vision, get fallback
    const fallbackModel = this.getVisionFallbackModel(primaryModelId)
    
    if (!fallbackModel) {
      // Use GPT-4o mini as last resort
      return { 
        modelId: 'gpt-4o-mini', 
        reason: `Switched to GPT-4o mini for image/document analysis (${primaryModelId} doesn't support vision)` 
      }
    }

    return { 
      modelId: fallbackModel,
      reason: `Switched to ${fallbackModel} for image/document analysis (${primaryModelId} doesn't support vision)`
    }
  }
}

export const dailyLimits = new DailyLimitsManager()