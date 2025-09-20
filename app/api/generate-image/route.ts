import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dailyLimits } from "@/lib/daily-limits"
import { z } from "zod"
import { MODELS } from "@/lib/models"
import { GoogleGenerativeAI } from "@google/generative-ai"

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
    const modelId = 'google:gemini-2.5-flash-image-preview'
    
    // Get the actual model configuration
    const modelConfig = MODELS.find(m => m.id === modelId)
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }

    // Check daily limits for authenticated users
    if (user?.id) {
      const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)
      
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

    // Initialize Google Generative AI
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" })

    // Enhanced prompt for better image generation
    const enhancedPrompt = `Create a high-quality image with the following description: "${prompt}". 
    Make it visually appealing, well-composed, and detailed. If no specific style is mentioned, use a modern, professional style.`

    console.log('🎨 Generating image with prompt:', enhancedPrompt)

    // Generate image using Gemini 2.5 Flash Image Preview
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: enhancedPrompt
        }]
      }]
    })

    const response = await result.response
    const imageData = response.candidates?.[0]?.content?.parts?.[0]

    if (!imageData || !imageData.inlineData) {
      throw new Error("No image data received from Gemini")
    }

    // Convert base64 image to data URL
    const imageUrl = `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`

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

    const modelId = 'google:gemini-2.5-flash-image-preview'
    
    // Get the actual model configuration
    const modelConfig = MODELS.find(m => m.id === modelId)
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }
    
    const limitCheck = await dailyLimits.canUseModel(userId, modelId, modelConfig)
    
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