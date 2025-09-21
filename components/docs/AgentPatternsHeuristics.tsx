import React from 'react'

export function AgentPatternsHeuristics() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-lg border p-4 bg-gradient-to-br from-primary/5 to-background">
        <p className="mb-1 text-xs font-semibold tracking-wide text-primary">Specialization Patterns</p>
        <ul className="text-[11px] space-y-1 text-muted-foreground">
          <li><strong>Splitter</strong>: Breaks tasks → sub-prompts (planner)</li>
          <li><strong>Researcher</strong>: Multi-source synthesis + credibility scoring</li>
          <li><strong>Extractor</strong>: Structured JSON output from messy text</li>
          <li><strong>Synthesizer</strong>: Combines multi-agent outputs</li>
          <li><strong>Reviewer</strong>: Style, tone & factual QA</li>
        </ul>
      </div>
      <div className="rounded-lg border p-4 bg-gradient-to-br from-secondary/5 to-background">
        <p className="mb-1 text-xs font-semibold tracking-wide text-secondary">Delegation Heuristics</p>
        <ul className="text-[11px] space-y-1 text-muted-foreground">
          <li>Detect domain keywords ("analyze", "plan", "buscar")</li>
          <li>Check tool availability match</li>
          <li>Fallback to generalist if confidence &lt; threshold</li>
          <li>Escalate to evaluator on low coherence</li>
          <li>Stop chain if cost/time limit exceeded</li>
        </ul>
      </div>
      <div className="rounded-lg border p-4 bg-gradient-to-br from-muted/40 to-background">
        <p className="mb-1 text-xs font-semibold tracking-wide">Best Practices</p>
        <ul className="text-[11px] space-y-1 text-muted-foreground">
          <li>One primary objective per agent</li>
          <li>2–5 tools max; avoid overloading</li>
          <li>Lower temperature for evaluators (0–0.2)</li>
          <li>Use explicit stop tokens in multi-step outputs</li>
          <li>Tag agents (e.g. <code className="bg-muted px-1 py-0.5 rounded">research</code>)</li>
        </ul>
      </div>
    </div>
  )
}
