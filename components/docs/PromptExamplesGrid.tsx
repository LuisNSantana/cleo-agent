import React, { useMemo } from 'react'
import { PromptCard, PromptExample } from './PromptCard'

export function PromptExamplesGrid() {
  const examples: PromptExample[] = useMemo(() => ([
    {
      category: 'System',
      title: 'Structured Research Synthesizer',
      description: 'Reliable multi-source synthesis with explicit output schema.',
      modelHint: 'claude-sonnet / gpt-4o-mini',
      prompt: `You are a senior research synthesis agent.
Goal: Produce a concise, unbiased summary.
Rules:
- Validate each claim with at least 2 sources.
- If contradiction exists, surface it explicitly.
- Output strict JSON with keys: summary, key_points[], risks[], sources[].
- Do NOT hallucinate.
Return only JSON.
`,
      notes: 'Great for evaluator + specialist pairing'
    },
    {
      category: 'Role',
      title: 'Planner Decomposition',
      description: 'Break down vague objective into prioritized task plan.',
      modelHint: 'gpt-4o-mini / claude-haiku',
      prompt: `You are a strategic planning agent.
Input: A vague objective.
Transform into: { objective, clarifying_questions[], tasks[ {id, title, rationale, dependencies[]} ], risks[], success_criteria[] }
Always ask questions first if scope ambiguous.
Return JSON only.
`,
      notes: 'Feed tasks into worker agents'
    },
    {
      category: 'Chain-of-Thought',
      title: 'Constrained Reasoning Steps',
      description: 'Encourages explicit internal reasoning with bounded length.',
      modelHint: 'gpt-4o-mini (temperature 0.3)',
      prompt: `You will solve the problem using structured reasoning.
Format:
THOUGHT[1]: ...
THOUGHT[2]: ...
FINAL: <answer>
Keep each THOUGHT under 25 tokens. If uncertain, state assumptions.
`,
      notes: 'Pairs well with evaluator agent'
    },
    {
      category: 'Extraction',
      title: 'Robust Field Extraction',
      description: 'Turns messy text into typed structured record.',
      modelHint: 'claude-haiku / gpt-4o-mini',
      prompt: `Extract fields from input text.
Output strictly JSON: { company: string|null, country: string|null, employees: number|null, funding_stage: enum[seed,series_a,series_b,growth]|null }
If missing set null. Never guess.
Return ONLY JSON.
`,
      notes: 'Use temperature 0–0.2'
    },
    {
      category: 'Delegation',
      title: 'Supervisor Delegation Pattern',
      description: 'Supervisor decides whether to route to research or analysis agent.',
      modelHint: 'gpt-4o / claude-sonnet',
      prompt: `You are SUPERVISOR.
Agents: research_agent (web_search, web_fetch), analysis_agent (python_runner, chart_builder)
User query: <INSERT>
Evaluate intent:
IF requires external info -> delegate:research_agent with objective
ELSE IF numeric / data transformation -> delegate:analysis_agent
ELSE respond directly.
Return JSON: { mode: direct|delegate, target_agent?: string, rationale: string, objective?: string }
`,
      notes: 'Use inside orchestration layer'
    },
    {
      category: 'Evaluation',
      title: 'Quality & Fact Reviewer',
      description: 'Evaluator that flags factual uncertainty and style issues.',
      modelHint: 'claude-sonnet / gpt-4o-mini',
      prompt: `You are an evaluator.
Input: draft_response + original_request.
Tasks:
1. Score factuality (0-1)
2. List potential hallucinations (if any)
3. Suggest style improvements
4. If rewrite needed, provide improved_response.
Return JSON: { factuality: number, hallucinations: string[], improvements: string[], improved_response?: string }
`,
      notes: 'Trigger on low confidence'
    }
  ]), [])

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {examples.map(ex => <PromptCard key={ex.title} ex={ex} />)}
    </div>
  )
}
