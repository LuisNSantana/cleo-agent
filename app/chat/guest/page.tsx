"use client"

import { Chat } from "@/app/components/chat/chat"
import { Button } from "@/components/ui/button"
import { SignIn } from "@phosphor-icons/react"
import { signInWithGoogle } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

/**
 * Guest chat page - allows users to try Cleo without authentication
 * Shows a "Sign In" button in the header to login and save conversation
 */
export default function GuestChatPage() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignIn() {
    const supabase = createClient()
    if (!supabase) {
      console.error("Supabase is not configured")
      return
    }

    try {
      setIsLoading(true)
      const data = await signInWithGoogle(supabase)
      
      // Redirect to Google OAuth
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Error signing in:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Guest Header with Sign In option */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <img 
            src="/img/agents/logocleo4.png" 
            alt="Cleo" 
            className="h-8 w-8 rounded-lg border border-primary/20"
          />
          <div>
            <h1 className="text-sm font-semibold">Trying Cleo</h1>
            <p className="text-xs text-muted-foreground">Guest mode - Sign in to save your chats</p>
          </div>
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          className="gap-2"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          <SignIn weight="bold" className="h-4 w-4" />
          {isLoading ? "Connecting..." : "Sign In"}
        </Button>
      </header>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>
    </div>
  )
}
