// todo: fix this
/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "@/components/ui/toast"
import { useChat } from "@ai-sdk/react"
import { useMemo } from "react"

type ModelConfig = {
  id: string
  name: string
  provider: string
}

type ModelChat = {
  model: ModelConfig
  messages: any[]
  isLoading: boolean
  append: (message: any, options?: any) => void
  stop: () => void
}

// Maximum number of models we support
const MAX_MODELS = 10

export function useMultiChat(models: ModelConfig[]): ModelChat[] {
  // Create a fixed number of useChat hooks to avoid conditional hook calls
  const chatHooks = Array.from({ length: MAX_MODELS }, (_, index) =>
    // todo: fix this
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChat({
      onError: (error: any) => {
        const model = models[index]
        if (model) {
          console.error(`Error with ${model.name}:`, error)
          toast({
            title: `Error with ${model.name}`,
            description: error.message,
            status: "error",
          })
        }
      },
    })
  )

  // Map only the provided models to their corresponding chat hooks
  const activeChatInstances = useMemo(() => {
    const instances = models.slice(0, MAX_MODELS).map((model, index) => {
  const chatHook = chatHooks[index] as any

      return {
        model,
        messages: chatHook.messages as any[],
        isLoading: Boolean(chatHook.status === 'in_progress'),
        append: (message: any, options?: any) => {
          // In v5, set the input before submitting
          if (typeof chatHook.setInput === 'function') {
            const text =
              (message && (message.text || message.content)) || ""
            chatHook.setInput(text)
          }
          if (typeof chatHook.handleSubmit === 'function') {
            return chatHook.handleSubmit(undefined, options)
          }
          // Fallback no-op
          return undefined
        },
        stop: chatHook.stop as () => void,
      }
    })

    return instances
    // todo: fix this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, ...chatHooks.map((chat: any) => chat.messages)])

  return activeChatInstances
}
