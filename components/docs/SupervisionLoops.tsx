import React from 'react'

const loops = [
  ['Light Supervision', 'Supervisor only delegates & aggregates; no evaluator unless uncertainty flagged.'],
  ['Inline Evaluation', 'Evaluator reviews each intermediate artifact before next stage.'],
  ['Periodic Audit', 'Every N tasks, sample outputs for deeper factual QA.'],
  ['Escalation Ladder', 'Uncertain → evaluator → heavy model → human (optional).'],
  ['Self-Critique Injection', 'Agent produces THOUGHT + CRITIQUE internally before FINAL output.']
]

export function SupervisionLoops() {
  return (
    <div className="rounded-lg border p-5 bg-background/70">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2">Supervision Loops</p>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        {loops.map(([k,v]) => <li key={k}><span className="font-medium text-foreground">{k}</span>: {v}</li>)}
      </ul>
    </div>
  )
}
