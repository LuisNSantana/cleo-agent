import React from 'react'

const heuristics = [
  ['Extraction (strict JSON)', 'Small deterministic (gpt-4o-mini) → escalate only on parse failure'],
  ['Multi-hop reasoning', 'Start Balanced (gpt-4o / sonnet), escalate to opus only if reasoning depth score < threshold'],
  ['Cost sensitive batch tasks', 'Use open smaller models + caching + batch API'],
  ['Delegation routing', 'Ultra Fast tier for low latency control loop'],
  ['Evaluation / Fact QA', 'Balanced model at low temperature (0–0.3) for consistency'],
  ['Creative ideation', 'Increase temperature 0.7–0.9 on Balanced tier before using Heavy']
]

export function ModelSelectionHeuristics() {
  return (
    <div className="rounded-lg border bg-background/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-primary">Selection Heuristics</p>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        {heuristics.map(([k,v]) => (
          <li key={k}><span className="font-medium text-foreground">{k}:</span> {v}</li>
        ))}
      </ul>
    </div>
  )
}
