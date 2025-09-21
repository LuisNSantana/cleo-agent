import React from 'react'

export function MultiAgentArchitecture() {
  return (
    <div className="rounded-xl border p-6 bg-gradient-to-br from-muted/20 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">Conceptual Flow</p>
      <pre className="text-[10px] leading-relaxed font-mono overflow-x-auto whitespace-pre">{`User Input
   ↓
[ Supervisor ] -- intent classification --> ( route )
   |   |  \
   |   |   -> direct answer (low complexity)
   |   |--> Specialist A (research)
   |   |--> Specialist B (analysis)
   |         ↓
   |      Worker agents (extraction, transform)
   |         ↓
   |<-- Aggregated partial outputs --
   |           ↓
   |--> Evaluator (quality/factuality/style)
   |           ↓ (approve / request revision)
Final Response --> User
`}</pre>
      <p className="mt-3 text-[11px] text-muted-foreground">Graph edges represent potential delegation; actual path chosen by heuristics (intent, tool availability, confidence, cost budget).</p>
    </div>
  )
}
