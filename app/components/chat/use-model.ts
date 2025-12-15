import { toast } from "@/components/ui/toast"
import { Chats } from "@/lib/chat-store/types"
import { MODEL_DEFAULT, MODEL_DEFAULT_GUEST } from "@/lib/config"
import { useModel as useModelStore } from "@/lib/model-store/provider"
import type { UserProfile } from "@/lib/user/types"
import { useCallback, useState, useEffect } from "react"

interface UseModelProps {
  currentChat: Chats | null
  user: UserProfile | null
  updateChatModel?: (chatId: string, model: string) => Promise<void>
  chatId: string | null
}

/**
 * Hook to manage the current selected model with proper fallback logic
 * Handles both cases: with existing chat (persists to DB) and without chat (local state only)
 * @param currentChat - The current chat object
 * @param user - The current user object
 * @param updateChatModel - Function to update chat model in the database
 * @param chatId - The current chat ID
 * @returns Object containing selected model and handler function
 */
export function useModel({
  currentChat,
  user,
  updateChatModel,
  chatId,
}: UseModelProps) {
  const { models } = useModelStore()

  // Prevent hydration mismatch by using consistent default
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Calculate the effective model based on priority: chat model > default > first favorite model
  const getEffectiveModel = useCallback((): string => {
    // During SSR/hydration, always return fast model to prevent mismatch
    if (!isMounted) {
      return MODEL_DEFAULT_GUEST
    }
    
    const firstFavoriteModel = user?.favorite_models?.[0]
    // If no authenticated user, use guest default
    if (!user) {
      return (currentChat?.model ?? MODEL_DEFAULT_GUEST) as string
    }
  // Authenticated user: prefer the app's default model (MODEL_DEFAULT) before user's favorites
  // This ensures logged-in users see Fast model by default unless the chat has an explicit model
  return (currentChat?.model ?? MODEL_DEFAULT ?? firstFavoriteModel) as string
  }, [currentChat?.model, user?.favorite_models, user, isMounted])

  // Use local state only for temporary overrides, derive base value from props
  const [localSelectedModel, setLocalSelectedModel] = useState<string | null>(
    null
  )

  const getModelStorageKey = useCallback(() => {
    const uid = user?.id
    return `cleo:selectedModelId:${uid || "guest"}`
  }, [user?.id])

  // Restore last selected model for new chats (unless the chat has an explicit model).
  useEffect(() => {
    if (!isMounted) return
    if (currentChat?.model) return // chat-specific model wins
    if (localSelectedModel) return // explicit local override wins
    if (!Array.isArray(models) || models.length === 0) return

    try {
      const key = getModelStorageKey()
      const saved = localStorage.getItem(key)
      if (!saved) return
      const exists = models.some((m) => m.id === saved)
      if (exists) {
        setLocalSelectedModel(saved)
      } else {
        // Clean up stale values so we don't keep showing "Select model".
        localStorage.removeItem(key)
      }
    } catch {
      // ignore
    }
  }, [isMounted, currentChat?.model, localSelectedModel, models, getModelStorageKey])

  // When navigating between chats, drop any temporary override so chat model can render.
  useEffect(() => {
    setLocalSelectedModel(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  // The actual selected model: local override or computed effective model
  const selectedModel: string = localSelectedModel ?? getEffectiveModel()

  // Function to handle model changes with proper validation and error handling
  const handleModelChange = useCallback(
    async (newModel: string) => {
      // Persist last chosen model so it becomes the default for future chats.
      try {
        localStorage.setItem(getModelStorageKey(), newModel)
      } catch {
        // ignore
      }

      // For authenticated users without a chat, we can't persist yet
      // but we still allow the model selection for when they create a chat
      if (!user?.id && !chatId) {
        // For unauthenticated users without chat, just update local state
        setLocalSelectedModel(newModel)
        return
      }

      // For authenticated users with a chat, persist the change
      if (chatId && updateChatModel && user?.id) {
        // Optimistically update the state
        setLocalSelectedModel(newModel)

        try {
          await updateChatModel(chatId, newModel)
        } catch (err) {
          // Revert on error
          setLocalSelectedModel(null)
          console.error("Failed to update chat model:", err)
          toast({
            title: "Failed to update chat model",
            status: "error",
          })
          throw err
        }
      } else if (user?.id) {
        // Authenticated user but no chat yet - just update local state
        // The model will be used when creating a new chat
        setLocalSelectedModel(newModel)
      }
    },
    [chatId, updateChatModel, user?.id, getModelStorageKey]
  )

  return {
  selectedModel,
    handleModelChange,
  }
}
