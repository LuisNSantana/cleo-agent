/**
 * Auto-Sync System for Agent Delegation Tools
 * 
 * Automatically updates delegation tools when agents are created/updated/deleted
 * Ensures real-time synchronization across the system
 */

import { agentRegistry } from './registry'
import { logger } from '@/lib/logger'

/**
 * Event types for agent synchronization
 */
export type AgentSyncEvent = 'agent_created' | 'agent_updated' | 'agent_deleted' | 'agent_activated' | 'agent_deactivated'

/**
 * Agent sync event data
 */
export interface AgentSyncEventData {
  event: AgentSyncEvent
  agentId: string
  userId: string
  agentName?: string
  parentAgentId?: string
  isSubAgent?: boolean
}

/**
 * Auto-sync manager class
 */
class AgentAutoSync {
  private subscribers = new Set<(event: AgentSyncEventData) => void>()
  private syncQueue = new Map<string, NodeJS.Timeout>()
  
  /**
   * Subscribe to agent sync events
   */
  subscribe(callback: (event: AgentSyncEventData) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Trigger agent sync event
   */
  async triggerSync(eventData: AgentSyncEventData): Promise<void> {
    logger.agentSync(`Agent sync triggered: ${eventData.event} for agent ${eventData.agentName} (${eventData.agentId})`)

    if (process.env.NODE_ENV === 'test') {
      await this.performSync(eventData)
      return
    }
    
    // Debounce rapid updates for the same user
    const debounceKey = `${eventData.userId}_${eventData.event}`
    if (this.syncQueue.has(debounceKey)) {
      clearTimeout(this.syncQueue.get(debounceKey)!)
    }
    
    const timeout = setTimeout(async () => {
      await this.performSync(eventData)
      this.syncQueue.delete(debounceKey)
    }, 1000) // 1 second debounce
    
    this.syncQueue.set(debounceKey, timeout)
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(eventData: AgentSyncEventData): Promise<void> {
    try {
      // 1. Refresh the agent registry for this user
      await agentRegistry.refresh(eventData.userId)
      
      // 2. Update delegation tools for all parent agents
      await this.updateDelegationToolsForUser(eventData.userId)
      
      // 3. Notify subscribers
      this.notifySubscribers(eventData)
      
      logger.agentSync(`Agent sync completed for user ${eventData.userId}`)
    } catch (error) {
      logger.error('AGENT-SYNC', 'Error during agent sync', { error, eventData })
      // Re-throw errors in test environment for proper testing
      if (process.env.NODE_ENV === 'test') {
        throw error
      }
    }
  }

  /**
   * Update delegation tools for all agents that can have sub-agents
   */
  private async updateDelegationToolsForUser(userId: string): Promise<void> {
    const allAgents = await agentRegistry.getAllAgentsForUser(userId)
    
    // Find all potential parent agents (non-sub-agents)
  const parentAgents = allAgents.filter(agent => !agent.isSubAgent)

    await Promise.allSettled(
      parentAgents.map(async parentAgent => {
        try {
          await agentRegistry.updateAgentDelegationTools(parentAgent.id, userId)
          logger.agentSync(`Updated delegation tools for ${parentAgent.name}`)
        } catch (error) {
          logger.error('AGENT-SYNC', `Failed to update delegation tools for ${parentAgent.name}`, error)
        }
      })
    )
  }

  /**
   * Notify all subscribers of the sync event
   */
  private notifySubscribers(eventData: AgentSyncEventData): void {
    for (const callback of this.subscribers) {
      try {
        callback(eventData)
      } catch (error) {
        logger.error('AGENT-SYNC', 'Error notifying sync subscriber', error)
      }
    }
  }

  /**
   * Manual sync trigger for user (useful for debugging)
   */
  async forceSyncUser(userId: string): Promise<void> {
    await this.performSync({
      event: 'agent_updated',
      agentId: 'manual_sync',
      userId,
      agentName: 'Manual Sync'
    })
  }
}

/**
 * Global auto-sync instance
 */
export const agentAutoSync = new AgentAutoSync()

/**
 * Convenience functions for triggering common sync events
 */
export async function triggerAgentCreated(agentId: string, userId: string, agentName: string, isSubAgent: boolean = false, parentAgentId?: string): Promise<void> {
  await agentAutoSync.triggerSync({
    event: 'agent_created',
    agentId,
    userId,
    agentName,
    isSubAgent,
    parentAgentId
  })
}

export async function triggerAgentUpdated(agentId: string, userId: string, agentName: string): Promise<void> {
  await agentAutoSync.triggerSync({
    event: 'agent_updated',
    agentId,
    userId,
    agentName
  })
}

export async function triggerAgentDeleted(agentId: string, userId: string, agentName: string): Promise<void> {
  await agentAutoSync.triggerSync({
    event: 'agent_deleted',
    agentId,
    userId,
    agentName
  })
}

/**
 * Initialize auto-sync system (call this in app startup)
 */
export function initializeAgentAutoSync(): void {
  logger.agentSync('Agent auto-sync system initialized')
}