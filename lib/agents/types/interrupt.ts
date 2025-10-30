/**
 * LangGraph Human-in-the-Loop Interrupt Types
 * Based on official @langchain/langgraph/prebuilt patterns
 * See: https://github.com/langchain-ai/agent-chat-ui
 */

/**
 * Structure of ActionRequest passed in interrupt payload
 */
export interface ActionRequest {
  action: string
  args: Record<string, any>
}

/**
 * Configuration for what actions are allowed during interrupt
 */
export interface InterruptConfig {
  allow_accept: boolean
  allow_edit: boolean
  allow_respond: boolean
  allow_ignore: boolean
}

/**
 * Main interrupt payload structure from LangGraph
 * This is what gets emitted when interrupt() is called
 */
export interface HumanInterrupt {
  action_request: ActionRequest
  config: InterruptConfig
  description?: string
}

/**
 * User response types when resuming from interrupt
 */
export type HumanResponseType = 'accept' | 'edit' | 'response' | 'ignore'

/**
 * Response payload sent back to graph to resume execution
 */
export interface HumanResponse {
  type: HumanResponseType
  args: any // Can be ActionRequest, string, or null depending on type
}

/**
 * Extended response type used in UI for tracking edits
 */
export type HumanResponseWithEdits = HumanResponse & (
  | { acceptAllowed?: false; editsMade?: never }
  | { acceptAllowed?: true; editsMade?: boolean }
)

/**
 * Execution state when paused at interrupt
 */
export interface InterruptState {
  executionId: string
  threadId: string
  interrupt: HumanInterrupt
  timestamp: Date
  status: 'pending' | 'approved' | 'rejected' | 'edited'
  response?: HumanResponse
}

/**
 * Type guard to check if a value is a HumanInterrupt
 */
export function isHumanInterrupt(value: unknown): value is HumanInterrupt {
  // LangGraph wraps interrupts as: [{ id: string, value: {...} }]
  // Need to extract .value from the wrapper
  let obj = Array.isArray(value) ? value[0] : value
  
  // If wrapped in {id, value} structure, extract the actual payload
  if (obj && typeof obj === 'object' && 'value' in obj) {
    obj = (obj as any).value
  }
  
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'action_request' in obj &&
    typeof obj.action_request === 'object' &&
    obj.action_request !== null &&
    'action' in obj.action_request &&
    'config' in obj &&
    typeof obj.config === 'object' &&
    obj.config !== null &&
    'allow_respond' in obj.config &&
    'allow_accept' in obj.config &&
    'allow_edit' in obj.config &&
    'allow_ignore' in obj.config
  )
}
