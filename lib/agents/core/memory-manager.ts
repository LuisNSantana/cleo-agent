/**
 * Memory Manager for Agent System
 * Handles message history optimization and context management
 */

import { BaseMessage } from '@langchain/core/messages'

export interface MemoryConfig {
  maxThreadMessages?: number
  maxContextTokens?: number
  compressionThreshold?: number
}

export interface MemoryMetrics {
  totalMessages: number
  compressedMessages: number
  memoryUsage: number
  compressionRatio: number
}

export class MemoryManager {
  private config: Required<MemoryConfig>
  private messageCache = new Map<string, BaseMessage[]>()
  private metrics: MemoryMetrics = {
    totalMessages: 0,
    compressedMessages: 0,
    memoryUsage: 0,
    compressionRatio: 0
  }

  constructor(config: MemoryConfig = {}) {
    this.config = {
      maxThreadMessages: config.maxThreadMessages || 100,
      maxContextTokens: config.maxContextTokens || 8000,
      compressionThreshold: config.compressionThreshold || 0.8
    }
  }

  async optimizeMessageHistory(
    messages: BaseMessage[],
    threadId: string
  ): Promise<BaseMessage[]> {
    // Cache messages for this thread
    this.messageCache.set(threadId, messages)
    this.metrics.totalMessages = messages.length

    // If under limits, return as-is
    if (messages.length <= this.config.maxThreadMessages) {
      return messages
    }

    // Simple optimization: keep most recent messages
    const recentMessages = messages.slice(-this.config.maxThreadMessages)
    
    // Keep first message if it's a system message
    const optimized = messages[0]?.constructor.name === 'SystemMessage' 
      ? [messages[0], ...recentMessages.slice(1)]
      : recentMessages

    this.metrics.compressedMessages = optimized.length
    this.metrics.compressionRatio = optimized.length / messages.length
    
    return optimized
  }

  trackMessageLoad(threadId: string, messageCount: number): void {
    this.metrics.totalMessages = messageCount
  }

  getMetrics(): MemoryMetrics {
    return { ...this.metrics }
  }

  async cleanup(): Promise<void> {
    this.messageCache.clear()
    this.metrics = {
      totalMessages: 0,
      compressedMessages: 0,
      memoryUsage: 0,
      compressionRatio: 0
    }
  }
}
