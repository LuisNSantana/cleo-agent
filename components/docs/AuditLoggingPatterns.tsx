import React from 'react'

const items = [
  ['Tool Call Start', 'timestamp, agentId, tool, argsHash, scope'],
  ['Tool Call End', 'duration, success, errorType, tokensUsed'],
  ['Escalation', 'previousTool, rationale, newScope'],
  ['Approval Decision', 'approverId, decision, latency, justification'],
  ['Anomaly Flag', 'patternType, severity, correlationId']
]

export function AuditLoggingPatterns() {
  return (
    <div className="rounded-lg border p-5 bg-background/70">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2">Audit Log Schema</p>
      <table className="w-full text-[10px] mb-3">
        <thead className="uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left py-1.5 px-2 font-medium">Event</th>
            <th className="text-left py-1.5 px-2 font-medium">Fields</th>
          </tr>
        </thead>
        <tbody>
          {items.map(([ev, fields]) => (
            <tr key={ev} className="border-t border-muted/30">
              <td className="py-1.5 px-2 font-medium text-foreground">{ev}</td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-pre-line">{fields}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="text-[11px] space-y-1 text-muted-foreground">
        <li>All entries carry a correlationId for tracing cross-agent flows.</li>
        <li>High severity anomalies trigger webhook + optional Slack alert.</li>
        <li>Logs are immutable append-only; retention tiered (hot → warm → archive).</li>
      </ul>
    </div>
  )
}
