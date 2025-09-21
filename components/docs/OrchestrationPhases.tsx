import React from 'react'

const phases = [
  ['Intake', 'Normalize user input; detect language; strip PII if required.'],
  ['Intent Classification', 'Light fast model or rules to map to domain + complexity level.'],
  ['Routing Decision', 'Select direct response vs delegation; choose specialist set.'],
  ['Task Decomposition', 'Optional planner expansion into structured sub‑tasks.'],
  ['Execution', 'Specialists + workers perform reasoning + tool calls.'],
  ['Synthesis', 'Combine multi‑agent outputs (order, conflict resolution).'],
  ['Evaluation', 'Quality, factuality, coherence, style normalization.'],
  ['Finalization', 'Formatting, safe content filters, response packaging.']
]

export function OrchestrationPhases() {
  return (
    <div className="rounded-lg border p-5 bg-background/70">
      <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-primary">Orchestration Phases</p>
      <ol className="ml-5 list-decimal space-y-1 text-[11px] text-muted-foreground">
        {phases.map(([p,d]) => <li key={p}><span className="font-medium text-foreground">{p}</span>: {d}</li> )}
      </ol>
    </div>
  )
}
