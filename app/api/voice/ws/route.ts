import { NextRequest } from 'next/server'

// WebSocket proxy is not supported in Next.js API routes
// The client should connect directly to OpenAI
// This endpoint returns the configuration needed for direct connection

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const model = searchParams.get('model') || 'gpt-4o-realtime-preview-2024-12-17'  // Use stable version
  
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  // Return configuration for client to connect directly
  return Response.json({
    url: `wss://api.openai.com/v1/realtime?model=${model}`,
    apiKey: apiKey,
    model: model
  })
}
