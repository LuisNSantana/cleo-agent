import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function PromptCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false), 1600) }}
      className="inline-flex items-center gap-1 rounded border bg-background/70 px-2 py-1 text-[10px] font-medium hover:bg-background transition"
      aria-label="Copy prompt"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
