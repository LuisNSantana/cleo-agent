import React from 'react'

export function AgentLifecycle() {
  const steps = [
    ['Registration', 'Agent definition stored; supervisor graph updated.'],
    ['Invocation', 'User or supervisor dispatches request.'],
    ['Reasoning / Tooling', 'Model generates intermediate thoughts & tool calls.'],
    ['Delegation (optional)', 'Supervisor re-routes if another agent is better suited.'],
    ['Evaluation (optional)', 'Evaluator reviews & refines.'],
    ['Finalization', 'Response aggregated and returned.']
  ]
  return (
    <div className="rounded-xl border p-6 bg-background/70">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">Lifecycle</h5>
      <ol className="list-decimal ml-5 space-y-2 text-xs">
        {steps.map(([title, desc]) => (
          <li key={title}><span className="font-medium">{title}</span>: {desc}</li>
        ))}
      </ol>
    </div>
  )
}
