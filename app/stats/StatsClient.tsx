'use client'

import { useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  years: string[]
  currentYear: string
  monthlyByYear: Record<string, number[]>
  genres: [string, number][]
  topAuthors: [string, number][]
  ratingDist: { rating: number; count: number }[]
  pagesByYear: Record<string, number>
  totalBooks: number
  totalPages: number
  avgRating: number | null
  wantToRead: number
}

function BarChart({ data, labels, color = '#8b5cf6' }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data, 1)
  const W = 560
  const H = 140
  const PAD = { top: 10, right: 8, bottom: 24, left: 28 }
  const CW = W - PAD.left - PAD.right
  const CH = H - PAD.top - PAD.bottom
  const barW = CW / data.length
  const gap = barW * 0.2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Y-axis ticks */}
      {[0, Math.ceil(max / 2), max].map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={PAD.top + CH - (v / max) * CH} x2={W - PAD.right} y2={PAD.top + CH - (v / max) * CH} stroke="#1f2937" strokeWidth="1" />
          <text x={PAD.left - 4} y={PAD.top + CH - (v / max) * CH + 4} textAnchor="end" fill="#4b5563" fontSize="9">{v}</text>
        </g>
      ))}
      {data.map((val, i) => {
        const bH = val > 0 ? Math.max((val / max) * CH, 2) : 0
        const x = PAD.left + i * barW + gap / 2
        const y = PAD.top + CH - bH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW - gap} height={bH} fill={color} rx="2" opacity={val > 0 ? 1 : 0.1} />
            <text x={x + (barW - gap) / 2} y={H - 4} textAnchor="middle" fill="#4b5563" fontSize="9">{labels[i]}</text>
            {val > 0 && (
              <text x={x + (barW - gap) / 2} y={y - 3} textAnchor="middle" fill={color} fontSize="9" fontWeight="600">{val}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function HorizontalBars({ data, maxVal }: { data: [string, number][]; maxVal: number }) {
  return (
    <div className="flex flex-col gap-2">
      {data.map(([label, count]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-400 text-right truncate capitalize shrink-0">{label}</div>
          <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${(count / maxVal) * 100}%` }}
            />
          </div>
          <div className="w-6 text-xs text-gray-500 text-right shrink-0">{count}</div>
        </div>
      ))}
    </div>
  )
}

export default function StatsClient({
  years, currentYear, monthlyByYear, genres, topAuthors,
  ratingDist, pagesByYear, totalBooks, totalPages, avgRating, wantToRead,
}: Props) {
  const [year, setYear] = useState(currentYear)

  const monthlyData = monthlyByYear[year] ?? Array(12).fill(0)
  const booksThisYear = monthlyData.reduce((a, b) => a + b, 0)
  const pagesThisYear = pagesByYear[year] ?? 0
  const maxGenre = genres[0]?.[1] ?? 1
  const maxAuthor = topAuthors[0]?.[1] ?? 1
  const maxRating = Math.max(...ratingDist.map(r => r.count), 1)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Reading Stats</h1>
        {years.length > 1 && (
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${y === year ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {totalBooks === 0 ? (
        <div className="text-center py-24 text-gray-500">
          No books marked as read yet. Start reading and come back!
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: `Books in ${year}`, value: booksThisYear, color: 'text-violet-400' },
              { label: `Pages in ${year}`, value: pagesThisYear > 0 ? pagesThisYear.toLocaleString() : '—', color: 'text-blue-400' },
              { label: 'All-time read', value: totalBooks, color: 'text-emerald-400' },
              { label: 'Avg rating', value: avgRating ? `${avgRating.toFixed(1)} ★` : '—', color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white mb-4">Books Read Per Month — {year}</h2>
            {booksThisYear > 0 ? (
              <BarChart data={monthlyData} labels={MONTHS} color="#8b5cf6" />
            ) : (
              <p className="text-gray-600 text-sm py-8 text-center">No books logged for {year}.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Genre breakdown */}
            {genres.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Genre Breakdown</h2>
                <HorizontalBars data={genres} maxVal={maxGenre} />
              </div>
            )}

            {/* Top authors */}
            {topAuthors.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Most Read Authors</h2>
                <HorizontalBars data={topAuthors} maxVal={maxAuthor} />
              </div>
            )}
          </div>

          {/* Ratings distribution */}
          {ratingDist.some(r => r.count > 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-white mb-4">Rating Distribution</h2>
              <BarChart
                data={ratingDist.map(r => r.count)}
                labels={ratingDist.map(r => '★'.repeat(r.rating))}
                color="#f59e0b"
              />
            </div>
          )}

          {/* TBR pile */}
          {wantToRead > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">TBR Pile</p>
                <p className="text-xs text-gray-500 mt-0.5">Books on your Want to Read shelf</p>
              </div>
              <p className="text-3xl font-bold text-blue-400">{wantToRead}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
