'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Microphone } from '@phosphor-icons/react'
import { VoiceMode } from './voice-mode'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function SidebarVoiceButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const params = useParams<{ chatId: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const chatId = params?.chatId

  useEffect(() => {
    if (!searchParams) return

    const shouldOpen = searchParams.get('voice') === 'open'

    if (shouldOpen) {
      setIsOpen(true)

      const updatedParams = new URLSearchParams(searchParams.toString())
      updatedParams.delete('voice')

      const nextQuery = updatedParams.toString()
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname

      router.replace(nextUrl, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const handleClick = async () => {
    // If no chatId, create a new chat first
    if (!chatId) {
      setIsCreating(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            title: 'Voice Conversation'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create chat')
        }

        const { id: newChatId } = await response.json()
        
        // Redirect to new chat and open voice mode
        router.push(`/c/${newChatId}?voice=open`)
        setIsCreating(false)
      } catch (error) {
        console.error('Error creating chat:', error)
        setIsCreating(false)
      }
    } else {
      // If we have chatId, just open modal
      setIsOpen(true)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        disabled={isCreating}
        className={cn(
          "group/voice relative inline-flex w-full items-center radius-md px-3 py-2.5 text-[13.5px] transition-all duration-200 hover:translate-x-0.5",
          "bg-transparent hover:bg-muted/80 hover:text-foreground text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Microphone size={18} weight="duotone" className="transition-transform group-hover/voice:scale-110" />
            <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse" />
          </div>
          <span className="font-medium">Talk to Cleo</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Voice
          </span>
          <div className="text-muted-foreground text-xs opacity-0 duration-150 group-hover/voice:opacity-100">
            ⌘⇧V
          </div>
        </div>
      </Button>

      {isOpen && (
        <VoiceMode 
          chatId={chatId} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  )
}
