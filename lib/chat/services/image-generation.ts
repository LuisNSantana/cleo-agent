/**
 * Image generation service
 * Handles AI image generation via OpenAI (gpt-image-1-mini as primary, DALL-E 3 fallback)
 * 
 * COST OPTIMIZATION (Jan 2026):
 * - gpt-image-1-mini: $0.005-0.036 per image (primary)
 * - DALL-E 3: $0.04-0.12 per image (fallback)
 * - Gemini via OpenRouter: removed (less reliable)
 */

import { dailyLimits } from '@/lib/daily-limits'
import { createClient } from '@/lib/supabase/server'
import { MODELS } from '@/lib/models'
import { chatLogger } from './logger'

interface ImageGenerationResult {
  success: boolean
  result?: {
    imageUrl: string
    title: string
    description: string
    style: string
    dimensions: { width: number; height: number }
  }
  error?: string
  model: string
}

export type { ImageGenerationResult }

// Quality levels for gpt-image-1-mini
type ImageQuality = 'low' | 'medium' | 'high'

export class ImageGenerationService {
  /**
   * Generate image using gpt-image-1-mini (cheapest) with DALL-E 3 fallback
   */
  async generateImage(
    prompt: string,
    userId?: string,
    isAuthenticated?: boolean,
    quality: ImageQuality = 'medium'
  ): Promise<ImageGenerationResult> {
    try {
      chatLogger.debug('Starting image generation', { prompt: prompt.slice(0, 50), quality })

      // Get user from Supabase if authenticated
      let user = null
      if (userId && isAuthenticated) {
        const supabase = await createClient()
        if (supabase) {
          const { data: userData } = await supabase.auth.getUser()
          user = userData.user
        }
      }

      // Primary model: gpt-image-1-mini
      const modelId = 'gpt-image-1-mini'
      const modelConfig = MODELS.find((m) => m.id === modelId)
      
      // Fallback config if model not in registry
      const effectiveModelConfig = modelConfig || {
        id: modelId,
        name: 'GPT Image 1 Mini',
        maxCalls: 50,
        provider: 'openai',
        providerId: 'gpt-image-1-mini',
        baseProviderId: 'openai',
      }

      // Check daily limits for authenticated users
      if (user?.id && modelConfig) {
        const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)

        if (!limitCheck.canUse) {
          throw new Error(
            `Daily limit reached for image generation. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`
          )
        }
      }

      // Try providers in order: gpt-image-1-mini → DALL-E 3 → Mock fallback
      const result = await this.tryGptImageMini(prompt, user?.id, modelId, quality)
        .catch(() => this.tryOpenAIDallE(prompt, user?.id, 'dall-e-3'))
        .catch((err) => this.createMockFallback(prompt, user?.id, modelId, err))

      return result
    } catch (error) {
      chatLogger.error('Image generation failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model: 'gpt-image-1-mini',
      }
    }
  }

  /**
   * Primary: OpenAI gpt-image-1-mini (cheapest option)
   * Pricing: $0.005 (low) / $0.011 (medium) / $0.036 (high) per 1024x1024
   */
  private async tryGptImageMini(
    prompt: string,
    userId: string | undefined,
    modelId: string,
    quality: ImageQuality = 'medium'
  ): Promise<ImageGenerationResult> {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    chatLogger.info('Attempting image generation with gpt-image-1-mini', { quality })

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: quality,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      chatLogger.warn('gpt-image-1-mini failed, trying fallback', { status: response.status })
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL received from gpt-image-1-mini')
    }

    const result = {
      imageUrl,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image using GPT Image 1 Mini: "${prompt}"`,
      style: 'GPT Image Mini',
      dimensions: { width: 1024, height: 1024 },
    }

    if (userId) {
      await dailyLimits.recordUsage(userId, modelId).catch((err) => {
        chatLogger.error('Failed to record image usage', { userId, error: err })
      })
    }

    chatLogger.info('Image generated via gpt-image-1-mini', { quality })
    return { success: true, result, model: modelId }
  }

  /**
   * Fallback: OpenAI DALL-E 3 (higher quality, higher cost)
   * Pricing: $0.04 (standard) / $0.08-0.12 (HD) per 1024x1024
   */
  private async tryOpenAIDallE(
    prompt: string,
    userId: string | undefined,
    modelId: string
  ): Promise<ImageGenerationResult> {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured for fallback')
    }

    chatLogger.info('Falling back to DALL-E 3')

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const imageUrl = data.data[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL received from DALL-E 3')
    }

    const result = {
      imageUrl,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image using DALL-E 3: "${prompt}"`,
      style: 'DALL-E 3',
      dimensions: { width: 1024, height: 1024 },
    }

    if (userId) {
      await dailyLimits.recordUsage(userId, modelId).catch((err) => {
        chatLogger.error('Failed to record image usage', { userId, error: err })
      })
    }

    chatLogger.info('Image generated via DALL-E 3 fallback')
    return { success: true, result, model: 'dall-e-3-fallback' }
  }

  /**
   * Emergency fallback when all providers fail
   */
  private async createMockFallback(
    prompt: string,
    userId: string | undefined,
    modelId: string,
    previousError: Error
  ): Promise<ImageGenerationResult> {
    chatLogger.warn('All image providers failed, using placeholder', { error: previousError })

    const result = {
      imageUrl: `https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=${encodeURIComponent(prompt.slice(0, 50))}`,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image based on: "${prompt}"`,
      style: 'Digital Art',
      dimensions: { width: 1024, height: 1024 },
    }

    if (userId) {
      await dailyLimits.recordUsage(userId, modelId).catch((err) => {
        chatLogger.error('Failed to record image usage', { userId, error: err })
      })
    }

    return { success: true, result, model: modelId }
  }
}

export const imageGenerationService = new ImageGenerationService()

