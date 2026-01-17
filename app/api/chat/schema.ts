// Message type for AI SDK compatibility
type Message = { role: string; content: any }
import { z } from "zod"

export type AgentMode = 'super' | 'multi'

export type ChatRequest = {
  messages: Message[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  enableSearch: boolean
  message_group_id?: string
  documentId?: string
  projectId?: string
  debugRag?: boolean
  agentMode?: AgentMode // 'super' = fast direct execution, 'multi' = delegated multi-agent
}

export const ChatRequestSchema = z.object({
  messages: z.array(z.any()).min(1),
  chatId: z.string().min(1),
  userId: z.string().min(1),
  model: z.string().min(1),
  isAuthenticated: z.boolean(),
  systemPrompt: z.string().optional().default(""),
  enableSearch: z.boolean().optional().default(false),
  message_group_id: z.string().optional(),
  documentId: z.string().optional(),
  projectId: z.string().optional(),
  debugRag: z.boolean().optional(),
  agentMode: z.enum(['super', 'multi']).optional().default('super'), // Default to Super Ankie
})
