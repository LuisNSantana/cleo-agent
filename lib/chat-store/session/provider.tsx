"use client"

import { usePathname } from "next/navigation"
import { createContext, useContext, useMemo, useEffect } from "react"

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
    
    // Reset explícito al estar en Home u otras rutas que no son de chat
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/docs' || 
        pathname === '/integrations' || pathname.startsWith('/agents/') || 
        pathname.startsWith('/p/') || pathname.startsWith('/auth/') || 
        pathname === '/privacy' || pathname === '/terms' || 
        pathname.startsWith('/share/')) {
      return null
    }
    
    if (pathname.startsWith("/c/")) {
      const id = pathname.split("/c/")[1]
      return id || null
    }
    return null
  }, [pathname])

  // Log para debugging (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ChatSessionProvider] Pathname: ${pathname}, ChatId: ${chatId}`)
    }
  }, [pathname, chatId])

  return (
    <ChatSessionContext.Provider value={{ chatId }}>
      {children}
    </ChatSessionContext.Provider>
  )
}
