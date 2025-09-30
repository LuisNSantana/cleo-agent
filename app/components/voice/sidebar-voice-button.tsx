'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Microphone, MicrophoneSlash } from '@phosphor-icons/react'
import { VoiceMode } from './voice-mode'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function SidebarVoiceButton() {
  const [isOpen, setIsOpen] = useState(false)
  const params = useParams<{ chatId: string }>()
  const chatId = params?.chatId

  const handleClick = () => {
    setIsOpen(true)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
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
