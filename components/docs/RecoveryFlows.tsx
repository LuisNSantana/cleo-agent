import React from 'react'

const flows = [
  ['Routing Broken', ['Enable debug routing logs', 'Lower confidence threshold 0.85 → 0.7', 'Add explicit keyword mapping', 'Rebuild orchestrator']],
  ['Escalation Loop', ['Set max refinement cycles = 2', 'Add token guard', 'Log evaluator triggers', 'Fallback to balanced tier']],
  ['High Latency', ['Activate streaming', 'Switch to fast tier', 'Enable partial synthesis', 'Batch similar requests']],
  ['JSON Failures', ['Wrap schema in fenced block', 'Remove narrative instructions', 'Lower temperature', 'Add validator + retry']],
  ['Tool Flood', ['Apply per-agent rate limiter', 'Throttle high-frequency tool', 'Introduce queue + jitter', 'Alert on anomaly']],
  ['Memory Drift', ['Shorten conversation window', 'Enable summarizer', 'Disable long_term memory temporarily', 'Reset thread context']]
]

export function RecoveryFlows() {
  return (
    <div className="rounded-lg border p-5 bg-background/70">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2">Recovery Playbooks</p>
      <div className="grid gap-4 md:grid-cols-2">
        {flows.map(([title, steps]) => (
          <div key={title as string} className="rounded border bg-background/60 p-3">
            <p className="text-[11px] font-semibold text-primary mb-1">{title}</p>
            <ol className="list-decimal ml-4 text-[10px] space-y-0.5 text-muted-foreground">
              {(steps as string[]).map(s => <li key={s}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
