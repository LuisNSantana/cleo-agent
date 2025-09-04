/**
 * Agent Sync API Route
 * Synchronizes agents between client and server for consistent state
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const orchestrator = getAgentOrchestrator()
    
    // Get all available agent configs from server
    const serverAgents = Array.from(orchestrator.getAgentConfigs().entries()).map(([id, config]) => ({
      id: config.id,
      name: config.name,
      description: config.description,
      role: config.role,
      tags: config.tags || [],
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      tools: config.tools,
      color: config.color,
      icon: config.icon
    }))

    return NextResponse.json({
      success: true,
      message: `Synced ${serverAgents.length} agents`,
      agents: serverAgents,
      count: serverAgents.length
    })
  } catch (error) {
    console.error('Error syncing agents:', error)
    return NextResponse.json(
      { error: 'Failed to sync agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { activeAgentIds } = body

    if (!Array.isArray(activeAgentIds)) {
      return NextResponse.json(
        { error: 'activeAgentIds must be an array' },
        { status: 400 }
      )
    }

    const orchestrator = getAgentOrchestrator()
    
    // Get current server agents
    const serverAgentIds = Array.from(orchestrator.getAgentConfigs().keys())
    
    // Find runtime agents that are not in the client's active list
    const runtimeAgents = serverAgentIds.filter(id => id.startsWith('custom_'))
    const staleAgents = runtimeAgents.filter(id => !activeAgentIds.includes(id))
    
    // Remove stale agents
    let removedCount = 0
    for (const agentId of staleAgents) {
      console.log(`🧹 Removing stale runtime agent: ${agentId}`)
      orchestrator.removeRuntimeAgent(agentId)
      removedCount++
    }

    if (removedCount > 0) {
      console.log(`🧹 Removed ${removedCount} stale runtime agents`)
    }

    return NextResponse.json({
      success: true,
      removed: removedCount,
      staleAgents
    })
  } catch (error) {
    console.error('Error cleaning stale agents:', error)
    return NextResponse.json(
      { error: 'Failed to clean stale agents' },
      { status: 500 }
    )
  }
}
