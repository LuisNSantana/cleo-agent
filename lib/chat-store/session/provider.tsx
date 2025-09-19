"use client"

import { usePathname } from "next/navigation"
import { createContext, useContext, useMemo } from "react"

const ChatSessionContext = createContext<{ chatId: string | null }>({
  chatId: null,
})

export const useChatSession = () => useContext(ChatSessionContext)

export function ChatSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const chatId = useMemo(() => {
    if (!pathname) return null
    // Reset explícito al estar en Home u otra ruta raíz
    if (pathname === '/' || pathname.startsWith('/p/')) return null
    if (pathname.startsWith("/c/")) {
      const id = pathname.split("/c/")[1]
      return id || null
    }
    return null
  }, [pathname])

  return (
    <ChatSessionContext.Provider value={{ chatId }}>
      {children}
    </ChatSessionContext.Provider>
  )
}
