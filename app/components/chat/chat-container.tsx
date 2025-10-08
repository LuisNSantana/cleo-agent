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
    // Key by pathname to ensure a full remount when route changes
    return <MultiChat key={pathname} />
  }

  // Key by pathname to ensure a full remount when route changes
  return <Chat key={pathname} />
}
