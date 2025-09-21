import React from 'react'

interface Tier {
  tier: string
  typicalModels: string
  latency: string
  cost: string
  idealFor: string
}

const tiers: Tier[] = [
  { tier: 'Ultra Fast', typicalModels: 'gpt-4o-mini, claude-haiku, mistral-small', latency: '50–250ms', cost: 'Low', idealFor: 'Routing, delegation heuristics, light classification' },
  { tier: 'Balanced', typicalModels: 'gpt-4o, claude-sonnet, gemini-1.5-pro', latency: '300–1200ms', cost: 'Medium', idealFor: 'General reasoning, planning, structured synthesis' },
  { tier: 'Heavy Reasoning', typicalModels: 'claude-opus, oatmega-70b (open)', latency: '1.5–4s', cost: 'High', idealFor: 'Complex multi-hop reasoning, deep evaluation passes' },
  { tier: 'Specialized', typicalModels: 'embedding-small, vision-model, audio-large', latency: 'Varies', cost: 'Variable', idealFor: 'Vector search, OCR, multimodal enrichment' }
]

export function ModelLatencyTiers() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wide">
          <tr>
            <th className="py-2 px-3 text-left font-medium">Tier</th>
            <th className="py-2 px-3 text-left font-medium">Models</th>
            <th className="py-2 px-3 text-left font-medium">Latency</th>
            <th className="py-2 px-3 text-left font-medium">Cost</th>
            <th className="py-2 px-3 text-left font-medium">Ideal For</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map(t => (
            <tr key={t.tier} className="border-t border-muted/30">
              <td className="py-2 px-3 font-medium text-foreground">{t.tier}</td>
              <td className="py-2 px-3 whitespace-pre-line">{t.typicalModels}</td>
              <td className="py-2 px-3">{t.latency}</td>
              <td className="py-2 px-3">{t.cost}</td>
              <td className="py-2 px-3 text-muted-foreground">{t.idealFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
