import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializeDynamicOrchestrator, refreshDynamicAgents } from '@/lib/agents/dynamic/orchestrator-integration'
import { getCleoDynamicConfig } from '@/lib/agents/predefined/cleo-dynamic'
import { getAgentOrchestrator, registerRuntimeAgent } from '@/lib/agents/agent-orchestrator'
import logger from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    const body = await request.json()
    const { forceRefresh = false } = body
    
    logger.info('[API/refresh-cleo] Refreshing Cleo configuration')
    
    // Initialize or refresh dynamic orchestrator
    if (forceRefresh) {
      await refreshDynamicAgents(user?.id)
    } else {
      await initializeDynamicOrchestrator(user?.id)
    }
    
    // Get enhanced Cleo configuration with userId
    const dynamicCleoConfig = await getCleoDynamicConfig(user?.id)
    
    // Update Cleo in the orchestrator
    try {
      const orchestrator = getAgentOrchestrator()
      
      // Re-register Cleo with updated configuration
      registerRuntimeAgent(dynamicCleoConfig)
      
      logger.info('[API/refresh-cleo] Successfully updated Cleo with dynamic configuration')
      logger.info(`[API/refresh-cleo] Cleo now has ${dynamicCleoConfig.tools.length} tools available`)
      
      return NextResponse.json({
        success: true,
        message: 'Cleo configuration refreshed',
        toolCount: dynamicCleoConfig.tools.length,
        tools: dynamicCleoConfig.tools
      })
    } catch (orchError) {
      logger.error('[API/refresh-cleo] Error updating orchestrator:', orchError)
      
      // Try to recreate orchestrator and retry
      try {
        const { recreateAgentOrchestrator } = await import('@/lib/agents/orchestrator-adapter')
        recreateAgentOrchestrator()
        
        // Retry registration
        registerRuntimeAgent(dynamicCleoConfig)
        
        return NextResponse.json({
          success: true,
          message: 'Cleo configuration refreshed (orchestrator recreated)',
          toolCount: dynamicCleoConfig.tools.length,
          tools: dynamicCleoConfig.tools
        })
      } catch (retryError) {
        throw retryError
      }
    }
    
  } catch (error) {
    logger.error('[API/refresh-cleo] Error refreshing Cleo:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh Cleo configuration' 
      },
      { status: 500 }
    )
  }
}
