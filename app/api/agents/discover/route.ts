import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgentDiscoveryService } from '@/lib/agents/dynamic/agent-discovery'
import { EventEmitter } from '@/lib/agents/core/event-emitter'
import logger from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      // Return public/predefined agents only
      const eventEmitter = new EventEmitter()
      const discoveryService = getAgentDiscoveryService(eventEmitter)
      await discoveryService.initialize()
      
      const agents = discoveryService.getDiscoveredAgents()
        .filter(agent => agent.source === 'predefined')
      
      return NextResponse.json({
        success: true,
        agents,
        isAuthenticated: false
      })
    }
    
    // Initialize discovery service with user context
    const eventEmitter = new EventEmitter()
    const discoveryService = getAgentDiscoveryService(eventEmitter)
    await discoveryService.initialize(user.id)
    
    // Get all discovered agents
    const agents = discoveryService.getDiscoveredAgents()
    
    // Get delegation prompt for Cleo
    const delegationPrompt = discoveryService.generateDelegationPrompt()
    
    logger.info(`[API/discover] Found ${agents.length} agents for user ${user.id}`)
    
    return NextResponse.json({
      success: true,
      agents,
      delegationPrompt,
      isAuthenticated: true,
      userId: user.id
    })
    
  } catch (error) {
    logger.error('[API/discover] Error discovering agents:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to discover agents' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    const body = await request.json()
    const { refresh = false } = body
    
    // Initialize discovery service
    const eventEmitter = new EventEmitter()
    const discoveryService = getAgentDiscoveryService(eventEmitter)
    
    if (refresh) {
      // Force refresh discovery
      await discoveryService.refresh(user?.id)
      logger.info('[API/discover] Forced refresh of agent discovery')
    } else {
      // Normal initialization
      await discoveryService.initialize(user?.id)
    }
    
    // Get all discovered agents
    const agents = discoveryService.getDiscoveredAgents()
    
    // Get delegation prompt for Cleo
    const delegationPrompt = discoveryService.generateDelegationPrompt()
    
    return NextResponse.json({
      success: true,
      agents,
      delegationPrompt,
      refreshed: refresh,
      userId: user?.id
    })
    
  } catch (error) {
    logger.error('[API/discover] Error in POST:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process request' 
      },
      { status: 500 }
    )
  }
}
