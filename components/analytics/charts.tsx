"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Lightweight SVG chart primitives to avoid heavy deps

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  className?: string
  showDots?: boolean
}

export function Sparkline({ data, width = 240, height = 48, className, showDots = true }: SparklineProps) {
  const path = useMemo(() => {
    if (!data.length) return ''
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = Math.max(1, max - min)
    const step = width / (data.length - 1)
    return data
      .map((v, i) => {
        const x = i * step
        const y = height - ((v - min) / range) * height
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }, [data, width, height])

  // Calculate points for optional dots
  const points = useMemo(() => {
    if (!data.length) return [] as { x: number; y: number; v: number }[]
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = Math.max(1, max - min)
    const step = width / (data.length - 1)
    return data.map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return { x, y, v }
    })
  }, [data, width, height])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('text-primary/80', className)}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Animated line */}
      <motion.path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      {/* Soft area fill */}
      {path && (
        <path d={`${path} L ${width},${height} L 0,${height} Z`} fill="url(#spark-grad)" />
      )}
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} className="fill-primary/70" />
      ))}
    </svg>
  )
}

type BarChartProps = {
  data: Array<{ label: string; value: number }>
  height?: number
  className?: string
}

export function BarChart({ data, height = 140, className }: BarChartProps) {
  const max = Math.max(1, ...data.map(d => d.value))
  const barWidth = Math.max(8, Math.floor(280 / Math.max(1, data.length)))

  return (
    <TooltipProvider>
      <div className={cn('flex items-end gap-2', className)} style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="bg-primary/80 rounded-t-md transition-colors group-hover:bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: (d.value / max) * (height - 20) }}
                  transition={{ type: 'spring', stiffness: 110, damping: 18, mass: 0.5, delay: i * 0.03 }}
                  style={{ width: barWidth }}
                />
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{`${d.label}: ${d.value}`}</TooltipContent>
            </Tooltip>
            <span className="text-muted-foreground mt-1 line-clamp-1 w-14 break-words text-2xs">{d.label}</span>
          </div>
        ))}
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
  return <span className={className}>{display.toLocaleString()}</span>
}

export function KpiCard({ title, value, delta, children }: { title: string; value: string | number; delta?: string; children?: React.ReactNode }) {
  return (
    <Card>
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
