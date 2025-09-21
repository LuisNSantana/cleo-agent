import React from 'react'

const patterns = [
  ['Evaluator Gate', 'Evaluator must approve if risk score > R or novelty flag set.'],
  ['Dual Response Compare', 'Two specialists produce outputs → evaluator chooses or merges.'],
  ['Progressive Refinement', 'Draft → critique → improved draft (limit N cycles).'],
  ['Conflict Resolution', 'If contradictory claims → request sources or escalate to higher tier model.'],
  ['Time Budget Abort', 'If cumulative execution time > SLA threshold → degrade gracefully.']
]

export function ArbitrationPatterns() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-secondary/5 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-secondary">Arbitration Patterns</p>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        {patterns.map(([k,v]) => <li key={k}><span className="font-medium text-foreground">{k}</span>: {v}</li>)}
      </ul>
    </div>
  )
}
