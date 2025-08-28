/**
 * Agent Graph API Route
 * Provides graph data for visualization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllAgents } from '@/lib/agents/config'
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'

export async function GET() {
  try {
    const agents = getAllAgents()
    const orchestrator = getAgentOrchestrator()
    const executions = orchestrator.getAllExecutions()

    // Create nodes for visualization
    const nodes = agents.map((agent, index) => ({
      id: agent.id,
      type: 'agent',
      position: {
        x: (index % 2) * 300 + 100,
        y: Math.floor(index / 2) * 200 + 100
      },
      data: {
        label: agent.name,
        agent,
        status: 'pending',
        executionCount: executions.filter(e => e.agentId === agent.id).length,
        lastExecution: executions
          .filter(e => e.agentId === agent.id)
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime,
        connections: [] as string[]
      }
    }))

    // Create edges for handoffs
    const edges: any[] = []
    executions.forEach(execution => {
      for (let i = 0; i < execution.messages.length - 1; i++) {
        const currentMessage = execution.messages[i]
        const nextMessage = execution.messages[i + 1]

        if (currentMessage.type === 'ai' && nextMessage.type === 'human') {
          if (currentMessage.content.toLowerCase().includes('delegat') ||
              currentMessage.content.toLowerCase().includes('transfer')) {

            const targetAgent = agents.find(a =>
              currentMessage.content.toLowerCase().includes(a.name.toLowerCase())
            )

            if (targetAgent) {
              edges.push({
                id: `edge_${execution.id}_${i}`,
                source: execution.agentId,
                target: targetAgent.id,
                type: 'handoff',
                animated: true,
                label: 'Handoff',
                data: {
                  messageCount: 1,
                  lastMessage: nextMessage.timestamp,
                  errorCount: 0
                }
              })
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
