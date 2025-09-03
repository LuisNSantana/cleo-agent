'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'

type ResponseNodeData = {
  title?: string
  content: string
  onOpen?: (payload: { title?: string; content: string }) => void
  isTyping?: boolean
  compact?: boolean
}

export default function ResponseNode({ data }: NodeProps<ResponseNodeData>) {
  const title = data.title || 'Respuesta'
  const content = String(data.content || '')
  const isTyping = Boolean(data.isTyping)
  const compact = Boolean(data.compact)

  // Simple typewriter effect
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (!isTyping) {
      setTyped(content)
      return
    }
    setTyped('')
    let i = 0
    const speed = 12 // chars per tick
    const interval = setInterval(() => {
      i = Math.min(i + speed, content.length)
      setTyped(content.slice(0, i))
      if (i >= content.length) clearInterval(interval)
    }, 40)
    return () => clearInterval(interval)
  }, [content, isTyping])
  if (compact) {
    return (
      <Card 
        className="w-52 shadow-sm border-2 border-emerald-300 bg-white/95 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => data.onOpen?.({ title, content })}
      >
        <CardContent className="p-2">
          <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
            {title}
          </div>
          <div className="text-[10px] text-gray-800 line-clamp-4 whitespace-pre-wrap">
            {typed}
          </div>
          <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-emerald-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className="w-64 shadow-lg border-2 border-emerald-300 bg-white/95 cursor-pointer hover:shadow-xl transition-shadow"
      onClick={() => data.onOpen?.({ title, content })}
    >
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">
          {title}
        </div>
        <div className="text-xs text-gray-800 line-clamp-6 whitespace-pre-wrap">
          {typed}
        </div>
        <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-emerald-500" />
      </CardContent>
    </Card>
  )
}
