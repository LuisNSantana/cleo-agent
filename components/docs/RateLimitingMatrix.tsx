import React from 'react'

const matrix = [
  ['web_fetch', '60 / 5m', 'Burst 5', 'Backoff exponential after 429'],
  ['python_runner', '20 / 10m', 'Serialized', 'Workspace CPU guard'],
  ['notion_write', '40 / 10m', 'Burst 3', 'Queue + retry jitter'],
  ['email_send', '100 / 1h', 'Burst 10', 'DMARC compliance + delay'],
  ['vector_search', '200 / 5m', 'Parallel', 'Cache layer w/ LRU']
]

export function RateLimitingMatrix() {
  return (
    <div className="rounded-lg border p-5 bg-gradient-to-br from-secondary/5 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-secondary">Rate Limits</p>
      <table className="w-full text-[10px]">
        <thead className="uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left py-2 px-2 font-medium">Tool</th>
            <th className="text-left py-2 px-2 font-medium">Quota</th>
            <th className="text-left py-2 px-2 font-medium">Burst</th>
            <th className="text-left py-2 px-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map(([tool, quota, burst, notes]) => (
            <tr key={tool} className="border-t border-muted/30">
              <td className="py-1.5 px-2 font-medium text-foreground">{tool}</td>
              <td className="py-1.5 px-2">{quota}</td>
              <td className="py-1.5 px-2">{burst}</td>
              <td className="py-1.5 px-2 text-muted-foreground">{notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
