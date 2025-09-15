"use client"

import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Lightweight SVG chart primitives to avoid heavy deps

// Accessible, colorblind-friendly palette (9 colors)
export const CHART_PALETTE: string[] = [
  '#4f46e5', // indigo-600
  '#06b6d4', // cyan-500
  '#22c55e', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#a78bfa', // violet-400
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#60a5fa', // blue-400
]

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  className?: string
  showDots?: boolean
  color?: string
}

export function Sparkline({ data, width = 240, height = 48, className, showDots = true, color }: SparklineProps) {
  const uid = useId()
  const gradId = `spark-grad-${uid}`
  const path = useMemo(() => {
    if (!data.length) return ''
    // Sanitize incoming values to avoid NaN
    const vals = data.map((v) => (Number.isFinite(v) ? Number(v) : 0))
    const n = vals.length
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    const range = Math.max(1, max - min)
    const step = n > 1 ? width / (n - 1) : 0
    return vals
      .map((v, i) => {
        const x = n > 1 ? i * step : width / 2
        const y = height - ((v - min) / range) * height
        const sx = Number.isFinite(x) ? x : 0
        const sy = Number.isFinite(y) ? y : height
        return `${i === 0 ? 'M' : 'L'}${sx.toFixed(2)},${sy.toFixed(2)}`
      })
      .join(' ')
  }, [data, width, height])

  // Calculate points for optional dots
  const points = useMemo(() => {
    if (!data.length) return [] as { x: number; y: number; v: number }[]
    const vals = data.map((v) => (Number.isFinite(v) ? Number(v) : 0))
    const n = vals.length
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    const range = Math.max(1, max - min)
    const step = n > 1 ? width / (n - 1) : 0
    return vals.map((v, i) => {
      const xRaw = n > 1 ? i * step : width / 2
      const yRaw = height - ((v - min) / range) * height
      const x = Number.isFinite(xRaw) ? xRaw : 0
      const y = Number.isFinite(yRaw) ? yRaw : height
      return { x, y, v }
    })
  }, [data, width, height])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('text-primary/80', className)}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color || 'currentColor'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color || 'currentColor'} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Animated line */}
      <motion.path
        d={path}
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
  {/* Soft area fill (only when there are 2+ points to avoid odd polygons) */}
      {data.length > 1 && path && (
        <path d={`${path} L ${width},${height} L 0,${height} Z`} fill={`url(#${gradId})`} />
      )}
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} style={{ fill: color || 'currentColor', opacity: 0.7 }} />
      ))}
    </svg>
  )
}

type BarChartProps = {
  data: Array<{ label: string; value: number }>
  height?: number
  className?: string
  colors?: string[]
  // When true, uses a fixed per-bar width and enables horizontal scroll if content exceeds container
  scrollable?: boolean
  // Only used when scrollable=true; default 20px
  minBarWidth?: number
}

export function BarChart({ data, height = 140, className, colors = CHART_PALETTE, scrollable = false, minBarWidth = 20 }: BarChartProps) {
  const max = Math.max(1, ...data.map(d => d.value))
  // In non-scrollable mode, keep compact bars to fit within typical card widths.
  const compactBarWidth = Math.max(8, Math.floor(280 / Math.max(1, data.length)))
  const barWidth = scrollable ? Math.max(12, minBarWidth) : compactBarWidth

  return (
    <TooltipProvider>
      {/* If scrollable, wrap in overflow-x container and make inner track min-w-max so it grows with content */}
      <div className={cn(scrollable ? 'overflow-x-auto' : undefined, className)} style={{ height }}>
        <div className={cn('flex items-end gap-2', scrollable ? 'min-w-max pr-2' : undefined)} style={{ height: '100%' }}>
        {data.map((d, i) => (
          <div key={i} className="group flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="rounded-t-md shadow-sm transition-[filter,transform] will-change-transform group-hover:brightness-110 group-hover:contrast-110"
                  initial={{ height: 0 }}
                  animate={{ height: (d.value / max) * (height - 20) }}
                  transition={{ type: 'spring', stiffness: 110, damping: 18, mass: 0.5, delay: i * 0.03 }}
                  style={{ width: barWidth, backgroundColor: colors[i % colors.length] }}
                  aria-label={`${d.label}: ${d.value}`}
                />
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{`${d.label}: ${d.value}`}</TooltipContent>
            </Tooltip>
            <span className="text-muted-foreground mt-1 line-clamp-1 w-14 break-words text-2xs">{d.label}</span>
          </div>
        ))}
        </div>
      </div>
    </TooltipProvider>
  )
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const duration = 800
    const from = 0
    const to = value
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplay(Math.round(from + (to - from) * easeOutCubic(t)))
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])
  // Use a deterministic format to prevent SSR/CSR locale mismatches
  return <span className={className}>{display.toString()}</span>
}

export function KpiCard({ title, value, delta, children }: { title: string; value: string | number; delta?: string; children?: React.ReactNode }) {
  return (
  <Card className="bg-gradient-to-b from-white/[0.03] to-transparent dark:from-white/[0.04]">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between gap-2">
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} className="text-3xl font-semibold tracking-tight" />
          ) : (
            <div className="text-3xl font-semibold tracking-tight">{value}</div>
          )}
          {children}
        </div>
        {delta && (
          <div className="text-muted-foreground mt-2 text-xs">{delta}</div>
        )}
      </CardContent>
    </Card>
  )
}
