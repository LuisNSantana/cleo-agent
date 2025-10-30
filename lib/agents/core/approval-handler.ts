/**
 * Human-in-the-Loop Approval Handler
 * 
 * Implements tool approval workflows using LangGraph's interrupt() pattern.
 * Sensitive tools (email, calendar, file operations) require user confirmation.
 * 
 * Based on LangGraph best practices:
 * - https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/add-human-in-the-loop/
 */

import type { StructuredToolInterface } from '@langchain/core/tools'
import { RunnableConfig } from '@langchain/core/runnables'
import { interrupt } from '@langchain/langgraph'
import { logger } from '@/lib/logger'

export interface ToolApprovalConfig {
  toolName: string
  requiresApproval: boolean
  approvalMessage?: string
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface ApprovalRequest {
  kind: 'tool-approval'
  tool: string
  args: Record<string, any>
  question: string
  riskLevel: 'low' | 'medium' | 'high'
  timestamp: string
}

export interface ApprovalResponse {
  type: 'accept' | 'reject' | 'edit'
  args?: Record<string, any>
  reason?: string
}

/**
 * Wrap a tool to require human approval before execution
 * 
 * Pattern from LangGraph docs: interrupt() pauses graph execution,
 * resume with Command(resume=...) continues from that point
 */
export function wrapToolWithApproval(
  tool: StructuredToolInterface,
  config: ToolApprovalConfig
): StructuredToolInterface {
  if (!config.requiresApproval) {
    return tool
  }

  const originalInvoke = tool.invoke.bind(tool)

  // Override invoke to add approval checkpoint
  tool.invoke = async function(
    input: any,
    runnableConfig?: RunnableConfig
  ): Promise<any> {
    logger.info('APPROVAL', `Tool ${config.toolName} requires user approval`)

    // Create approval request payload
    const approvalRequest: ApprovalRequest = {
      kind: 'tool-approval',
      tool: config.toolName,
      args: input,
      question: config.approvalMessage || `¿Aprobar ejecución de ${config.toolName}?`,
      riskLevel: config.riskLevel || 'medium',
      timestamp: new Date().toISOString()
    }

    // Pause execution and wait for user response
    // This uses LangGraph's checkpointing to save state
    const response: ApprovalResponse = interrupt(approvalRequest)

    logger.debug('APPROVAL', 'User response', response)

    // Handle rejection
    if (response.type === 'reject') {
      const reason = response.reason || 'Usuario canceló la operación'
      logger.info('APPROVAL', `Tool ${config.toolName} rejected: ${reason}`)
      return {
        success: false,
        cancelled: true,
        message: `Operación cancelada: ${reason}`,
        toolName: config.toolName
      }
    }

    // Handle argument edits
    if (response.type === 'edit' && response.args) {
      logger.info('APPROVAL', `Tool ${config.toolName} args edited by user`)
      input = response.args
    }

    // Execute tool with approved/edited arguments
    logger.info('APPROVAL', `Tool ${config.toolName} approved, executing...`)
    try {
      const result = await originalInvoke(input, runnableConfig)
      logger.info('APPROVAL', `Tool ${config.toolName} executed successfully`)
      return result
    } catch (error) {
      logger.error('APPROVAL', `Tool ${config.toolName} execution failed`, error)
      throw error
    }
  }

  return tool
}

/**
 * Apply approval wrappers to a list of tools based on configuration
 */
export function applyApprovalWrappers(
  tools: StructuredToolInterface[],
  approvalConfigs: Record<string, ToolApprovalConfig>
): StructuredToolInterface[] {
  return tools.map(tool => {
    const config = approvalConfigs[tool.name]
    
    if (!config) {
      // No config = no approval needed
      return tool
    }

    return wrapToolWithApproval(tool, config)
  })
}

/**
 * Helper to detect if a tool result indicates cancellation
 */
export function isToolCancelled(result: any): boolean {
  return (
    result &&
    typeof result === 'object' &&
    result.cancelled === true &&
    result.success === false
  )
}
