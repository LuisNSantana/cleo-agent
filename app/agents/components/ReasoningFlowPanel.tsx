'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Brain, CheckCircle2, Eye } from 'lucide-react'
import { useRealTimeExecution } from '@/lib/agents/use-realtime-execution'

export function ReasoningFlowPanel() {
  const { executionSteps } = useRealTimeExecution()

  if (executionSteps.length === 0) return null

  return (
    <Card className="bg-white/95 w-[420px] shadow-lg border-2 border-indigo-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Flujo de Razonamiento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          {executionSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="p-2 rounded border bg-gray-50 min-w-36">
                <div className="text-[10px] text-gray-500">{step.agent}</div>
                <div className="text-xs font-medium">
                  {step.action === 'analyzing' && 'Analizando'}
                  {step.action === 'thinking' && 'Pensando'}
                  {step.action === 'delegating' && 'Delegando'}
                  {step.action === 'responding' && 'Respondiendo'}
                  {step.action === 'completing' && 'Completando'}
                </div>
                <div className="text-xs text-gray-600 max-w-[160px] truncate">{step.content}</div>
              </div>
              {idx < executionSteps.length - 1 && (
                <ArrowRight className="size-4 text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
