/**
 * Agent Graph API Route
 * Provides graph data for visualization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllAgents } from '@/lib/agents/unified-config'
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'

export async function GET() {
  try {
    const agents = await getAllAgents()
    const orchestrator = getAgentOrchestrator()
    const executions = orchestrator.getAllExecutions()

    // Create nodes for visualization with hierarchical positioning
    const nodes = agents.map((agent, index) => {
      let position = { x: 100, y: 100 }
      
      // Hierarchical positioning
      if (agent.id === 'cleo-supervisor') {
        // Cleo at the top center
        position = { x: 400, y: 50 }
      } else if (agent.isSubAgent) {
        // Sub-agents positioned below their parents
        const parentIndex = agents.findIndex(a => a.id === agent.parentAgentId)
        const subAgentIndex = agents.filter(a => 
          a.isSubAgent && a.parentAgentId === agent.parentAgentId
        ).findIndex(a => a.id === agent.id)
        
        position = {
          x: 200 + (parentIndex * 200) + (subAgentIndex * 150),
          y: 350
        }
      } else {
        // Main agents in middle row
        const mainAgentIndex = agents.filter(a => 
          !a.isSubAgent && a.id !== 'cleo-supervisor'
        ).findIndex(a => a.id === agent.id)
        
        position = {
          x: 100 + (mainAgentIndex * 200),
          y: 200
        }
      }

      return {
        id: agent.id,
        type: 'agent',
        position,
        data: {
          label: agent.name,
          agent,
          status: 'pending',
          executionCount: executions.filter(e => e.agentId === agent.id).length,
          lastExecution: executions
            .filter(e => e.agentId === agent.id)
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime,
          connections: [] as string[],
          isSubAgent: agent.isSubAgent,
          parentAgentId: agent.parentAgentId
        }
      }
    })

    // Create edges for handoffs and parent-child relationships
    const edges: any[] = []
    
    // First, create edges for parent-child relationships
    agents.forEach(agent => {
      if (agent.isSubAgent && agent.parentAgentId) {
        const parentAgent = agents.find(a => a.id === agent.parentAgentId)
        if (parentAgent) {
          edges.push({
            id: `parent_${agent.parentAgentId}_${agent.id}`,
            source: agent.parentAgentId,
            target: agent.id,
            type: 'hierarchy',
            animated: false,
            label: 'Sub-agent',
            style: { stroke: '#8B5CF6', strokeWidth: 2 },
            data: {
              type: 'parent-child',
              messageCount: 0,
              lastMessage: null,
              errorCount: 0
            }
          })
        }
      }
    })
    
    // Then, create edges for execution handoffs
    executions.forEach(execution => {
      for (let i = 0; i < (execution.messages || []).length - 1; i++) {
        const currentMessage = (execution.messages || [])[i]
        const nextMessage = (execution.messages || [])[i + 1]

        if (currentMessage.type === 'ai' && nextMessage.type === 'human') {
          if (currentMessage.content.toLowerCase().includes('delegat') ||
              currentMessage.content.toLowerCase().includes('transfer')) {

            const targetAgent = agents.find(a =>
              currentMessage.content.toLowerCase().includes(a.name.toLowerCase())
            )

            if (targetAgent) {
              // Check if this edge already exists (avoid duplicates)
              const existingEdge = edges.find(e => 
                e.source === execution.agentId && e.target === targetAgent.id
              )
              
              if (!existingEdge) {
                edges.push({
                  id: `handoff_${execution.id}_${i}`,
                  source: execution.agentId,
                  target: targetAgent.id,
                  type: 'handoff',
                  animated: true,
                  label: 'Handoff',
                  style: { stroke: '#10B981', strokeWidth: 1 },
                  data: {
                    type: 'execution',
                    messageCount: 1,
                    lastMessage: nextMessage.timestamp,
                    errorCount: 0
                  }
                })
              }
            }
          }
        }
      }
    })

    // Update connections in nodes
    nodes.forEach(node => {
      node.data.connections = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => edge.source === node.id ? edge.target : edge.source)
    })

    return NextResponse.json({
      success: true,
      graph: {
        nodes,
        edges
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        model: agent.model,
        tools: agent.tools,
        color: agent.color,
        icon: agent.icon
      })),
      metrics: {
        totalAgents: agents.length,
        totalExecutions: executions.length,
        activeExecutions: executions.filter(e => e.status === 'running').length,
        completedExecutions: executions.filter(e => e.status === 'completed').length,
        failedExecutions: executions.filter(e => e.status === 'failed').length
      }
    })

  } catch (error) {
    console.error('Error fetching graph data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    )
  }
}
