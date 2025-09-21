import React from 'react'

export function ToolApprovalFlow() {
  return (
    <div className="rounded-lg border p-5 bg-background/70">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Approval Workflow</p>
      <pre className="text-[10px] leading-relaxed font-mono overflow-x-auto whitespace-pre mb-2">{`Agent tool call → policy check
  | pass (auto) if scope ∈ allowed && risk < threshold
  | queue if scope=sensitive OR confidence < 0.75
Queue item → human approve/deny → audit log entry → continue/abort`}</pre>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        <li>Human queue stored with TTL; stale requests auto‑expire.</li>
        <li>UI shows diff / requested arguments for clarity.</li>
        <li>Denied calls propagate structured error to agent for graceful fallback.</li>
      </ul>
    </div>
  )
}
