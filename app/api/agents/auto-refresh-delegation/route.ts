import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { newAgentId, newAgentName } = await request.json()

    if (!newAgentId) {
      return NextResponse.json({ error: 'Missing newAgentId' }, { status: 400 })
    }

    // Find Cleo for this user - we'll need to get user from request or session
    const { data: cleoAgents, error: cleoError } = await supabase
      .from('agents')
      .select('id, tools, user_id')
      .eq('name', 'Cleo')
      .order('created_at', { ascending: false })

    if (cleoError || !cleoAgents || cleoAgents.length === 0) {
      console.error('Error finding Cleo:', cleoError)
      return NextResponse.json({ error: 'Cleo agent not found' }, { status: 404 })
    }

    // For now, update all Cleo instances (we could be more specific with user_id if passed)
    const updates = []
    
    for (const cleoAgent of cleoAgents) {
      // Create the delegation tool name
      const delegationTool = `delegate_to_${newAgentId.replace(/[^a-zA-Z0-9]/g, '_')}`
      
      // Check if the tool already exists
      const currentTools = cleoAgent.tools || []
      if (!currentTools.includes(delegationTool)) {
        // Add the new delegation tool
        const updatedTools = [...currentTools, delegationTool]

        // Update Cleo with the new delegation tool
        const { error: updateError } = await supabase
          .from('agents')
          .update({ tools: updatedTools })
          .eq('id', cleoAgent.id)

        if (updateError) {
          console.error('Error updating Cleo tools:', updateError)
        } else {
          updates.push({
            cleoId: cleoAgent.id,
            tool: delegationTool
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Added delegation tools for ${newAgentName || 'new agent'}`,
      updates
    })

  } catch (error) {
    console.error('Error in auto-refresh-delegation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}