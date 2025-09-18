import type { CoreMessage } from "ai"
import { z } from "zod"

export type ChatRequest = {
  messages: CoreMessage[]
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
})
