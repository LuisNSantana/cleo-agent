'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Microphone } from '@phosphor-icons/react'
import { VoiceMode } from './voice-mode'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useChats } from '@/lib/chat-store/chats/provider'
import { useUser } from '@/lib/user-store/provider'
import { getOrCreateGuestUserId } from '@/lib/api'
import { toast } from '@/components/ui/toast'

export function SidebarVoiceButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const params = useParams<{ chatId: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const chatId = params?.chatId
  const { createNewChat } = useChats()
  const { user } = useUser()

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
    if (chatId) {
      setIsOpen(true)
      return
    }

    setIsCreating(true)

    try {
      const isAuthenticated = !!user?.id

      if (!isAuthenticated) {
        const existingGuestChatId = localStorage.getItem('guestChatId')
        if (existingGuestChatId) {
          router.push(`/c/${existingGuestChatId}?voice=open`)
          return
        }
      }

      const uid = isAuthenticated
        ? user?.id
        : await getOrCreateGuestUserId(user)

      if (!uid) {
        throw new Error('No user identifier available for chat creation.')
      }

      const newChat = await createNewChat(
        uid,
        'Voice Conversation',
        undefined,
        isAuthenticated
      )

      if (!newChat) {
        throw new Error('Failed to create chat')
      }

      if (!isAuthenticated) {
        localStorage.setItem('guestChatId', newChat.id)
      }

      router.push(`/c/${newChat.id}?voice=open`)
    } catch (error) {
      console.error('Error creating chat:', error)
      const message = error instanceof Error ? error.message : undefined
      toast({
        title: 'No pudimos iniciar el chat de voz',
        description: message,
        status: 'error',
      })
    } finally {
      setIsCreating(false)
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
