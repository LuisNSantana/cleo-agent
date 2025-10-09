"use client"

import { MultiChat } from "@/app/components/multi-chat/multi-chat"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { Chat } from "./chat"
import { usePathname } from "next/navigation"

export function ChatContainer() {
  const { preferences } = useUserPreferences()
  const multiModelEnabled = preferences.multiModelEnabled
  const pathname = usePathname()

  if (multiModelEnabled) {
    // Preserve component instance across route changes to avoid losing optimistic UI state
    return <MultiChat />
  }

  // Preserve component instance across route changes to avoid losing optimistic UI state
  return <Chat />
}
