import React from 'react'

export function ModelFallbackCascade() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-muted/20 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">Fallback Cascade Pattern</p>
      <pre className="text-[11px] leading-relaxed font-mono overflow-x-auto bg-background/70 border rounded p-3 whitespace-pre">{`// Pseudocode
async function smartInvoke(task) {
  // Tier 1: fast attempt
  const fast = await callModel('gpt-4o-mini', task, { timeout: 1800 })
  if(fast.parsed && fast.confidence >= 0.82) return fast

  // Tier 2: balanced refinement
  const balanced = await callModel('gpt-4o', enhance(fast, task), { temperature: 0.4 })
  if(balanced.confidence >= 0.9) return balanced

  // Tier 3: heavy reasoning escalation
  return await callModel('claude-opus', enrichWithCritique(balanced, task), { maxTokens: 1200 })
}`}</pre>
      <ul className="mt-3 text-[11px] space-y-1 text-muted-foreground">
        <li>Escalate only when parse fails or confidence &lt; threshold.</li>
        <li>Propagate critique context instead of raw hallucinated text.</li>
        <li>Track token + cost metrics per tier for optimization.</li>
      </ul>
    </div>
  )
}
