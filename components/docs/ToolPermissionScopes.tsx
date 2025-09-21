import React from 'react'

const scopes = [
  ['read', 'Non‑destructive retrieval (fetch, search, list)'],
  ['write', 'Create or modify content (notion_write, file_save)'],
  ['execute', 'Run code or transformations (python_runner, script_exec)'],
  ['network', 'Outbound web requests (web_fetch, api_call)'],
  ['sensitive', 'Access to PII / internal systems; requires explicit approval']
]

export function ToolPermissionScopes() {
  return (
    <div className="rounded-xl border p-6 bg-gradient-to-br from-muted/20 to-background">
      <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-primary">Permission Scopes</p>
      <table className="w-full text-[11px]">
        <thead className="text-[10px] uppercase text-muted-foreground tracking-wide">
          <tr>
            <th className="text-left py-2 px-2 font-medium">Scope</th>
            <th className="text-left py-2 px-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {scopes.map(([scope, desc]) => (
            <tr key={scope} className="border-t border-muted/30">
              <td className="py-2 px-2 font-medium text-foreground">{scope}</td>
              <td className="py-2 px-2 text-muted-foreground">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
