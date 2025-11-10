/**
 * Agent Cleanup API Route  
 * Removes only runtime agents, keeps built-in agents intact
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const orchestrator = await getAgentOrchestrator()
    
    // Get current agent configs before cleanup
    const agentConfigs = await orchestrator.getAgentConfigs()
    const beforeAgents = Array.from(agentConfigs.keys())
  const runtimeAgentsBefore = beforeAgents.filter(id => /^custom_\d+$/.test(id))
    
    console.log(`🧹 Starting cleanup of ${runtimeAgentsBefore.length} runtime agents...`)
    
    // Remove runtime agents (those with timestamp in ID)
    runtimeAgentsBefore.forEach(agentId => {
      const removed = orchestrator.removeRuntimeAgent(agentId)
      if (removed) {
        console.log(`🗑️ Removed runtime agent: ${agentId}`)
      }
    })
    
    // Get final count
    const agentConfigsAfter = await orchestrator.getAgentConfigs()
    const afterAgents = Array.from(agentConfigsAfter.keys())
    const cleanedUpCount = runtimeAgentsBefore.length
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedUpCount} runtime agents`,
      cleanedUp: runtimeAgentsBefore,
      remaining: afterAgents,
      count: {
        before: beforeAgents.length,
        after: afterAgents.length,
        removed: cleanedUpCount
      }
    })
    
  } catch (error) {
    console.error('Error cleaning up runtime agents:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup runtime agents' },
      { status: 500 }
    )
  }
}
