"use client"

import { MultiChat } from "@/app/components/multi-chat/multi-chat"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { Chat } from "./chat"
import { usePathname } from "next/navigation"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { useEffect, useState } from "react"

export function ChatContainer() {
  const { preferences } = useUserPreferences()
  const multiModelEnabled = preferences.multiModelEnabled
  const pathname = usePathname()
  const { chatId } = useChatSession()
  
  // 🔧 FIX: Force component remount when chatId changes to ensure clean state
  // Use a combination of pathname and chatId for the key to handle both route changes
  // and programmatic chat switches
  const [mountKey, setMountKey] = useState(`${pathname}-${chatId || 'new'}`)
  
  useEffect(() => {
    // Update mount key when chatId or pathname changes
    const newKey = `${pathname}-${chatId || 'new'}`
    if (newKey !== mountKey) {
      setMountKey(newKey)
    }
  }, [pathname, chatId, mountKey])

  if (multiModelEnabled) {
    // Key by mountKey to ensure a full remount when route or chat changes
    return <MultiChat key={mountKey} />
  }

  // Key by mountKey to ensure a full remount when route or chat changes
  return <Chat key={mountKey} />
}
