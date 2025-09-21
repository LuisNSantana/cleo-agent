import React from 'react'

interface RoleCardProps {
  title: string
  description: string
}

const roles: RoleCardProps[] = [
  { title: 'Supervisor', description: 'Routes tasks, decides delegation, aggregates final response.' },
  { title: 'Specialist', description: 'Domain‑focused (research, code, analysis, planning, data).' },
  { title: 'Worker', description: 'Executes atomic sub‑tasks (fetch, transform, extract).' },
  { title: 'Evaluator', description: 'Reviews quality, bias, structure & can request rewrites.' }
]

export function AgentRolesGrid() {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-muted/20 via-background to-background p-6">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-4">Core Roles</h4>
      <div className="grid md:grid-cols-4 gap-4 text-xs">
        {roles.map(r => (
          <div key={r.title} className="rounded-lg border bg-background/60 p-4">
            <p className="font-medium mb-1">{r.title}</p>
            <p className="text-muted-foreground">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
