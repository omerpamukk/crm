"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

/**
 * Küçük çizgi grafik (F): Indigo çizgi, altta solan dolgu, son noktada dolu
 * nokta. Süs amaçlı — değer her zaman yanında yazılıdır (aria-hidden).
 * En az iki nokta gerekir; daha azsa hiçbir şey çizmez.
 */
export function Sparkline({
  data,
  width = 88,
  height = 28,
  className,
  title,
}: {
  data: readonly number[]
  width?: number
  height?: number
  className?: string
  /** Üzerine gelince görünen kısa açıklama (ör. "Son 14 gün"). */
  title?: string
}) {
  const id = useId()
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, k) => [
    (k / (data.length - 1)) * (width - 6) + 3,
    height - 3 - ((v - min) / (max - min || 1)) * (height - 8),
  ])
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")
  const last = pts[pts.length - 1]
  const grad = `spark-${id.replace(/:/g, "")}`
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className={cn("block shrink-0 overflow-visible", className)}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={grad} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity={0.45} />
          <stop offset="1" stopColor="var(--primary)" stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <polygon points={`3,${height} ${line} ${width - 3},${height}`} fill={`url(#${grad})`} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--primary)" stroke="var(--surface)" strokeWidth={1.6} />
    </svg>
  )
}
