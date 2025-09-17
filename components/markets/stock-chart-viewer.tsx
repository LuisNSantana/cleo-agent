"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type ChartCandidate = {
  title: string
  link: string
  snippet?: string
  domain?: string
  thumbnail?: string
}

export type StockChartViewerProps = {
  symbol: string
  period?: "1d" | "5d" | "1m" | "3m" | "6m" | "ytd" | "1y" | "5y" | "max"
  timeframe?: "intraday" | "daily" | "weekly"
  finance_summary?: { price?: number | string | null; currency?: string | null; as_of?: string | null }
  volatility_proxy?: number | null
  chart_candidates?: ChartCandidate[]
  className?: string
}

// Map our period to TradingView range if available
function mapPeriodToRange(period?: StockChartViewerProps["period"]) {
  switch (period) {
    case "1d":
      return "1D"
    case "5d":
      return "5D"
    case "1m":
      return "1M"
    case "3m":
      return "3M"
    case "6m":
      return "6M"
    case "ytd":
      return "YTD"
    case "1y":
      return "12M"
    case "5y":
      return "60M"
    case "max":
      return "ALL"
    default:
      return "12M"
  }
}

// Lightweight wrapper to load TradingView tv.js once
function useTradingViewScript(enabled: boolean) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return
    if ((window as any).TradingView) {
      setLoaded(true)
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]'
    )
    if (existing) {
      existing.addEventListener("load", () => setLoaded(true), { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => setLoaded(true)
    document.body.appendChild(script)
    return () => {
      script.onload = null
    }
  }, [enabled])
  return loaded
}

export function StockChartViewer({
  symbol,
  period = "1m",
  timeframe = "daily",
  finance_summary,
  volatility_proxy,
  chart_candidates = [],
  className,
}: StockChartViewerProps) {
  const containerId = useId().replace(/:/g, "_")
  const ENABLE_TV = process.env.NEXT_PUBLIC_ENABLE_TRADINGVIEW !== 'false'
  const tvLoaded = useTradingViewScript(ENABLE_TV)
  const [exchange, setExchange] = useState<"AUTO" | "NASDAQ" | "NYSE">("AUTO")
  const mountedRef = useRef(false)

  const widgetSymbol = useMemo(() => {
    if (exchange === "AUTO") return symbol
    return `${exchange}:${symbol}`
  }, [exchange, symbol])

  const range = useMemo(() => mapPeriodToRange(period), [period])

  // Load saved exchange preference per symbol
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`stock_exchange_pref:${symbol}`)
      if (saved === 'NASDAQ' || saved === 'NYSE' || saved === 'AUTO') {
        setExchange(saved)
      }
    } catch {}
  }, [symbol])

  // Persist exchange preference
  useEffect(() => {
    try {
      localStorage.setItem(`stock_exchange_pref:${symbol}`,(exchange as string))
    } catch {}
  }, [symbol, exchange])

  useEffect(() => {
    if (!ENABLE_TV || !tvLoaded) return
    if (typeof window === "undefined") return
    const TV = (window as any).TradingView
    if (!TV?.widget) return

    // Clean previous widget by resetting container
    const root = document.getElementById(containerId)
    if (!root) return
    root.innerHTML = ""

    // Instantiate TradingView widget
    try {
      new TV.widget({
        autosize: true,
        symbol: widgetSymbol,
        interval: timeframe === "intraday" ? "60" : timeframe === "weekly" ? "W" : "D",
        range: range,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        container_id: containerId,
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        allow_symbol_change: false,
      })
      mountedRef.current = true
    } catch (e) {
      // silently ignore; fallback UI will be shown below
      mountedRef.current = false
    }
  }, [tvLoaded, containerId, widgetSymbol, range, timeframe])

  const volPct = useMemo(() => {
    if (typeof volatility_proxy === "number")
      return `${(volatility_proxy * 100).toFixed(2)}%`
    return "–"
  }, [volatility_proxy])

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">{symbol}</div>
          {finance_summary?.price != null && (
            <div className="text-muted-foreground text-sm">
              {String(finance_summary.price)} {finance_summary.currency || ""}
            </div>
          )}
          {finance_summary?.as_of && (
            <div className="text-muted-foreground text-xs">as of {finance_summary.as_of}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Exchange</label>
          <select
            className="bg-secondary text-foreground rounded px-2 py-1 text-xs"
            value={exchange}
            onChange={(e) => setExchange(e.target.value as any)}
          >
            <option value="AUTO">AUTO</option>
            <option value="NASDAQ">NASDAQ</option>
            <option value="NYSE">NYSE</option>
          </select>
        </div>
      </div>

      {/* Primary: TradingView widget container */}
      <div className="relative w-full overflow-hidden rounded border" style={{ minHeight: 360 }}>
        {ENABLE_TV ? (
          <>
            <div id={containerId} className="h-[360px] w-full" />
            {!tvLoaded && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Loading chart widget…
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted-foreground">
            TradingView is disabled (NEXT_PUBLIC_ENABLE_TRADINGVIEW=false). Use the quick links below to open charts on Yahoo/Google Finance.
          </div>
        )}
      </div>

      {/* Volatility + Fallback candidates */}
      <div className="grid gap-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Volatility (proxy)</div>
            <div className="text-lg font-semibold">{volPct}</div>
            <div className="text-xs text-muted-foreground">Quick estimate based on intraday high/low/open</div>
          </CardContent>
        </Card>
        {chart_candidates?.slice(0, 2).map((c, i) => {
          let host = c.domain
          if (!host) {
            try { host = new URL(c.link).hostname } catch { host = undefined }
          }
          return (
          <a key={i} href={c.link} target="_blank" rel="noreferrer" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardContent className="flex items-center gap-3 p-3">
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="h-12 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="bg-secondary h-12 w-20 rounded" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-muted-foreground truncate text-xs">{host || c.link}</div>
                </div>
              </CardContent>
            </Card>
          </a>
          )
        })}
      </div>
    </div>
  )
}

export default StockChartViewer
