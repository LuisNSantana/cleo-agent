import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dailyLimits } from "@/lib/daily-limits"
import { z } from "zod"
import { ModelConfig } from "@/lib/models/types"

const IMAGE_MODEL_DAILY_LIMIT = 50

const buildImageModelConfig = (modelId: string): ModelConfig => {
  const isOpenAI = modelId.startsWith('openai:')
  const provider = isOpenAI ? 'OpenAI' : 'DeepInfra'
  const providerId = isOpenAI ? 'openai' : 'deepinfra'
  return {
    id: modelId,
    name: isOpenAI ? 'GPT Image 1' : 'FLUX Image Model',
    provider,
    providerId,
    baseProviderId: providerId,
    dailyLimit: IMAGE_MODEL_DAILY_LIMIT,
    vision: false,
    tools: false,
    openSource: !isOpenAI,
    speed: "Fast",
    intelligence: "Medium"
  }
}

// Schema for image generation response
const ImageGenerationSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string(),
  description: z.string(),
  style: z.string().optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number()
  }).optional()
})

export async function POST(request: NextRequest) {
  console.log('🎯 [DEBUG] POST /api/generate-image endpoint called')
  
  try {
  const { prompt, userId, modelVariant } = await request.json()
  console.log('🎯 [DEBUG] Request data:', { prompt: prompt?.substring(0, 60), userId, modelVariant })

    if (!prompt) {
      console.log('❌ [DEBUG] No prompt provided')
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Get user from Supabase if userId provided
    let user = null
    if (userId) {
      const supabase = await createClient()
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser()
        user = userData.user
      }
    }

    const enhancedPrompt = `${prompt}. High quality, detailed, professional.`

    const attempts: Array<{ model: string; provider: string; success: boolean; error?: string; ms: number }> = []
    let imageData: string | undefined
    let canonicalModel = 'openai:gpt-image-1'

    const openaiKey = process.env.OPENAI_API_KEY
    const deepinfraApiKey = process.env.DEEPINFRA_API_TOKEN

    if (!openaiKey && !deepinfraApiKey) {
      return NextResponse.json(
        { error: "No image generation providers configured." },
        { status: 500 }
      )
    }

    const allowSchnellFallback = process.env.IMAGE_ALLOW_SCHNELL_FALLBACK !== 'false'
    const fluxBaseCandidates = ['black-forest-labs/FLUX-pro', 'black-forest-labs/flux-pro']
    const schnellFallback = allowSchnellFallback ? ['black-forest-labs/flux-1-schnell', 'flux-1-schnell'] : []

    let fluxCandidates = [...fluxBaseCandidates]
    if (modelVariant === 'schnell' && allowSchnellFallback) {
      fluxCandidates = ['black-forest-labs/flux-1-schnell', 'flux-1-schnell', ...fluxBaseCandidates]
    } else if (modelVariant === 'flux-pro') {
      fluxCandidates = [...fluxBaseCandidates]
    }

    let usageLimitSnapshot: { remaining: number; limit: number } | null = null

    if (openaiKey) {
      let canUseOpenAI = true
      let openAiLimitSnapshot: { remaining: number; limit: number } | null = null
      if (user?.id) {
        const config = buildImageModelConfig('openai:gpt-image-1')
        const limitCheck = await dailyLimits.canUseModel(user.id, config.id, config)
        if (!limitCheck.canUse) {
          canUseOpenAI = false
          attempts.push({ model: 'gpt-image-1', provider: 'openai', success: false, error: 'Daily limit reached', ms: 0 })
        } else {
          openAiLimitSnapshot = { remaining: limitCheck.remaining, limit: limitCheck.limit }
        }
      }

      if (canUseOpenAI) {
        try {
          console.log('🎨 [IMG] Generating with OpenAI gpt-image-1 (primary)')
          const { OpenAI } = await import('openai')
          const client = new OpenAI({ apiKey: openaiKey })
          const startOpenAI = Date.now()
          const response = await client.images.generate({
            model: 'gpt-image-1',
            prompt: enhancedPrompt,
            size: '1024x1024',
            n: 1,
          })
          if (!response.data?.length) throw new Error('No image data returned from OpenAI')
          const image = response.data[0]
          if (image.b64_json) {
            imageData = image.b64_json
          } else if (image.url) {
            const urlResp = await fetch(image.url)
            const buf = await urlResp.arrayBuffer()
            imageData = Buffer.from(buf).toString('base64')
          } else {
            throw new Error('Unsupported image format from OpenAI')
          }
          attempts.push({ model: 'gpt-image-1', provider: 'openai', success: true, ms: Date.now() - startOpenAI })
          usageLimitSnapshot = openAiLimitSnapshot
        } catch (error: any) {
          const message = error?.message || String(error)
          attempts.push({ model: 'gpt-image-1', provider: 'openai', success: false, error: message, ms: 0 })
          console.warn('⚠️ [IMG] OpenAI gpt-image-1 failed:', message)
          usageLimitSnapshot = null
        }
      }
    }

    if (!imageData && deepinfraApiKey) {
      const deepInfraCandidates = [...fluxCandidates, ...schnellFallback]

      for (let i = 0; i < deepInfraCandidates.length; i++) {
        const candidate = deepInfraCandidates[i]
        const candidateModelId = `deepinfra:${candidate}`
        let candidateLimitSnapshot: { remaining: number; limit: number } | null = null
        if (user?.id) {
          const config = buildImageModelConfig(candidateModelId)
          const limitCheck = await dailyLimits.canUseModel(user.id, candidateModelId, config)
          if (!limitCheck.canUse) {
            attempts.push({ model: candidate, provider: 'deepinfra', success: false, error: 'Daily limit reached', ms: 0 })
            continue
          }
          candidateLimitSnapshot = { remaining: limitCheck.remaining, limit: limitCheck.limit }
        }
        const start = Date.now()
        try {
          console.log(`🧪 [IMG] DeepInfra attempt ${i + 1}/${deepInfraCandidates.length} -> ${candidate}`)
          const { OpenAI: DeepInfraOpenAI } = await import('openai')
          const client = new DeepInfraOpenAI({
            apiKey: deepinfraApiKey,
            baseURL: 'https://api.deepinfra.com/v1/openai'
          })
          const response = await client.images.generate({
            prompt: enhancedPrompt,
            model: candidate,
            size: '1024x1024',
            quality: 'standard',
            n: 1,
          })
          if (!response.data?.length) throw new Error('No image data')
          const image = response.data[0]
          if (image.b64_json) {
            imageData = image.b64_json
          } else if (image.url) {
            const r = await fetch(image.url)
            const buf = await r.arrayBuffer()
            imageData = Buffer.from(buf).toString('base64')
          } else {
            throw new Error('Unsupported image format in response')
          }
          canonicalModel = candidateModelId
          attempts.push({ model: candidate, provider: 'deepinfra', success: true, ms: Date.now() - start })
          usageLimitSnapshot = candidateLimitSnapshot
          break
        } catch (err: any) {
          const ms = Date.now() - start
          const message = err?.message || String(err)
          attempts.push({ model: candidate, provider: 'deepinfra', success: false, error: message, ms })
          console.warn(`⚠️ [IMG] Failed ${candidate} in ${ms}ms: ${message}`)
          usageLimitSnapshot = null
          if (message.includes('422') || message.includes('no body')) {
            continue
          }
        }
      }
    }

    if (!imageData) {
      console.error('❌ [IMG] All image generation attempts failed')
      throw new Error('All image generation attempts failed')
    }

    // Validate that we have meaningful image data
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Model returned invalid image data')
    }

    // The imageData should be base64 encoded
    let imageUrl = ''
    
    if (imageData.startsWith('data:image')) {
      // Already a data URL
      imageUrl = imageData
    } else {
      // Raw base64 data, add proper data URL prefix
      imageUrl = `data:image/png;base64,${imageData}`
    }

    console.log('✅ [DEBUG] Successfully processed image data, length:', imageData.length)

    // Final validation that we have a valid image URL
    if (!imageUrl || imageUrl === 'data:image/png;base64,') {
      throw new Error('Failed to create valid image data URL')
    }

    const imageResponse = {
      imageUrl,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image based on: "${prompt}"`,
      style: "AI Generated",
      dimensions: {
        width: 1024,
        height: 1024
      }
    }

    // Record usage if user is authenticated
    if (user?.id) {
      try {
        await dailyLimits.recordUsage(user.id, canonicalModel)
      } catch (error) {
        console.error('Failed to record image generation usage:', error)
      }
    }

    return NextResponse.json({
      success: true,
      result: imageResponse,
      model: canonicalModel,
      canonicalModel,
      fallbackUsed: canonicalModel.startsWith('deepinfra:'),
      attempts: attempts.map(a => ({...a, provider: a.provider })),
      usage: user?.id ? {
        userId: user.id,
        remaining: usageLimitSnapshot ? Math.max(usageLimitSnapshot.remaining - 1, 0) : null,
        limit: usageLimitSnapshot ? usageLimitSnapshot.limit : null
      } : null
    })

  } catch (error) {
    console.error('Image generation error:', error)
    
    // Provide specific error messages based on the error type
    let userMessage = "Failed to generate image"
    let statusCode = 500
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userMessage = "Service temporarily unavailable. Please try again later."
        statusCode = 503
      } else if (errorMessage.includes('model returned text')) {
        userMessage = "Image generation service is currently unavailable. Please try again in a few minutes."
        statusCode = 503
      } else if (errorMessage.includes('empty response') || errorMessage.includes('no image data')) {
        userMessage = "Failed to generate image. Please try with a different description."
        statusCode = 422
      } else if (errorMessage.includes('timeout')) {
        userMessage = "Image generation timed out after 2 minutes. Please try again with a simpler description."
        statusCode = 408
      } else {
        userMessage = "Image generation failed. Please try again or contact support if the problem persists."
      }
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        success: false,
        canRetry: statusCode !== 429, // Don't retry if it's a rate limit error
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : "Unknown error")
          : undefined
      },
      { status: statusCode }
    )
  }
}

// GET endpoint to check daily limits
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
    const hasDeepInfra = Boolean(process.env.DEEPINFRA_API_TOKEN)

    if (!hasOpenAI && !hasDeepInfra) {
      return NextResponse.json({ error: "No image provider configured" }, { status: 500 })
    }

    const modelId = hasOpenAI ? 'openai:gpt-image-1' : 'deepinfra:black-forest-labs/FLUX-pro'
    const modelConfig = buildImageModelConfig(modelId)
    
    const limitCheck = await dailyLimits.canUseModel(userId, modelId, modelConfig)
    console.log('🎯 [DEBUG] GET limit check result:', limitCheck)
    
    return NextResponse.json({
      canGenerate: limitCheck.canUse,
      remaining: limitCheck.remaining,
      limit: limitCheck.limit,
      model: modelId
    })

  } catch (error) {
    console.error('Error checking image generation limits:', error)
    return NextResponse.json(
      { error: "Failed to check limits" },
      { status: 500 }
    )
  }
}