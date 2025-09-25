import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dailyLimits } from "@/lib/daily-limits"
import { z } from "zod"
import { MODELS } from "@/lib/models"

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
    const { prompt, userId } = await request.json()
    console.log('🎯 [DEBUG] Request data:', { prompt: prompt?.substring(0, 50), userId })

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

    const effectiveUserId = user?.id || 'anonymous'
    // Usar FLUX.1 Schnell via DeepInfra - compatible con OpenAI SDK
    const modelId = 'deepinfra:flux-1-schnell'
    console.log('🎯 [DEBUG] Using modelId:', modelId)

    // Para imagen, usamos un modelo compatible con ModelConfig
    const modelConfig = {
      id: modelId,
      name: 'FLUX.1 Schnell',
      provider: 'DeepInfra',
      providerId: 'deepinfra',
      baseProviderId: 'deepinfra',
      dailyLimit: 50,
      vision: false,
      tools: false,
      openSource: true,
      speed: "Fast" as const,
      intelligence: "Medium" as const
    }

    // Solo aplicar daily limit para este modelo de imagen
    if (user?.id) {
      const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)
      if (!limitCheck.canUse) {
        return NextResponse.json(
          { 
            error: `Daily limit reached for FLUX.1 Schnell. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`,
            limitReached: true,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          },
          { status: 429 }
        )
      }
    }

    // Get DeepInfra API key
    const deepinfraApiKey = process.env.DEEPINFRA_API_TOKEN
    if (!deepinfraApiKey) {
      console.log('❌ [DEBUG] DeepInfra API key not configured')
      return NextResponse.json(
        { error: "Missing DeepInfra API key. Set env var DEEPINFRA_API_TOKEN." },
        { status: 500 }
      )
    }

    // Enhanced prompt for better image generation
    const enhancedPrompt = `${prompt}. High quality, detailed, professional.`

    console.log('🎨 Generating image with FLUX.1 Schnell via DeepInfra:', enhancedPrompt)

    // Generate image using DeepInfra with OpenAI compatible API
    let imageData
    
    try {
      console.log('🎯 [DEBUG] Making call to DeepInfra API for image generation')
      
      // Import OpenAI client
      const { OpenAI } = await import('openai')
      
      const client = new OpenAI({
        apiKey: deepinfraApiKey,
        baseURL: "https://api.deepinfra.com/v1/openai",
      })

      const response = await client.images.generate({
        prompt: enhancedPrompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data returned from DeepInfra')
      }

      const image = response.data[0]
      if (image.b64_json) {
        imageData = image.b64_json
        console.log('✅ Found image data in b64_json format')
      } else if (image.url) {
        // If URL is returned, we'll need to fetch it and convert to base64
        console.log('🔄 Image returned as URL, fetching to convert to base64')
        const imageResponse = await fetch(image.url)
        const imageBuffer = await imageResponse.arrayBuffer()
        imageData = Buffer.from(imageBuffer).toString('base64')
        console.log('✅ Successfully converted URL to base64')
      } else {
        throw new Error('No valid image data format found in DeepInfra response')
      }
      
    } catch (modelError) {
      console.error('DeepInfra API failed:', modelError)
      throw new Error(`Image generation model failed: ${modelError instanceof Error ? modelError.message : 'Unknown model error'}`)
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
        await dailyLimits.recordUsage(user.id, modelId)
      } catch (error) {
        console.error('Failed to record image generation usage:', error)
      }
    }

    return NextResponse.json({
      success: true,
      result: imageResponse,
      model: modelId,
      usage: user?.id ? {
        userId: user.id,
        remaining: (await dailyLimits.canUseModel(user.id, modelId, modelConfig)).remaining - 1
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

    // Usar el mismo modelId que en el POST
    const modelId = 'deepinfra:flux-1-schnell'
    
    // Usar la misma configuración de modelo que en el POST
    const modelConfig = {
      id: modelId,
      name: 'FLUX.1 Schnell',
      provider: 'DeepInfra',
      providerId: 'deepinfra',
      baseProviderId: 'deepinfra',
      dailyLimit: 50,
      vision: false,
      tools: false,
      openSource: true,
      speed: "Fast" as const,
      intelligence: "Medium" as const
    }
    
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