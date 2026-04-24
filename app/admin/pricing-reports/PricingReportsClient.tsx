'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Edition {
  id: string
  edition_name: string
  cover_image: string | null
  estimated_value: number | null
  price_override: number | null
  mercari_median: number | null
  ebay_median: number | null
  book: { title: string; author: string } | null
  source: { name: string } | null
}

interface Report {
  id: string
  reason: string
  note: string | null
  created_at: string
  edition_id: string
  edition: Edition | null
}

const fmt = (n: number | null | undefined) => n != null ? `$${Number(n).toFixed(0)}` : '—'
const timeAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`
}

export default function PricingReportsClient({ reports: initialReports }: { reports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Group by edition so we see all flags for the same edition together
  const byEdition = new Map<string, Report[]>()
  for (const r of reports.filter(r => !dismissed.has(r.id))) {
    const key = r.edition_id
    if (!byEdition.has(key)) byEdition.set(key, [])
    byEdition.get(key)!.push(r)
  }

  async function applyOverride(editionId: string, reportIds: string[]) {
    const val = parseFloat(overrides[editionId] ?? '')
    if (!val || val <= 0) return
    setSaving(editionId)

    await fetch(`/api/admin/editions/${editionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_override: val }),
    })

    // Dismiss all reports for this edition
    setDismissed(prev => new Set([...prev, ...reportIds]))
    setSaving(null)
  }

  function dismissAll(reportIds: string[]) {
    setDismissed(prev => new Set([...prev, ...reportIds]))
  }

  const groups = [...byEdition.entries()]

  if (groups.length === 0) {
    return (
      <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-600 text-sm">
        No pricing reports.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{groups.length} editions flagged · {reports.length} total reports</p>

      {groups.map(([editionId, edReports]) => {
        const ed = edReports[0].edition
        const marketValue = ed?.price_override ?? ed?.estimated_value
        const isSaving = saving === editionId

        return (
          <div key={editionId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Edition header */}
            <div className="flex gap-4 p-4">
              <div className="w-12 h-16 relative bg-slate-800 rounded-lg overflow-hidden shrink-0">
                {ed?.cover_image && <Image src={ed.cover_image} alt={ed.edition_name} fill className="object-cover" sizes="48px" unoptimized />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white line-clamp-1">{ed?.edition_name ?? editionId}</p>
                    <p className="text-xs text-slate-500">{ed?.book?.title} by {ed?.book?.author} · {ed?.source?.name}</p>
                  </div>
                  <Link href={`/edition/${editionId}`} target="_blank" className="text-slate-600 hover:text-violet-400 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-slate-600 flex-wrap">
                  <span>Current value: <span className={`font-medium ${ed?.price_override ? 'text-amber-400' : 'text-emerald-500'}`}>{fmt(marketValue)}{ed?.price_override ? ' 📌' : ''}</span></span>
                  {ed?.mercari_median && <span>Mercari: <span className="text-blue-400">{fmt(ed.mercari_median)}</span></span>}
                  {ed?.ebay_median && <span>eBay: <span className="text-slate-400">{fmt(ed.ebay_median)}</span></span>}
                  <span className="text-amber-400 font-medium">{edReports.length} flag{edReports.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Reports */}
            <div className="border-t border-slate-800 divide-y divide-slate-800/60">
              {edReports.map(r => (
                <div key={r.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500/70 text-sm mt-0.5">flag</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-slate-300">{r.reason}</span>
                    {r.note && <span className="text-xs text-slate-500 ml-2">— {r.note}</span>}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(r.created_at)}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-slate-800 px-4 py-3 flex items-center gap-3 bg-slate-950/50">
              <div className="relative flex-1 max-w-[180px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                <input
                  type="number" step="0.01" min="0"
                  placeholder="Set price override"
                  value={overrides[editionId] ?? ''}
                  onChange={e => setOverrides(prev => ({ ...prev, [editionId]: e.target.value }))}
                  className="w-full bg-slate-900 border border-amber-700/50 rounded-lg pl-6 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={() => applyOverride(editionId, edReports.map(r => r.id))}
                disabled={isSaving || !overrides[editionId]}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-colors"
              >
                {isSaving ? 'Saving…' : 'Apply & Dismiss'}
              </button>
              <Link
                href={`/admin/editions?q=${encodeURIComponent(ed?.edition_name ?? '')}&field=edition`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                Edit Edition
              </Link>
              <button
                onClick={() => dismissAll(edReports.map(r => r.id))}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
