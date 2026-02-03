'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Shuffle, Sparkles, User, Bot, Palette, Shapes } from 'lucide-react'

// DiceBear avatar styles - free and instant
const AVATAR_STYLES = [
  { id: 'adventurer', name: 'Adventurer', icon: User, description: 'Cartoon faces' },
  { id: 'avataaars', name: 'Avataaars', icon: User, description: 'Illustrated people' },
  { id: 'bottts', name: 'Robots', icon: Bot, description: 'Robot avatars' },
  { id: 'lorelei', name: 'Lorelei', icon: User, description: 'Elegant portraits' },
  { id: 'thumbs', name: 'Thumbs', icon: Shapes, description: 'Fun characters' },
  { id: 'shapes', name: 'Shapes', icon: Shapes, description: 'Abstract geometric' },
  { id: 'identicon', name: 'Identicon', icon: Palette, description: 'Unique patterns' },
  { id: 'initials', name: 'Initials', icon: Palette, description: 'Letter-based' },
] as const

type AvatarStyle = typeof AVATAR_STYLES[number]['id']

interface AvatarGeneratorProps {
  agentName: string
  currentAvatar?: string
  onAvatarChange: (avatarUrl: string, style: string) => void
  className?: string
}

/**
 * DiceBear-based avatar generator for Agent Creator
 * Free, instant, deterministic avatars
 */
export function AvatarGenerator({
  agentName,
  currentAvatar,
  onAvatarChange,
  className,
}: AvatarGeneratorProps) {
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('adventurer')
  const [seed, setSeed] = useState(agentName || 'agent')
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate DiceBear URL
  const avatarUrl = useMemo(() => {
    const safeSeed = encodeURIComponent(seed || 'agent')
    return `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  }, [selectedStyle, seed])

  // Update parent when avatar changes
  const handleStyleChange = (style: AvatarStyle) => {
    setSelectedStyle(style)
    const newUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
    onAvatarChange(newUrl, style)
  }

  // Randomize seed for new avatar
  const handleRandomize = () => {
    const newSeed = `${agentName || 'agent'}_${Date.now()}`
    setSeed(newSeed)
    const newUrl = `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${encodeURIComponent(newSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
    onAvatarChange(newUrl, selectedStyle)
  }

  // Use agent name as seed
  const handleUseAgentName = () => {
    setSeed(agentName || 'agent')
    const newUrl = `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${encodeURIComponent(agentName || 'agent')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
    onAvatarChange(newUrl, selectedStyle)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Avatar del Agente</Label>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          🎨 Nuevo
        </span>
      </div>

      {/* Avatar Preview */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-border shadow-md bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentAvatar || avatarUrl}
              alt="Agent Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={handleRandomize}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white dark:bg-zinc-800 border shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            title="Generar nuevo"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            Avatares únicos generados automáticamente. Cambia el estilo o haz clic en 🔀 para uno nuevo.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUseAgentName}
              className="h-7 text-xs"
            >
              Usar nombre
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRandomize}
              className="h-7 text-xs"
            >
              <Shuffle className="w-3 h-3 mr-1" />
              Aleatorio
            </Button>
          </div>
        </div>
      </div>

      {/* Style Selector */}
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_STYLES.map((style) => {
          const Icon = style.icon
          const isSelected = selectedStyle === style.id
          const previewUrl = `https://api.dicebear.com/9.x/${style.id}/svg?seed=${encodeURIComponent(seed)}&size=40&backgroundColor=b6e3f4`

          return (
            <button
              key={style.id}
              onClick={() => handleStyleChange(style.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/50"
                  : "border-border hover:border-blue-300 hover:bg-muted/50"
              )}
              title={style.description}
            >
              <div className="w-8 h-8 rounded-md overflow-hidden bg-white dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-medium truncate w-full text-center">
                {style.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* AI Generation (Future) */}
      <div className="pt-2 border-t border-dashed">
        <Button
          size="sm"
          variant="ghost"
          disabled
          className="w-full h-8 text-xs text-muted-foreground gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generar con IA (Próximamente)
        </Button>
      </div>
    </div>
  )
}
