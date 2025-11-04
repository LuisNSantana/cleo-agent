/**
 * Smart Thread Context Loader
 * Loads thread messages with token-aware truncation and thread isolation
 * 
 * KEY SECURITY: Thread isolation via thread_id + user_id prevents cross-contamination
 */

import { createClient } from '@/lib/supabase/server';
import { countMessageTokens, getModelContextWindow, getResponseReserveTokens } from './token-counter';

export interface LoadContextOptions {
  threadId: string;
  userId: string;
  model: string;
  maxTokens?: number; // Manual override
  includeSystemPrompt?: boolean;
  namespace?: string; // Additional isolation layer (optional)
}

export interface LoadContextResult {
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    metadata?: any;
    tool_calls?: any;
    tool_results?: any;
    created_at?: string;
  }>;
  tokenCount: number;
  truncated: boolean;
  totalMessages: number;
  includedMessages: number;
  droppedMessages: number;
  contextWindow: number;
  performance: {
    loadTimeMs: number;
    source: 'database' | 'cache';
  };
}

/**
 * Load thread context with smart token-based truncation
 * 
 * THREAD ISOLATION GUARANTEES:
 * 1. thread_id: Unique per conversation
 * 2. user_id: RLS enforcement at database level
 * 3. namespace: Optional additional isolation
 * 
 * This ensures Thread A NEVER contaminates Thread B
 * and User 1 NEVER sees User 2's data
 */
export async function loadThreadContext(
  options: LoadContextOptions
): Promise<LoadContextResult> {
  const startTime = Date.now();
  const {
    threadId,
    userId,
    model,
    maxTokens,
    includeSystemPrompt = true,
    namespace,
  } = options;

  console.log(`🔍 [CONTEXT_LOADER] Loading context for thread=${threadId}, user=${userId}, model=${model}`);

  const supabase = await createClient();
  if (!supabase) {
    console.error('❌ [CONTEXT_LOADER] Supabase client not available');
    return createEmptyResult();
  }

  // 🔒 STEP 1: Load ALL messages for THIS THREAD ONLY (thread isolation)
  // RLS ensures user_id isolation at database level
  let query = supabase
    .from('agent_messages')
    .select('*') // Select all columns (role, content, metadata, tool_calls, tool_results, created_at)
    .eq('thread_id', threadId)
    .eq('user_id', userId) // ✅ CRITICAL: User isolation
    .order('created_at', { ascending: true });

  // Optional namespace isolation (extra security layer)
  if (namespace) {
    query = query.eq('namespace', namespace);
  }

  const { data: allMessages, error } = await query;

  if (error) {
    console.error('❌ [CONTEXT_LOADER] Database error:', error);
    return createEmptyResult();
  }

  if (!allMessages || allMessages.length === 0) {
    console.log('📭 [CONTEXT_LOADER] No messages found for thread');
    return createEmptyResult();
  }

  console.log(`📦 [CONTEXT_LOADER] Loaded ${allMessages.length} total messages from database`);

  // 🎯 STEP 2: Calculate token budget
  const contextWindow = maxTokens || getModelContextWindow(model);
  const reserveForOutput = getResponseReserveTokens(model);
  const maxInputTokens = contextWindow - reserveForOutput;

  console.log(`📊 [CONTEXT_LOADER] Token budget: ${maxInputTokens.toLocaleString()} input + ${reserveForOutput.toLocaleString()} output = ${contextWindow.toLocaleString()} total`);

  // 📋 STEP 3: Deduplicate messages (keep first occurrence)
  const seen = new Set<string>();
  const dedupedMessages = allMessages.filter((msg: any) => {
    const key = `${msg.role}:${(msg.content || '').trim()}:${msg.created_at}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  if (dedupedMessages.length < allMessages.length) {
    console.log(`🔄 [CONTEXT_LOADER] Deduplication: ${allMessages.length} → ${dedupedMessages.length} messages`);
  }

  // 🏷️ STEP 4: Separate system messages from conversation and parse multimodal content
  const systemMessages = dedupedMessages.filter((m: any) => m.role === 'system');
  const conversationMessages = dedupedMessages.filter((m: any) => m.role !== 'system').map((msg: any) => {
    // Parse multimodal parts if stored as JSON string
    if (msg.metadata?.has_multimodal_parts && typeof msg.content === 'string') {
      try {
        const parsedContent = JSON.parse(msg.content);
        if (Array.isArray(parsedContent)) {
          return { ...msg, content: parsedContent };
        }
      } catch (e) {
        console.warn(`⚠️ [CONTEXT_LOADER] Failed to parse multimodal parts for message ${msg.id}:`, e);
      }
    }
    return msg;
  });

  // 🧮 STEP 5: Always include system prompt (if enabled)
  let currentTokens = 0;
  const selectedMessages: any[] = [];

  if (includeSystemPrompt && systemMessages.length > 0) {
    const systemTokens = countMessageTokens(systemMessages, model);
    currentTokens += systemTokens;
    selectedMessages.push(...systemMessages);
    console.log(`💬 [CONTEXT_LOADER] System prompts: ${systemMessages.length} messages, ${systemTokens} tokens`);
  }

  // 🔄 STEP 6: Add conversation messages from MOST RECENT backwards
  // This ensures we always have the latest context, truncating only old messages if needed
  const conversationToAdd: any[] = [];
  
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = countMessageTokens([msg], model);

    if (currentTokens + msgTokens > maxInputTokens) {
      // ⚠️ Token limit reached - stop adding older messages
      const remaining = conversationMessages.length - conversationToAdd.length;
      console.warn(`⚠️ [CONTEXT_LOADER] Token limit reached. Truncating ${remaining} oldest messages.`);
      console.warn(`   Current: ${currentTokens.toLocaleString()} tokens, New message: ${msgTokens} tokens, Max: ${maxInputTokens.toLocaleString()} tokens`);
      
      // TODO: Phase 2 - Implement semantic compression here
      // For now, we just stop adding older messages
      break;
    }

    conversationToAdd.unshift(msg); // Add to beginning (will reverse later)
    currentTokens += msgTokens;
  }

  // Add conversation messages in chronological order
  selectedMessages.push(...conversationToAdd);

  const loadTimeMs = Date.now() - startTime;
  const truncated = selectedMessages.length < dedupedMessages.length;
  const droppedMessages = dedupedMessages.length - selectedMessages.length;

  // 📊 STEP 7: Log results
  console.log(`✅ [CONTEXT_LOADER] Context loaded in ${loadTimeMs}ms`);
  console.log(`   Total messages: ${dedupedMessages.length}`);
  console.log(`   Included: ${selectedMessages.length}`);
  console.log(`   Dropped: ${droppedMessages}`);
  console.log(`   Tokens: ${currentTokens.toLocaleString()} / ${maxInputTokens.toLocaleString()}`);
  console.log(`   Truncated: ${truncated ? 'YES ⚠️' : 'NO ✅'}`);

  if (truncated) {
    console.log(`   💡 Tip: Consider implementing message summarization for threads with ${dedupedMessages.length}+ messages`);
  }

  return {
    messages: selectedMessages,
    tokenCount: currentTokens,
    truncated,
    totalMessages: dedupedMessages.length,
    includedMessages: selectedMessages.length,
    droppedMessages,
    contextWindow: maxInputTokens,
    performance: {
      loadTimeMs,
      source: 'database',
    },
  };
}

/**
 * Helper: Create empty result for error cases
 */
function createEmptyResult(): LoadContextResult {
  return {
    messages: [],
    tokenCount: 0,
    truncated: false,
    totalMessages: 0,
    includedMessages: 0,
    droppedMessages: 0,
    contextWindow: 0,
    performance: {
      loadTimeMs: 0,
      source: 'database',
    },
  };
}

/**
 * Validate thread ownership (security check)
 * Call this before loading context if you need extra validation
 */
export async function validateThreadOwnership(
  threadId: string,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) {
    return { valid: false, error: 'Supabase not available' };
  }

  // Check if thread belongs to user
  const { data, error } = await supabase
    .from('agent_threads')
    .select('user_id')
    .eq('id', threadId)
    .single();

  if (error) {
    return { valid: false, error: `Thread not found: ${error.message}` };
  }

  if (data.user_id !== userId) {
    return { valid: false, error: 'Thread does not belong to user' };
  }

  return { valid: true };
}
