'use client'

import { useState } from 'react'

interface PricePoint {
  price: number
  recorded_at: string
}

const W = 560
const H = 160
const PAD = { top: 16, right: 16, bottom: 36, left: 52 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function PriceChart({ points }: { points: PricePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (points.length === 0) return null

  // With a single point, add a fake "now" duplicate so there's a visible line
  const data = points.length === 1
    ? [...points, { ...points[0], recorded_at: new Date().toISOString() }]
    : points

  const prices = data.map(p => p.price)
  const times = data.map(p => new Date(p.recorded_at).getTime())

  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const minT = Math.min(...times)
  const maxT = Math.max(...times)

  const rangeP = maxP - minP || 1
  const rangeT = maxT - minT || 1

  // Pad y range by 10%
  const yPad = rangeP * 0.15
  const yMin = minP - yPad
  const yMax = maxP + yPad
  const yRange = yMax - yMin

  function toX(t: number) { return PAD.left + ((t - minT) / rangeT) * CW }
  function toY(p: number) { return PAD.top + CH - ((p - yMin) / yRange) * CH }

  const linePath = data.map((pt, i) => {
    const x = toX(new Date(pt.recorded_at).getTime())
    const y = toY(pt.price)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Y-axis ticks
  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange / yTicks) * i)

  // X-axis ticks (up to 5, using actual data points)
  const xTickIndices = data.length <= 5
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1]

  const currentPrice = points[points.length - 1].price
  const firstPrice = points[0].price
  const change = currentPrice - firstPrice
  const changePct = firstPrice > 0 ? (change / firstPrice) * 100 : 0
  const isUp = change >= 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Price History</h3>
        {points.length > 1 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}% all time
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {yTickValues.map((v, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={toY(v)}
            x2={W - PAD.right}
            y2={toY(v)}
            stroke="#1f2937"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {yTickValues.map((v, i) => (
          <text
            key={i}
            x={PAD.left - 6}
            y={toY(v) + 4}
            textAnchor="end"
            fill="#6b7280"
            fontSize="10"
          >
            ${v.toFixed(0)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTickIndices.map(i => (
          <text
            key={i}
            x={toX(new Date(data[i].recorded_at).getTime())}
            y={H - 4}
            textAnchor="middle"
            fill="#4b5563"
            fontSize="10"
          >
            {formatShortDate(data[i].recorded_at)}
          </text>
        ))}

        {/* Area fill */}
        <path
          d={`${linePath} L ${toX(times[times.length - 1])} ${PAD.top + CH} L ${toX(times[0])} ${PAD.top + CH} Z`}
          fill="url(#priceGrad)"
          opacity="0.3"
        />

        {/* Gradient def */}
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots + hover targets */}
        {points.map((pt, i) => {
          const x = toX(new Date(pt.recorded_at).getTime())
          const y = toY(pt.price)
          const isHov = hovered === i
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={isHov ? 5 : 3}
                fill={isUp ? '#10b981' : '#ef4444'}
                stroke="#111827"
                strokeWidth="1.5"
              />
              {/* Invisible larger hit area */}
              <circle
                cx={x}
                cy={y}
                r={10}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
              />
            </g>
          )
        })}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const pt = points[hovered]
          const x = toX(new Date(pt.recorded_at).getTime())
          const y = toY(pt.price)
          const ttW = 90
          const ttH = 34
          const ttX = Math.min(Math.max(x - ttW / 2, PAD.left), W - PAD.right - ttW)
          const ttY = y - ttH - 8
          return (
            <g>
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />
              <text x={ttX + ttW / 2} y={ttY + 13} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
                ${pt.price.toFixed(2)}
              </text>
              <text x={ttX + ttW / 2} y={ttY + 27} textAnchor="middle" fill="#9ca3af" fontSize="9">
                {formatDate(pt.recorded_at)}
              </text>
            </g>
          )
        })()}
      </svg>

      <p className="text-xs text-gray-600 mt-1">{points.length} data point{points.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
