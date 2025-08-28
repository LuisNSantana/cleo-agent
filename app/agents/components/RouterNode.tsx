'use client'

import React from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { LucideBrain, LucideArrowRight, LucideHeart } from 'lucide-react'

type RouterNodeData = {
  label?: string
  status?: 'active' | 'idle' | 'trail'
}

/**
 * RouterNode
 * Visual node showing Cleo's routing decision point.
 * Shows when the supervisor is evaluating which specialist to delegate to.
 */
export default function RouterNode({ data }: NodeProps<RouterNodeData>) {
  const { label = 'Cleo Supervisor', status = 'idle' } = data || {}
  const isActive = status === 'active'
  const isTrail = status === 'trail'

  return (
    <div className="relative">
      {/* Enhanced pulsing ring effect when active */}
      {isActive && (
        <>
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-pink-400/40 via-purple-400/40 to-blue-400/40 blur-lg animate-pulse" />
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-pink-300/60 to-purple-300/60 blur-md animate-ping" />
        </>
      )}
      {/* Trail effect - glowing border without pulsing */}
      {isTrail && (
        <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-pink-300/30 via-purple-300/30 to-blue-300/30 blur-sm" />
      )}
      <Card className={`w-56 border-2 shadow-lg backdrop-blur-sm ${
        isActive
          ? 'border-pink-400 bg-gradient-to-br from-pink-50/90 via-purple-50/90 to-blue-50/90'
          : isTrail
          ? 'border-pink-300 bg-gradient-to-br from-pink-50/70 via-purple-50/70 to-blue-50/70'
          : 'border-pink-200 bg-gradient-to-br from-pink-25/50 to-purple-25/50'
      }`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-1">
            <div className={`p-1.5 rounded-full ${isActive ? 'bg-pink-200' : 'bg-pink-100'}`}>
              <LucideHeart className={`size-4 ${isActive ? 'text-pink-700' : 'text-pink-600'}`} />
            </div>
            <span className={isActive ? 'text-pink-800' : 'text-gray-700'}>{label}</span>
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {isActive ? (
              <span className="flex items-center gap-1 text-pink-700 font-medium">
                <LucideBrain className="size-3 animate-pulse" />
                Analizando y delegando...
              </span>
            ) : isTrail ? (
              <span className="flex items-center gap-1 text-pink-600 font-medium">
                <LucideArrowRight className="size-3" />
                USADO
              </span>
            ) : (
              'Evaluación emocional y coordinación de equipo'
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
