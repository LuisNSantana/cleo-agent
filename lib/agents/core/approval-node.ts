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
 * Normalize tool arguments from generic UI fields to tool-specific fields
 * Example: UI uses 'body', but sendGmailMessage expects 'text'
 */
function normalizeToolArgs(toolName: string, args: any): any {
  if (!args) return args
  
  // sendGmailMessage: body → text (and strip HTML if present)
  if (toolName === 'sendGmailMessage' && args.body !== undefined) {
    const { body, ...rest } = args
    console.log(`🔄 [APPROVAL-NODE] Mapping 'body' → 'text' for ${toolName}`)
    
    // Strip HTML tags if present (convert <p>text</p> → text)
    let plainText = body
    if (typeof body === 'string' && (body.includes('<') || body.includes('&lt;'))) {
      // Unescape HTML entities first
      plainText = body
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      
      // Remove HTML tags
      plainText = plainText.replace(/<[^>]*>/g, '')
      
      // Clean up extra whitespace
      plainText = plainText
        .replace(/\n\s*\n/g, '\n\n')  // Multiple newlines → double newline
        .trim()
      
      console.log(`🧹 [APPROVAL-NODE] Stripped HTML from email body`)
    }
    
    return { ...rest, text: plainText }
  }
  
  // Add more tool-specific mappings here as needed
  
  return args
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
