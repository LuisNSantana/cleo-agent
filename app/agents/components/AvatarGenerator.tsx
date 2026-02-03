'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Shuffle, Sparkles, User, Bot, Palette, Shapes, Check, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
 * Minimalist version optimized for mobile/desktop
 */
export function AvatarGenerator({
  agentName,
  currentAvatar,
  onAvatarChange,
  className,
}: AvatarGeneratorProps) {
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('adventurer')
  const [seed, setSeed] = useState(agentName || 'agent')
  
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

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Compact Main Row */}
      <div className="flex items-start gap-4 p-3 rounded-xl border bg-muted/20">
        {/* Avatar Preview */}
        <div className="relative group shrink-0">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-background shadow-sm bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentAvatar || avatarUrl}
              alt="Agent Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={handleRandomize}
            className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors"
            title="Generar variante"
          >
            <Shuffle className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3 pt-0.5">
           <div className="flex items-center justify-between">
             <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estilo del Avatar</Label>
             <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">Auto-generated</span>
           </div>
           
           <div className="flex gap-2 w-full">
            <Select value={selectedStyle} onValueChange={(val) => handleStyleChange(val as AvatarStyle)}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {AVATAR_STYLES.map(style => (
                  <SelectItem key={style.id} value={style.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <style.icon className="w-3 h-3 opacity-70" />
                      <span>{style.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRandomize}
              className="h-8 flex-1 text-xs px-2"
              title="Generar nueva variante visual"
            >
              <Shuffle className="w-3 h-3 mr-1.5 opacity-70" />
              Variar
            </Button>
           </div>
        </div>
      </div>
    </div>
  )
}
