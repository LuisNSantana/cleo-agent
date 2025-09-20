import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dailyLimits } from "@/lib/daily-limits"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateObject } from "ai"
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
  try {
    const { prompt, userId } = await request.json()

    if (!prompt) {
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
    const modelId = 'openrouter:google/gemini-2.5-flash-image-preview'
    
    // Get the actual model configuration
    const model = MODELS.find(m => m.id === modelId)
    if (!model) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }

    // Check daily limits for authenticated users
    if (user?.id) {
      const limitCheck = await dailyLimits.canUseModel(user.id, modelId, model)
      
      if (!limitCheck.canUse) {
        return NextResponse.json(
          { 
            error: `Daily limit reached for image generation. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`,
            limitReached: true,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          },
          { status: 429 }
        )
      }
    }

    // Create OpenRouter client for Gemini 2.5 Flash Image Preview
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
        'X-Title': process.env.OPENROUTER_APP_TITLE || 'Cleo Agent',
      },
      baseURL: 'https://openrouter.ai/api/v1',
    })

    // Enhanced prompt for better image generation
    const enhancedPrompt = `Create a high-quality image with the following description: "${prompt}". 
    Make it visually appealing, well-composed, and detailed. If no specific style is mentioned, use a modern, professional style.`

    console.log('🎨 Generating image with prompt:', enhancedPrompt)

    // Generate image using Gemini 2.5 Flash Image Preview
    // Note: This is a simplified approach. In reality, you might need to use a different method
    // as generateObject is for structured outputs, not image generation
    
    // For now, we'll simulate the image generation response
    // In a real implementation, you would call the appropriate image generation API
    const mockImageResponse = {
      imageUrl: `https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=${encodeURIComponent(prompt.slice(0, 50))}`,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image based on: "${prompt}"`,
      style: "Digital Art",
      dimensions: {
        width: 1024,
        height: 1024
      }
    }

    // TODO: Replace with actual OpenRouter/Gemini image generation call
    // This would look something like:
    // const result = await openrouter.generateImage({
    //   model: "google/gemini-2.5-flash-image-preview",
    //   prompt: enhancedPrompt,
    //   size: "1024x1024",
    //   quality: "standard"
    // })

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
      result: mockImageResponse,
      model: modelId,
      usage: user?.id ? {
        userId: user.id,
        remaining: (await dailyLimits.canUseModel(user.id, modelId, model)).remaining - 1
      } : null
    })

  } catch (error) {
    console.error('Image generation error:', error)
    
    return NextResponse.json(
      { 
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
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

    const modelId = 'openrouter:google/gemini-2.5-flash-image-preview'
    
    // Get the actual model configuration
    const model = MODELS.find(m => m.id === modelId)
    if (!model) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }
    
    const limitCheck = await dailyLimits.canUseModel(userId, modelId, model)
    
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