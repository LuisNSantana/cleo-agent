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

    // For now, use a simple in-memory approach until we can create the proper table
    // In production, this should use a database table
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const storageKey = `daily_usage_${userId}_${modelId}_${today}`
    
    // Simple localStorage-like approach for server-side (this is a placeholder)
    // In a real implementation, this would be stored in a database table
    const currentUsage = 0 // This would come from database
    const remaining = Math.max(0, model.dailyLimit - currentUsage)
    
    return {
      canUse: currentUsage < model.dailyLimit,
      remaining,
      limit: model.dailyLimit
    }
  }

  /**
   * Record model usage (increment counter)
   */
  async recordUsage(userId: string, modelId: string): Promise<void> {
    // Placeholder implementation
    // In production, this would increment the usage counter in the database
    console.log(`Recording usage for user ${userId}, model ${modelId}`)
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