'use client'

import { useState } from 'react'

interface DataPoint {
  date: string
  value: number
}

const W = 640
const H = 180
const PAD = { top: 16, right: 16, bottom: 36, left: 72 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function fmtValue(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
}

export default function CollectionValueChart({ data }: { data: DataPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length < 2) return null

  const values = data.map(d => d.value)
  const times = data.map(d => new Date(d.date).getTime())

  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const minT = Math.min(...times)
  const maxT = Math.max(...times)

  const vPad = (maxV - minV) * 0.12 || maxV * 0.1
  const yMin = Math.max(0, minV - vPad)
  const yMax = maxV + vPad
  const yRange = yMax - yMin
  const tRange = maxT - minT || 1

  function toX(t: number) { return PAD.left + ((t - minT) / tRange) * CW }
  function toY(v: number) { return PAD.top + CH - ((v - yMin) / yRange) * CH }

  const linePath = data.map((d, i) => {
    const x = toX(new Date(d.date).getTime())
    const y = toY(d.value)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const first = data[0].value
  const last = data[data.length - 1].value
  const change = last - first
  const changePct = first > 0 ? (change / first) * 100 : 0
  const isUp = change >= 0
  const lineColor = isUp ? '#10b981' : '#ef4444'

  const yTicks = 4
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange / yTicks) * i)

  const xTickCount = Math.min(data.length, 5)
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i / (xTickCount - 1)) * (data.length - 1))
  )

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Collection Value Over Time</h2>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-emerald-400">{fmtValue(last)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTickVals.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#1f2937" strokeWidth="1" />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fill="#4b5563" fontSize="10">{fmtValue(v)}</text>
          </g>
        ))}

        {/* X labels */}
        {xTickIndices.map(i => (
          <text key={i} x={toX(new Date(data[i].date).getTime())} y={H - 4} textAnchor="middle" fill="#4b5563" fontSize="10">
            {fmtShort(data[i].date)}
          </text>
        ))}

        {/* Area */}
        <path
          d={`${linePath} L ${toX(times[times.length - 1])} ${PAD.top + CH} L ${toX(times[0])} ${PAD.top + CH} Z`}
          fill="url(#collGrad)"
        />

        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover dots */}
        {data.map((d, i) => {
          const x = toX(new Date(d.date).getTime())
          const y = toY(d.value)
          return (
            <g key={i}>
              {hovered === i && (
                <>
                  <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + CH} stroke="#374151" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx={x} cy={y} r={5} fill={lineColor} stroke="#111827" strokeWidth="2" />
                </>
              )}
              <circle cx={x} cy={y} r={12} fill="transparent" onMouseEnter={() => setHovered(i)} />
            </g>
          )
        })}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const d = data[hovered]
          const x = toX(new Date(d.date).getTime())
          const y = toY(d.value)
          const ttW = 100
          const ttH = 36
          const ttX = Math.min(Math.max(x - ttW / 2, PAD.left), W - PAD.right - ttW)
          const ttY = y - ttH - 10
          return (
            <g>
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />
              <text x={ttX + ttW / 2} y={ttY + 14} textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
                {fmtValue(d.value)}
              </text>
              <text x={ttX + ttW / 2} y={ttY + 28} textAnchor="middle" fill="#9ca3af" fontSize="9">
                {fmtDate(d.date)}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
