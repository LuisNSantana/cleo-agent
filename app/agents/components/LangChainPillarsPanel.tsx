'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layers, GitBranch, Workflow, Server, Activity } from 'lucide-react'

const pillars = [
  { key: 'chains', title: 'Chains', desc: 'Bloques para componer prompts, modelos y tools en flujos.', icon: Layers, color: 'text-blue-600' },
  { key: 'lcel', title: 'LCEL', desc: 'Capa declarativa para flujos lineales.', icon: Workflow, color: 'text-indigo-600' },
  { key: 'langgraph', title: 'LangGraph', desc: 'Workflows con estado, bucles y agentes.', icon: GitBranch, color: 'text-purple-600' },
  { key: 'langserve', title: 'LangServe', desc: 'Exponer cadenas como APIs.', icon: Server, color: 'text-emerald-600' },
  { key: 'langsmith', title: 'LangSmith', desc: 'Tracing, evals y monitoreo.', icon: Activity, color: 'text-amber-600' },
]

export function LangChainPillarsPanel() {
  return (
    <Card className="bg-white/95 w-80 shadow-lg border-2 border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pilares de LangChain</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pillars.map(({ key, title, desc, icon: Icon, color }) => (
          <div key={key} className="p-2 rounded border bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2">
              <Icon className={`size-4 ${color}`} />
              <div className="text-sm font-medium">{title}</div>
              <Badge variant="secondary" className="ml-auto text-[10px]">info</Badge>
            </div>
            <div className="text-xs text-gray-600 pl-6">{desc}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
