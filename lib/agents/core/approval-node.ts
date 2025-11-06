/**
 * Tool Approval Node for LangGraph
 * 
 * Implements production-grade human-in-the-loop pattern following official LangGraph guidelines:
 * https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
 * 
 * Pattern: Create a separate node that intercepts tool calls BEFORE execution,
 * uses interrupt() to pause, and resumes with Command().
 * 
 * Based on verified industry examples (Medium, LangGraph docs, production apps).
 */

import { BaseMessage, AIMessage } from '@langchain/core/messages'
import { interrupt } from '@langchain/langgraph'
import { TOOL_APPROVAL_CONFIG } from '@/lib/tools/tool-config'
import logger from '@/lib/utils/logger'
import type { HumanInterrupt } from '@/lib/agents/types/interrupt'

export interface ToolApprovalState {
  messages: BaseMessage[]
  [key: string]: any
}

export interface ToolApprovalInterrupt {
  kind: 'tool-approval'
  tools: Array<{
    id: string
    name: string
    args: Record<string, any>
  }>
  message: string
  timestamp: string
}

export interface ToolApprovalResponse {
  action: 'approve' | 'reject' | 'edit'
  edits?: Array<{
    id: string
    args: Record<string, any>
  }>
  reason?: string
}

/**
 * Check if a tool requires approval
 */
function requiresApproval(toolName: string): boolean {
  const config = TOOL_APPROVAL_CONFIG[toolName]
  return config?.requiresApproval === true
}

/**
 * Strip HTML tags and unescape HTML entities from text
 */
function stripHtml(text: string): string {
  if (!text || typeof text !== 'string') return text
  
  // Only process if HTML is detected
  if (!text.includes('<') && !text.includes('&lt;')) return text
  
  // Unescape HTML entities
  let cleaned = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '')
  
  // Clean up extra whitespace
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Triple+ newlines → double
    .trim()
  
  return cleaned
}

/**
 * Normalize tool arguments from generic UI fields to tool-specific fields
 * Handles field mapping and HTML sanitization for all approval tools
 * 
 * @param toolName - Name of the tool being normalized
 * @param args - Edited arguments from user (may be partial)
 * @param originalArgs - Original arguments from agent (for preserving non-edited fields)
 */
function normalizeToolArgs(toolName: string, args: any, originalArgs?: any): any {
  if (!args) return args
  
  const normalized = { ...args }
  
  // ==========================================
  // EMAIL TOOLS (Gmail)
  // ==========================================
  if (toolName === 'sendGmailMessage') {
    // UI uses 'body' but tool expects 'text'
    if (normalized.body !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'body' → 'text' for ${toolName}`)
      normalized.text = stripHtml(normalized.body)
      delete normalized.body
      console.log(`🧹 [APPROVAL-NODE] Cleaned email body (${normalized.text?.length || 0} chars)`)
    }
    // Also clean 'text' if it has HTML
    else if (normalized.text) {
      normalized.text = stripHtml(normalized.text)
    }
  }
  
  // ==========================================
  // CALENDAR TOOLS (Google Calendar)
  // ==========================================
  if (toolName === 'createCalendarEvent' || toolName === 'updateCalendarEvent') {
    // Clean description from HTML
    if (normalized.description) {
      normalized.description = stripHtml(normalized.description)
    }
    // UI might use 'body' for description
    if (normalized.body !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'body' → 'description' for ${toolName}`)
      normalized.description = stripHtml(normalized.body)
      delete normalized.body
    }
    
    // CRITICAL FIX: UI uses 'startTime'/'endTime' but Google Calendar API expects 'startDateTime'/'endDateTime'
    if (normalized.startTime !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'startTime' → 'startDateTime' for ${toolName}`)
      // Convert from HTML datetime-local format (2025-11-06T19:00) to ISO (2025-11-06T19:00:00)
      const startTime = normalized.startTime
      normalized.startDateTime = startTime.includes(':') && !startTime.endsWith(':00') && !startTime.includes('Z')
        ? `${startTime}:00`  // Add seconds if missing (e.g., "2025-11-06T19:00" → "2025-11-06T19:00:00")
        : startTime
      delete normalized.startTime
      console.log(`📅 [APPROVAL-NODE] Converted startDateTime: ${normalized.startDateTime}`)
    }
    
    if (normalized.endTime !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'endTime' → 'endDateTime' for ${toolName}`)
      // Convert from HTML datetime-local format (2025-11-06T20:00) to ISO (2025-11-06T20:00:00)
      const endTime = normalized.endTime
      normalized.endDateTime = endTime.includes(':') && !endTime.endsWith(':00') && !endTime.includes('Z')
        ? `${endTime}:00`  // Add seconds if missing
        : endTime
      delete normalized.endTime
      console.log(`📅 [APPROVAL-NODE] Converted endDateTime: ${normalized.endDateTime}`)
    }
    
    // Preserve critical fields from original args if not provided by user
    // (User might not edit all fields, preserve originals like timeZone, reminders, calendarId)
    const originalArgs = args  // Reference to original interrupt payload args
    
    // Preserve timeZone if not edited
    if (!normalized.timeZone && originalArgs.timeZone) {
      normalized.timeZone = originalArgs.timeZone
      console.log(`� [APPROVAL-NODE] Preserving original timeZone: ${normalized.timeZone}`)
    }
    
    // Preserve reminders if not edited
    if (!normalized.reminders && originalArgs.reminders) {
      normalized.reminders = originalArgs.reminders
      console.log(`🔄 [APPROVAL-NODE] Preserving original reminders: ${JSON.stringify(normalized.reminders)}`)
    }
    
    // Preserve calendarId if not edited
    if (!normalized.calendarId && originalArgs.calendarId) {
      normalized.calendarId = originalArgs.calendarId
    }
    
    // Preserve addConference if not edited
    if (normalized.addConference === undefined && originalArgs.addConference !== undefined) {
      normalized.addConference = originalArgs.addConference
    }
  }
  
  // ==========================================
  // NOTION TOOLS
  // ==========================================
  if (toolName === 'createNotionPage' || toolName === 'updateNotionPage') {
    // Clean content from HTML
    if (normalized.content) {
      // If content is a string, keep it as string (will be converted to blocks by tool)
      if (typeof normalized.content === 'string') {
        normalized.content = stripHtml(normalized.content)
      }
    }
    
    // UI might use 'body' for content
    if (normalized.body !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'body' → 'content' for ${toolName}`)
      normalized.content = stripHtml(normalized.body)
      delete normalized.body
    }
    
    // UI uses 'database' but tool uses 'parent_id'
    if (normalized.database !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'database' → 'parent_id' for ${toolName}`)
      normalized.parent_id = normalized.database
      delete normalized.database
      
      // If parent_id is provided, assume parent_type is database_id
      if (!normalized.parent_type) {
        normalized.parent_type = 'database_id'
      }
    }
  }
  
  // ==========================================
  // TWITTER/X TOOLS
  // ==========================================
  if (toolName === 'postTweet' || toolName === 'postTweetWithMedia') {
    // Twitter tool uses 'content', but UI uses 'text'
    // Map 'text' from UI → 'content' for tool
    if (normalized.text !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'text' → 'content' for ${toolName}`)
      normalized.content = stripHtml(normalized.text)
      delete normalized.text
    }
    
    // Clean content from HTML
    if (normalized.content) {
      normalized.content = stripHtml(normalized.content)
    }
    
    // UI might use 'body' for tweet text
    if (normalized.body !== undefined) {
      console.log(`🔄 [APPROVAL-NODE] Mapping 'body' → 'content' for ${toolName}`)
      normalized.content = stripHtml(normalized.body)
      delete normalized.body
    }
  }
  
  if (toolName === 'createTwitterThread') {
    // UI might provide 'text' field with thread content separated by newlines
    // Tool expects 'tweets' array of objects with 'text' property
    if (normalized.text !== undefined && !normalized.tweets) {
      console.log(`🔄 [APPROVAL-NODE] Converting 'text' → 'tweets' array for ${toolName}`)
      
      // Split by visual separator used in preview (---) or by paragraphs
      const threadParts = normalized.text
        .split(/\n\n---\n\n|\n\n\n+/) // Split by separator or multiple newlines
        .map((part: string) => part.trim())
        .filter((part: string) => part.length > 0)
      
      // Convert to tweets array format
      normalized.tweets = threadParts.map((text: string) => ({
        text: stripHtml(text).slice(0, 280) // Ensure each tweet is max 280 chars
      }))
      
      delete normalized.text
    }
    
    // Clean thread tweets from HTML if provided as array
    if (normalized.tweets && Array.isArray(normalized.tweets)) {
      normalized.tweets = normalized.tweets.map((tweet: any) => {
        if (typeof tweet === 'string') {
          return { text: stripHtml(tweet).slice(0, 280) }
        }
        if (typeof tweet === 'object' && tweet.text) {
          return { ...tweet, text: stripHtml(tweet.text).slice(0, 280) }
        }
        return tweet
      })
    }
  }
  
  // ==========================================
  // DRIVE TOOLS
  // ==========================================
  if (toolName === 'uploadFileToDrive' || toolName === 'createDriveFolder') {
    // Clean description from HTML
    if (normalized.description) {
      normalized.description = stripHtml(normalized.description)
    }
  }
  
  return normalized
}

/**
 * Tool Approval Node
 * 
 * This node is inserted between the agent and the tool execution node.
 * It checks if any requested tools require human approval.
 * If yes, it pauses execution using interrupt() and waits for user decision.
 * 
 * Usage in graph:
 * ```
 * builder.add_node("agent", agentNode)
 * builder.add_node("check_approval", createToolApprovalNode())
 * builder.add_node("tools", toolNode)
 * 
 * builder.add_edge("agent", "check_approval")
 * builder.add_conditional_edges(
 *   "check_approval",
 *   (state) => state.messages[state.messages.length - 1].tool_calls ? "tools" : END
 * )
 * ```
 */
export function createToolApprovalNode() {
  return async (state: ToolApprovalState): Promise<Partial<ToolApprovalState>> => {
    const lastMessage = state.messages[state.messages.length - 1]
    
    // Only process if last message has tool calls
    if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      console.log('🟢 [APPROVAL-NODE] No tool calls, continuing...')
      return state
    }

    const toolCalls = lastMessage.tool_calls
    
    // CRITICAL FIX: Check if these specific tool calls have already been approved
    // Use executionId + tool_call_ids to create a unique tracking key
    const executionId = state.metadata?.executionId || 'unknown'
    const toolCallIds = toolCalls.map((tc: any) => tc.id || 'no-id').join(',')
    const approvalKey = `${executionId}:${toolCallIds}`
    
    // Track approved tool calls in state metadata (survives LangGraph state updates)
    if (!state.metadata) (state as any).metadata = {}
    if (!state.metadata.__approvedToolCalls) (state.metadata as any).__approvedToolCalls = new Set<string>()
    
    const approvedSet = (state.metadata as any).__approvedToolCalls as Set<string>
    
    if (approvedSet.has(approvalKey)) {
      console.log('✅ [APPROVAL-NODE] Tool calls already approved (key:', approvalKey, '), skipping re-approval')
      return state
    }
    
    console.log(`🔍 [APPROVAL-NODE] Checking ${toolCalls.length} tool call(s) for approval requirements`)

    // Filter tools that require approval
    const toolsRequiringApproval = toolCalls.filter(tc => {
      const requires = requiresApproval(tc.name)
      console.log(`  ${requires ? '🔒' : '⚪'} ${tc.name}: ${requires ? 'REQUIRES approval' : 'no approval needed'}`)
      return requires
    })

    // If no tools require approval, continue normally
    if (toolsRequiringApproval.length === 0) {
      console.log('✅ [APPROVAL-NODE] No approval required, proceeding to tool execution')
      return state
    }

    // Tools require approval - pause execution
    console.log(`⏸️ [APPROVAL-NODE] ${toolsRequiringApproval.length} tool(s) require approval, pausing execution`)

    // Create HumanInterrupt payload following official LangGraph HITL pattern
    // For simplicity, we handle one tool at a time (first tool requiring approval)
    const toolCall = toolsRequiringApproval[0]
    const toolConfig = TOOL_APPROVAL_CONFIG[toolCall.name] || {
      requiresApproval: true,
      riskLevel: 'medium' as const,
      allowEdit: false,
      allowIgnore: true
    }

    const interruptPayload: HumanInterrupt = {
      action_request: {
        action: toolCall.name,
        args: toolCall.args || {}
      },
      config: {
        allow_accept: true,
        allow_edit: toolConfig.allowEdit ?? false,
        allow_respond: false,
        allow_ignore: toolConfig.allowIgnore ?? false
      },
      description: `${toolCall.name} requires approval before execution (risk: ${toolConfig.riskLevel})`
    }

    console.log('📋 [APPROVAL-NODE] Interrupt payload:', JSON.stringify(interruptPayload, null, 2))

    // LangGraph interrupt() pauses the graph and waits for Command(resume=...)
    // The interrupt() function returns the value passed in Command(resume=...)
    // ExecutionManager passes HumanResponse, so we need to convert it
    const humanResponse = interrupt(interruptPayload) as any
    
    // Convert HumanResponse to ToolApprovalResponse
    const response: ToolApprovalResponse = {
      action: humanResponse.type === 'accept' ? 'approve'
        : humanResponse.type === 'ignore' ? 'reject'
        : humanResponse.type === 'edit' ? 'edit'
        : 'approve', // 'response' type defaults to approve
      edits: humanResponse.type === 'edit' && humanResponse.args ? [{
        id: toolCall.id || 'unknown',
        args: normalizeToolArgs(toolCall.name, humanResponse.args)
      }] : undefined,
      reason: humanResponse.type === 'ignore' ? 'User rejected' : undefined
    }

    console.log(`▶️ [APPROVAL-NODE] Received approval response:`, response.action, 'with edits:', !!response.edits)
    logger.info('APPROVAL-NODE', 'Approval response received', { action: response.action, hasEdits: !!response.edits })

    // Handle rejection
    if (response.action === 'reject') {
      console.log(`🚫 [APPROVAL-NODE] User rejected tool execution: ${response.reason || 'No reason provided'}`)
      logger.info('APPROVAL-NODE', 'Tool execution rejected by user', { reason: response.reason })

      // Remove tool calls from the message to prevent execution
      // Create a new AIMessage without tool_calls
      const messagesWithoutToolCalls = [...state.messages]
      const lastMsgIndex = messagesWithoutToolCalls.length - 1
      const rejectedMessage = new AIMessage({
        content: `Tool execution cancelled by user. Reason: ${response.reason || 'User rejected the action'}`,
        id: (lastMessage as AIMessage).id
      })
      messagesWithoutToolCalls[lastMsgIndex] = rejectedMessage

      return {
        ...state,
        messages: messagesWithoutToolCalls
      }
    }

    // Handle edits
    if (response.action === 'edit' && response.edits) {
      console.log(`✏️ [APPROVAL-NODE] User edited ${response.edits.length} tool call(s)`)
      logger.info('APPROVAL-NODE', 'Tool calls edited by user', { editCount: response.edits.length })

      // Apply edits to tool calls
      const editedToolCalls = toolCalls.map(tc => {
        const edit = response.edits?.find(e => e.id === tc.id)
        if (edit) {
          console.log(`  ✏️ Editing tool ${tc.name} (${tc.id})`)
          return { ...tc, args: edit.args }
        }
        return tc
      })

      // Create new AIMessage with edited tool calls
      const messagesWithEditedCalls = [...state.messages]
      const lastMsgIndex = messagesWithEditedCalls.length - 1
      const editedMessage = new AIMessage({
        content: (lastMessage as AIMessage).content,
        tool_calls: editedToolCalls,
        id: (lastMessage as AIMessage).id
      })
      messagesWithEditedCalls[lastMsgIndex] = editedMessage

      // CRITICAL FIX: Mark edited tool calls as approved
      // Generate new approval key based on EDITED tool call IDs
      const editedToolCallIds = editedToolCalls.map((tc: any) => tc.id || 'no-id').join(',')
      const editedApprovalKey = `${executionId}:${editedToolCallIds}`
      approvedSet.add(editedApprovalKey)
      console.log(`✅ [APPROVAL-NODE] Marked EDITED tool calls as approved (key: ${editedApprovalKey})`)

      return {
        ...state,
        messages: messagesWithEditedCalls
      }
    }

    // Approve - continue with original tool calls
    console.log(`✅ [APPROVAL-NODE] User approved tool execution, continuing...`)
    logger.info('APPROVAL-NODE', 'Tool execution approved by user')
    
    // CRITICAL FIX: Mark these tool calls as approved in state metadata
    // This prevents re-approval when LangGraph re-executes this node after resume
    approvedSet.add(approvalKey)
    console.log(`✅ [APPROVAL-NODE] Marked tool calls as approved (key: ${approvalKey})`)
    
    return state
  }
}
