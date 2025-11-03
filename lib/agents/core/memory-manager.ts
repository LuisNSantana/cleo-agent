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
      // INCREASED LIMIT: Smart loader handles token-aware optimization
      // This is now a safety net, not the primary limiter
      maxThreadMessages: config.maxThreadMessages || 1000, // Was 100
      maxContextTokens: config.maxContextTokens || 128000, // Increased for modern models
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

    // CRITICAL FIX: Messages from smart loader are already optimized
    // Smart loader uses token-aware loading and respects model limits
    // MemoryManager should NOT compress further - just pass through
    // 
    // Legacy behavior (kept for backward compatibility):
    // If messages exceed maxThreadMessages, assume they came from legacy code
    // and apply compression. But in practice, smart loader prevents this.
    
    if (messages.length <= this.config.maxThreadMessages) {
      // Already optimized - return as-is
      this.metrics.compressedMessages = messages.length
      this.metrics.compressionRatio = 1.0
      return messages
    }

    // Fallback compression (should rarely trigger with smart loader)
    console.warn('⚠️ [MEMORY-MANAGER] Message count exceeds limit, applying compression', {
      threadId,
      messageCount: messages.length,
      limit: this.config.maxThreadMessages,
      note: 'Smart loader should prevent this - check configuration'
    })

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
