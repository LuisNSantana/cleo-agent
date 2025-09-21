import React from 'react'

export function AgentCreationCriteria() {
  const criteria = [
    'Recurring task with distinct style or constraints',
    'Needs unique tool combo (e.g. Notion + Web + Python)',
    'Different temperature / risk tolerance required',
    'Output format radically different (JSON vs narrative)',
    'Separate audit / logging channel needed'
  ]
  return (
    <div className="rounded-lg border bg-background/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">When to Create a New Agent?</p>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        {criteria.map(c => <li key={c}>{c}</li>)}
      </ul>
    </div>
  )
}
