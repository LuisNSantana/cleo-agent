import { NextRequest, NextResponse } from 'next/server'
import { clearAgentMappingCache } from '@/lib/agents/dynamic-delegation'

export async function POST(request: NextRequest) {
  try {
    // Clear the agent mapping cache to force refresh on next delegation decision
    clearAgentMappingCache()
    
    return NextResponse.json({ 
      success: true,
      message: 'Agent mapping cache cleared successfully'
    })

  } catch (error) {
    console.error('Error clearing agent mapping cache:', error)
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 })
  }
}