'use client'

import React from 'react'
import { NodeProps, Handle, Position } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowRight, Brain } from 'lucide-react'

type StateNodeData = {
  label: string
  sublabel?: string
  tone?: 'info' | 'warning' | 'success'
}

const toneStyles: Record<string, string> = {
  info: 'border-blue-300 bg-blue-50/80',
  warning: 'border-amber-300 bg-amber-50/80',
  success: 'border-emerald-300 bg-emerald-50/80',
}

export default function StateNode({ data }: NodeProps<StateNodeData>) {
  const { label, sublabel, tone = 'info' } = data
  const Icon = label.toLowerCase().includes('deleg') ? ArrowRight : Brain
  const isLoading = label.toLowerCase().includes('evalu')

  return (
    <Card className={`w-72 shadow-lg border-2 ${toneStyles[tone]}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
          {isLoading ? (
            <Loader2 className="size-4 text-blue-600 animate-spin" />
          ) : (
            <Icon className="size-4 text-gray-600" />
          )}
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-gray-600">{sublabel}</div>
        )}
        <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
        <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />
      </CardContent>
    </Card>
  )
}
