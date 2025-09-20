import { NextResponse } from 'next/server'
import { getAgentOrchestrator, registerRuntimeAgent } from '@/lib/agents/orchestrator-adapter-enhanced'
import { AgentConfig } from '@/lib/agents/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const cfg = body as AgentConfig
    // Ensure icon is set; default to robot emoji
    if (!cfg.icon) {
      cfg.icon = '🤖'
    }

    if (!cfg || !cfg.id) {
      return NextResponse.json({ success: false, error: 'Invalid agent payload' }, { status: 400 })
    }

    const orch = getAgentOrchestrator()
    console.log('[API/register] Orchestrator shape:', typeof orch, Object.keys(Object(orch)).slice(0,50))
    try {
      // Use the exported wrapper to avoid method-binding and proxy issues
      registerRuntimeAgent(cfg)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[API/register] Registered runtime agent with icon:', { id: cfg.id, icon: cfg.icon })
      }

      // Auto-refresh delegation tools for Cleo
      try {
        const refreshResponse = await fetch(`${req.url.split('/api')[0]}/api/agents/auto-refresh-delegation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            newAgentId: cfg.id, 
            newAgentName: cfg.name 
          })
        })
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          console.log('[API/register] Auto-refreshed delegation tools:', refreshData)
        } else {
          console.warn('[API/register] Failed to auto-refresh delegation tools')
        }
      } catch (refreshError) {
        console.error('[API/register] Error auto-refreshing delegation:', refreshError)
      }

      // Clear delegation cache to pick up new agent
      try {
        const cacheResponse = await fetch(`${req.url.split('/api')[0]}/api/agents/clear-delegation-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (cacheResponse.ok) {
          console.log('[API/register] Cleared delegation cache for new agent')
        }
      } catch (cacheError) {
        console.error('[API/register] Error clearing delegation cache:', cacheError)
      }

      return NextResponse.json({ success: true, agentId: cfg.id })
    } catch (err) {
      console.error('Error registering runtime agent via wrapper:', err)
      // Try recreating and using the wrapper again
      try {
  const { recreateAgentOrchestrator } = await import('@/lib/agents/orchestrator-adapter')
        recreateAgentOrchestrator()
        registerRuntimeAgent(cfg)

        // Auto-refresh delegation tools for Cleo
        try {
          const refreshResponse = await fetch(`${req.url.split('/api')[0]}/api/agents/auto-refresh-delegation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              newAgentId: cfg.id, 
              newAgentName: cfg.name 
            })
          })
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            console.log('[API/register] Auto-refreshed delegation tools (retry):', refreshData)
          }
        } catch (refreshError) {
          console.error('[API/register] Error auto-refreshing delegation (retry):', refreshError)
        }

        // Clear delegation cache to pick up new agent
        try {
          const cacheResponse = await fetch(`${req.url.split('/api')[0]}/api/agents/clear-delegation-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (cacheResponse.ok) {
            console.log('[API/register] Cleared delegation cache for new agent (retry)')
          }
        } catch (cacheError) {
          console.error('[API/register] Error clearing delegation cache (retry):', cacheError)
        }

        return NextResponse.json({ success: true, agentId: cfg.id, recreated: true })
      } catch (err2) {
        console.error('Retry after recreate failed:', err2)
        return NextResponse.json({ success: false, error: String(err2) }, { status: 500 })
      }
    }
  } catch (err) {
    console.error('Invalid request to register agent:', err)
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }
}
