'use client'

import React from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { LucideSparkles, LucideMessageSquare, LucideCheckCircle } from 'lucide-react'

type FinalizeNodeData = {
  label?: string
  status?: 'active' | 'idle' | 'trail'
}

/**
 * FinalizeNode
 * Visual node showing when Cleo is finalizing the response.
 * Represents the final step before sending to the user.
 */
export default function FinalizeNode({ data }: NodeProps<FinalizeNodeData>) {
  const { label = 'Cleo Finalizado', status = 'idle' } = data || {}
  const isActive = status === 'active'
  const isTrail = status === 'trail'

  return (
    <div className="relative">
      {/* Enhanced pulsing ring effect when active */}
      {isActive && (
        <>
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-emerald-400/40 via-teal-400/40 to-cyan-400/40 blur-lg animate-pulse" />
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-300/60 to-teal-300/60 blur-md animate-ping" />
        </>
      )}
      {/* Trail effect - glowing border without pulsing */}
      {isTrail && (
        <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-emerald-300/30 via-teal-300/30 to-cyan-300/30 blur-sm" />
      )}
      <Card className={`w-80 border-3 shadow-2xl backdrop-blur-sm ${
        isActive
          ? 'border-emerald-400 bg-gradient-to-br from-emerald-50/90 via-teal-50/90 to-cyan-50/90'
          : isTrail
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-teal-50/70 to-cyan-50/70'
          : 'border-emerald-200 bg-gradient-to-br from-emerald-25/50 to-teal-25/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-base font-bold text-gray-800 mb-2">
            <div className={`p-2 rounded-full ${isActive ? 'bg-emerald-200' : 'bg-emerald-100'}`}>
              <LucideSparkles className={`size-5 ${isActive ? 'text-emerald-700' : 'text-emerald-600'}`} />
            </div>
            <span className={isActive ? 'text-emerald-800' : 'text-gray-700'}>{label}</span>
          </div>
          <div className="text-sm text-gray-600 mb-3">
            {isActive ? (
              <span className="flex items-center gap-2 text-emerald-700 font-medium">
                <LucideMessageSquare className="size-4 animate-pulse" />
                Preparando respuesta final...
              </span>
            ) : isTrail ? (
              <span className="flex items-center gap-2 text-emerald-600 font-medium">
                <LucideCheckCircle className="size-4" />
                Respuesta completada
              </span>
            ) : (
              'Síntesis emocional y respuesta al usuario'
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Equipo</span>
            <LucideCheckCircle className="size-3" />
            <span>Usuario</span>
          </div>
          <Handle type="target" position={Position.Left} className="w-4 h-4 !bg-emerald-500 !border-2 !border-white" />
          <Handle type="source" position={Position.Right} className="w-4 h-4 !bg-emerald-500 !border-2 !border-white" />
        </CardContent>
      </Card>
    </div>
  )
}
