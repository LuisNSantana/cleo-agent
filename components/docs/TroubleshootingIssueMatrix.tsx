import React from 'react'

interface Row { area: string; symptom: string; likely: string; action: string }
const rows: Row[] = [
  { area: 'Connection', symptom: 'Intermittent 504 / timeouts', likely: 'Model provider latency spike', action: 'Failover to secondary key; check status page' },
  { area: 'Agents', symptom: 'Delegation never triggers', likely: 'Routing heuristics confidence too strict', action: 'Lower threshold or add domain keywords' },
  { area: 'Tools', symptom: 'Frequent 429 on web_fetch', likely: 'Rate limit exceeded', action: 'Introduce jitter & batch queries' },
  { area: 'Memory', symptom: 'Context truncation early', likely: 'Max tokens too low', action: 'Increase maxTokens or enable streaming summarizer' },
  { area: 'Costs', symptom: 'Token usage spikes suddenly', likely: 'Escalation loop / evaluator recursion', action: 'Cap refinement cycles; add safeguard counter' },
  { area: 'Output', symptom: 'Invalid JSON parse', likely: 'Temperature too high or missing schema framing', action: 'Add explicit JSON schema + reduce temperature' }
]

export function TroubleshootingIssueMatrix() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left py-2 px-2 font-medium">Area</th>
            <th className="text-left py-2 px-2 font-medium">Symptom</th>
            <th className="text-left py-2 px-2 font-medium">Likely Cause</th>
            <th className="text-left py-2 px-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.area + r.symptom} className="border-t border-muted/30">
              <td className="py-1.5 px-2 font-medium text-foreground">{r.area}</td>
              <td className="py-1.5 px-2">{r.symptom}</td>
              <td className="py-1.5 px-2 text-muted-foreground">{r.likely}</td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-pre-line">{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
