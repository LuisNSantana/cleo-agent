import React from 'react'

const strategies = [
  ['Keyword + Tool Match', 'Map intent tokens to agents whose tool set intersects required capability.'],
  ['Confidence Threshold', 'If classifier confidence < τ → escalate to generalist or ask clarification.'],
  ['Cost-Aware Routing', 'Prefer cheapest capable agent unless complexity score > threshold.'],
  ['Adaptive Feedback', 'Evaluator signals misrouting; update routing weights incrementally.'],
  ['Composite Voting', 'Sample 2 light models for classification; use consensus or escalate.']
]

export function RoutingStrategies() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Routing Strategies</p>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        {strategies.map(([k,v]) => <li key={k}><span className="font-medium text-foreground">{k}</span>: {v}</li>)}
      </ul>
    </div>
  )
}
