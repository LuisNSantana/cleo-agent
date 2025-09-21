import React from 'react'

export function AgentConfigExamples() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border p-5 bg-muted/10">
        <h5 className="text-xs font-semibold tracking-wide mb-2 text-primary">Minimal Config</h5>
        <pre className="text-[11px] leading-relaxed font-mono overflow-x-auto">{`{
  "name": "Data Analyst",
  "role": "specialist",
  "model": "gpt-4o-mini",
  "temperature": 0.2,
  "tools": ["python_runner", "chart_builder"],
  "prompt": "Eres un analista de datos. Devuelve análisis concisos y verificables.",
  "memoryEnabled": false
}`}</pre>
      </div>
      <div className="rounded-lg border p-5 bg-muted/10">
        <h5 className="text-xs font-semibold tracking-wide mb-2 text-primary">Expanded Config</h5>
        <pre className="text-[11px] leading-relaxed font-mono overflow-x-auto">{`{
  "name": "Research Planner",
  "description": "Breaks down broad objectives into structured research tasks",
  "role": "specialist",
  "model": "claude-3-5-sonnet",
  "temperature": 0.4,
  "tools": ["web_search", "web_fetch", "notion_write"],
  "prompt": "Actúa como un planificador estratégico. Divide objetivos complejos en pasos claros priorizados.",
  "objective": "Transform vague goals into actionable research sequences",
  "customInstructions": "Always ask clarifying questions if scope is ambiguous.",
  "memoryEnabled": true,
  "memoryType": "short_term",
  "stopConditions": ["[FINAL]"],
  "toolSchemas": { "notion_write": { "properties": { "page": {"type": "string"} } } }
}`}</pre>
      </div>
    </div>
  )
}
