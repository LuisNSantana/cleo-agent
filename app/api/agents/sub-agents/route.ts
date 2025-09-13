/**
 * Sub-Agent Management API with Supabase Integration
 * RESTful endpoints for managing dynamic sub-agents
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SubAgentService } from '@/lib/agents/services/sub-agent-service'

// Validation schema for sub-agent creation
const subAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  parentAgentId: z.string().uuid(),
  systemPrompt: z.string().min(1).max(4000),
  model: z.string().optional().default('gpt-4o-mini'),
  config: z.record(z.any()).optional()
})

// Validation schema for sub-agent updates
const subAgentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).max(4000).optional(),
  model: z.string().optional(),
  config: z.record(z.any()).optional()
})

// Helper function to get user ID from session/auth
async function getUserId(request: NextRequest): Promise<string | null> {
  // TODO: Implement proper authentication with Supabase
  // For now, using a header or query parameter for development
  const userId = request.headers.get('x-user-id') || 
                request.nextUrl.searchParams.get('userId')
  
  return userId
}

// GET /api/agents/sub-agents?parentAgentId=xxx - List sub-agents for a parent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentAgentId = searchParams.get('parentAgentId')
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }
    
    if (parentAgentId) {
      // List sub-agents for specific parent
      const subAgents = await SubAgentService.getSubAgents(parentAgentId, userId)
      
      return NextResponse.json({
        success: true,
        subAgents,
        parentAgentId
      })
    } else {
      // List all sub-agents with statistics
      const statistics = await SubAgentService.getSubAgentStatistics(userId)
      
      return NextResponse.json({
        success: true,
        statistics,
        subAgents: []
      })
    }
  } catch (error) {
    console.error('Error fetching sub-agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sub-agents' },
      { status: 500 }
    )
  }
}

// POST /api/agents/sub-agents - Create new sub-agent
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    const validationResult = subAgentSchema.safeParse(data)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Create sub-agent using SubAgentService
    const subAgent = await SubAgentService.createSubAgent(userId, validatedData)

    return NextResponse.json(subAgent, { status: 201 })
  } catch (error) {
    console.error('Error creating sub-agent:', error)
    return NextResponse.json(
      { error: 'Failed to create sub-agent' },
      { status: 500 }
    )
  }
}

// DELETE /api/agents/sub-agents?agentId=xxx - Delete sub-agent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 }
      )
    }

    // Delete sub-agent using SubAgentService
    const success = await SubAgentService.deleteSubAgent(agentId, userId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Sub-agent deleted successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Sub-agent not found or not accessible' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error deleting sub-agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete sub-agent' },
      { status: 500 }
    )
  }
}

// PUT /api/agents/sub-agents?agentId=xxx - Update sub-agent
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 }
      )
    }

    const data = await request.json()
    
    const validationResult = subAgentUpdateSchema.safeParse(data)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Update sub-agent using SubAgentService
    const success = await SubAgentService.updateSubAgent(agentId, userId, validatedData)

    if (success) {
      // Get updated sub-agent details
      const updatedSubAgent = await SubAgentService.getSubAgent(agentId, userId)
      
      return NextResponse.json({
        success: true,
        subAgent: updatedSubAgent
      })
    } else {
      return NextResponse.json(
        { error: 'Sub-agent not found or not accessible' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error updating sub-agent:', error)
    return NextResponse.json(
      { error: 'Failed to update sub-agent' },
      { status: 500 }
    )
  }
}
