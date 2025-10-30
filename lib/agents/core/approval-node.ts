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
    
    // CRITICAL FIX: Check if tool calls have already been approved
    // When resuming from interrupt(), LangGraph re-executes this node with the same state
    // We must detect if we're in a "post-approval resume" to avoid re-interrupting
    const hasApprovedMetadata = toolCalls.some((tc: any) => tc.__approval_status === 'approved')
    
    if (hasApprovedMetadata) {
      console.log('✅ [APPROVAL-NODE] Tool calls already approved, proceeding to execution')
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
    const response = interrupt(interruptPayload) as ToolApprovalResponse

    console.log(`▶️ [APPROVAL-NODE] Received approval response:`, response?.action)
    logger.info('APPROVAL-NODE', 'Approval response received', { action: response?.action })

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
    
    // CRITICAL FIX: Mark tool calls as approved to prevent re-interrupt on resume
    // When LangGraph resumes after interrupt(), it re-executes this node
    // We add metadata to signal "already approved, don't ask again"
    const approvedToolCalls = toolCalls.map((tc: any) => ({
      ...tc,
      __approval_status: 'approved' // Internal marker for approval-node
    }))
    
    const messagesWithApprovalMarker = [...state.messages]
    const lastMsgIndex = messagesWithApprovalMarker.length - 1
    const approvedMessage = new AIMessage({
      content: (lastMessage as AIMessage).content,
      tool_calls: approvedToolCalls,
      id: (lastMessage as AIMessage).id
    })
    messagesWithApprovalMarker[lastMsgIndex] = approvedMessage
    
    return {
      ...state,
      messages: messagesWithApprovalMarker
    }
  }
}
