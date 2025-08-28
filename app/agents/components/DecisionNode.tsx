'use client'

import React from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { LucideRoute, LucideGitFork, Loader2 } from 'lucide-react'

type DecisionNodeData = {
  label?: string
  hint?: string
}

/**
 * DecisionNode
 * Visual node shown when the supervisor is deciding/delegating.
 * Adds a pulsing glow and a small fork icon to emphasize routing.
 */
export default function DecisionNode({ data }: NodeProps<DecisionNodeData>) {
  const { label = 'Toma de decisión', hint } = data || {}
  return (
    <div className="relative">
      {/* pulsing ring effect */}
      <div className="absolute -inset-2 rounded-xl bg-emerald-400/30 blur-md animate-pulse" />
      <Card className="w-72 border-2 border-emerald-300 bg-emerald-50/80 shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
            <LucideGitFork className="size-4 text-emerald-700" />
            {label}
          </div>
          {hint ? (
            <div className="text-xs text-gray-700 line-clamp-3">
              {hint}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="size-3 text-emerald-700 animate-spin" />
              Evaluando a qué subagente delegar…
            </div>
          )}
          <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-emerald-500" />
          <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-emerald-500" />
        </CardContent>
      </Card>
    </div>
  )
}
