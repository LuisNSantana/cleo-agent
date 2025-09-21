import React from 'react'

const commands = [
  ['List agents', 'GET /api/agents'],
  ['Recreate orchestrator', 'POST /api/agents/register?recreate=true'],
  ['Execute agent', 'POST /api/agents/execute { agentId, input }'],
  ['List tasks', 'GET /api/agent-tasks'],
  ['Check metrics', 'GET /api/agents/metrics'],
  ['Reset thread', 'POST /api/threads/reset { threadId }']
]

export function DiagnosticCommands() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">API Diagnostics</p>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        {commands.map(([label, cmd]) => <li key={label}><span className="font-medium text-foreground">{label}</span>: <code className="bg-background/70 px-1 py-0.5 rounded">{cmd}</code></li>)}
      </ul>
    </div>
  )
}
