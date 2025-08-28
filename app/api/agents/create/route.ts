/**
 * Create Agent API Route
 * Handles creation of new agents
 */

import { NextRequest, NextResponse } from 'next/server'
import { CreateAgentRequest } from '@/lib/agents/types'

export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentRequest = await request.json()
    const { name, description, role, model, tools, prompt } = body

    if (!name || !description || !role || !model) {
      return NextResponse.json(
        { error: 'Name, description, role, and model are required' },
        { status: 400 }
      )
    }

    // Generate a unique ID for the new agent
    const agentId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create the new agent configuration
    const newAgent = {
      id: agentId,
      name,
      description,
      role,
      model,
      temperature: 0.7,
      maxTokens: 4096,
      tools: tools || [],
      prompt: prompt || `You are ${name}, a ${role} agent. ${description}`,
      color: '#64748B',
      icon: '🤖'
    }

    // Here you would typically save to a database
    // For now, we'll just return the created agent
    console.log('Creating new agent:', newAgent)

    return NextResponse.json({
      success: true,
      agent: newAgent,
      message: 'Agent created successfully'
    })

  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      {
        error: 'Failed to create agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
