import React from 'react'

const risks = [
  ['Low', 'read', 'Public info retrieval, static asset fetch'],
  ['Medium', 'write|execute', 'Content mutation, code run with sandbox'],
  ['High', 'network|sensitive', 'External exfiltration vectors, PII read'],
  ['Critical', 'sensitive + execute', 'Potential lateral movement or data leakage']
]

export function RiskClassificationMatrix() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-destructive/5 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-destructive">Risk Classification</p>
      <table className="w-full text-[10px]">
        <thead className="uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left py-1.5 px-2 font-medium">Level</th>
            <th className="text-left py-1.5 px-2 font-medium">Scopes</th>
            <th className="text-left py-1.5 px-2 font-medium">Examples</th>
          </tr>
        </thead>
        <tbody>
          {risks.map(([level, scopes, examples]) => (
            <tr key={level} className="border-t border-muted/30">
              <td className="py-1.5 px-2 font-medium text-foreground">{level}</td>
              <td className="py-1.5 px-2">{scopes}</td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-pre-line">{examples}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
