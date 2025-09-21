import React from 'react'

const taxonomy = [
  ['routing.miss', 'Supervisor selected suboptimal agent; adjust thresholds'],
  ['delegation.timeout', 'Worker exceeded execution window; raise timeout or optimize task'],
  ['tool.rate_limited', '429 from provider; apply backoff + queue'],
  ['model.hallucination', 'Low factual confidence; trigger evaluator rewrite'],
  ['parse.failure', 'JSON invalid; enforce schema & retry with lower temp'],
  ['memory.overflow', 'Too many tokens; compress older context'],
  ['cost.guardrail', 'Budget exceeded; degrade to fast tier + reduce depth']
]

export function ErrorTaxonomy() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-secondary/5 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-secondary">Error Taxonomy</p>
      <table className="w-full text-[10px] mb-2">
        <thead className="uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left py-1.5 px-2 font-medium">Code</th>
            <th className="text-left py-1.5 px-2 font-medium">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {taxonomy.map(([code, meaning]) => (
            <tr key={code} className="border-t border-muted/30">
              <td className="py-1.5 px-2 font-medium text-foreground">{code}</td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-pre-line">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground">Error codes are structured to allow automated remediation triggers.</p>
    </div>
  )
}
