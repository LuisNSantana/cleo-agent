import React, { useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PromptCopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    
    // Visual feedback: confetti-like effect
    const button = document.activeElement as HTMLButtonElement
    if (button) {
      for (let i = 0; i < 6; i++) {
        const spark = document.createElement('div')
        spark.className = 'absolute w-1 h-1 bg-brand-violet rounded-full pointer-events-none'
        spark.style.left = '50%'
        spark.style.top = '50%'
        spark.style.animation = `sparkle-${i} 0.6s ease-out forwards`
        button.parentElement?.appendChild(spark)
        setTimeout(() => spark.remove(), 600)
      }
    }
    
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <>
      <style jsx global>{`
        @keyframes sparkle-0 {
          to { transform: translate(-12px, -12px); opacity: 0; }
        }
        @keyframes sparkle-1 {
          to { transform: translate(12px, -12px); opacity: 0; }
        }
        @keyframes sparkle-2 {
          to { transform: translate(-12px, 12px); opacity: 0; }
        }
        @keyframes sparkle-3 {
          to { transform: translate(12px, 12px); opacity: 0; }
        }
        @keyframes sparkle-4 {
          to { transform: translate(0, -16px); opacity: 0; }
        }
        @keyframes sparkle-5 {
          to { transform: translate(0, 16px); opacity: 0; }
        }
      `}</style>
      <button
        onClick={handleCopy}
        className={cn(
          "relative inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all",
          copied 
            ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" 
            : "bg-background/70 border-border hover:bg-background hover:border-brand-violet/30",
          className
        )}
        aria-label="Copy prompt"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 animate-in zoom-in duration-200" />
            <span className="animate-in slide-in-from-left duration-200">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </button>
    </>
  )
}
