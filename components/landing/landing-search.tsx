"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MagnifyingGlass, X } from "@phosphor-icons/react"
import { motion, AnimatePresence } from "framer-motion"

type SearchItem = {
  id: string // DOM id/hash to scroll to
  title: string
  type: "section" | "feature" | "agent"
}

export function LandingSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchItem[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Build an index from DOM elements that opt-in via data-landing-search
  const buildIndex = (): SearchItem[] => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-search]"))
    const items: SearchItem[] = nodes.map((el) => {
      const title = el.dataset.landingSearchTitle || el.innerText.trim()
      const type = (el.dataset.landingSearchType as SearchItem["type"]) || "section"
      // ensure element has an id to scroll to
      let id = el.id
      if (!id) {
        id = `${type}-${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`
        el.id = id
      }
      return { id, title, type }
    })
    // Add known anchors as sections if present
  const anchors = ["features", "agents", "demo", "builder", "benefits", "final", "get-started"]
    anchors.forEach((a) => {
      const node = document.getElementById(a)
      if (node) items.push({ id: a, title: a.charAt(0).toUpperCase() + a.slice(1), type: "section" })
    })
    // Deduplicate by id
    const map = new Map(items.map((i) => [i.id, i]))
    return Array.from(map.values())
  }

  const indexRef = useRef<SearchItem[]>([])

  useEffect(() => {
    indexRef.current = buildIndex()
  }, [])

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    const q = query.toLowerCase()
    const filtered = indexRef.current
      .filter((i) => i.title.toLowerCase().includes(q))
      .slice(0, 8)
    setResults(filtered)
  }, [query])

  const handleSelect = (item: SearchItem) => {
    setOpen(false)
    setQuery("")
    const target = document.getElementById(item.id)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      target.classList.add("ring-2", "ring-primary/40")
      setTimeout(() => target.classList.remove("ring-2", "ring-primary/40"), 1500)
    }
  }

  return (
    <div className="relative hidden md:block w-72">
      <div
        className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm shadow-sm focus-within:border-primary/50"
        onClick={() => {
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <MagnifyingGlass className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search features, agents, sections…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground/70"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && !!results.length && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-border/60 bg-popover shadow-xl"
          >
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.type}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
