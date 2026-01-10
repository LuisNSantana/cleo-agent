'use client'

import React from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LucideBrain, LucideArrowRight, LucideHeart } from 'lucide-react'

type RouterNodeData = {
  label?: string
  status?: 'active' | 'idle' | 'trail'
  compact?: boolean
}

/**
 * RouterNode
 * Visual node showing Cleo's routing decision point.
 * Shows when the supervisor is evaluating which specialist to delegate to.
 */
export default function RouterNode({ data }: NodeProps<RouterNodeData>) {
  const { label = 'Cleo · Supervisando', status = 'idle', compact } = data || {}
  const isActive = status === 'active'
  const isTrail = status === 'trail'

  if (compact) {
    return (
      <div className="relative" title="Supervisor routing">
        {isTrail && (
          <div className="absolute -inset-0.5 rounded-lg bg-pink-500/30 blur-[2px]" />
        )}
        <div className={`flex items-center gap-2 rounded-lg border bg-slate-800/90 backdrop-blur px-2.5 py-1.5 shadow-md ${isActive ? 'ring-2 ring-pink-500/70' : ''}`} style={{ borderColor: '#ec4899', borderWidth: 2 }}>
          <Avatar className="w-5 h-5">
            <AvatarImage src="/img/agents/ankie4.png" alt="Ankie" className="object-cover" />
            <AvatarFallback className="bg-pink-200">
              <LucideHeart className="size-2 text-pink-700" />
            </AvatarFallback>
          </Avatar>
          <span className={`text-xs font-medium truncate max-w-[140px] ${isActive ? 'text-pink-200' : 'text-slate-200'}`}>{label}</span>
          <Handle type="target" position={Position.Left} className="!size-2 !bg-pink-600" />
          <Handle type="source" position={Position.Right} className="!size-2 !bg-pink-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Enhanced pulsing ring effect when active */}
      {isActive && (
        <>
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-pink-600/40 via-purple-600/40 to-indigo-600/40 blur-xl animate-pulse opacity-90" />
          <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-pink-500/60 to-purple-500/60 blur-lg animate-pulse" />
        </>
      )}
      {/* Trail effect - sophisticated glowing border */}
      {isTrail && (
        <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-pink-500/50 via-purple-500/50 to-indigo-500/50 blur-md" />
      )}
      <Card className={`w-60 border-2 shadow-xl backdrop-blur-sm transition-all duration-300 ${
        isActive
          ? 'border-pink-500 bg-gradient-to-br from-slate-800/98 via-slate-700/95 to-slate-800/90 shadow-pink-300/60'
          : isTrail
          ? 'border-pink-400 bg-gradient-to-br from-slate-800/95 via-slate-700/85 to-slate-800/75 shadow-pink-200/50'
          : 'border-pink-300 bg-gradient-to-br from-slate-800/90 to-slate-700/70 hover:border-pink-400 hover:shadow-lg'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-800 mb-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/img/agents/ankie4.png" alt="Ankie" className="object-cover" />
              <AvatarFallback className={`transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-pink-300 to-purple-300' 
                  : 'bg-gradient-to-r from-pink-200 to-purple-200'
              }`}>
                <LucideHeart className={`size-5 transition-colors duration-300 ${
                  isActive ? 'text-pink-800' : 'text-pink-700'
                }`} />
              </AvatarFallback>
            </Avatar>
            <span className={`transition-colors duration-300 ${
              isActive ? 'text-pink-200' : 'text-slate-200'
            }`}>{label}</span>
          </div>
          <div className="text-xs text-slate-300 mb-3">
            {isActive ? (
              <span className="flex items-center gap-2 text-pink-300 font-medium">
                <LucideBrain className="size-3 animate-pulse" />
                Analizando y delegando...
              </span>
            ) : isTrail ? (
              <span className="flex items-center gap-2 text-pink-400 font-medium">
                <LucideArrowRight className="size-3" />
                Delegación completada
              </span>
            ) : (
              'Supervisión emocional y coordinación de especialistas'
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Entrada</span>
            <LucideArrowRight className="size-3" />
            <span>Especialistas</span>
          </div>
          <Handle type="target" position={Position.Left} className="w-4 h-4 !bg-pink-500 !border-2 !border-white" />
          <Handle type="source" position={Position.Right} className="w-4 h-4 !bg-pink-500 !border-2 !border-white" />
        </CardContent>
      </Card>
    </div>
  )
}
