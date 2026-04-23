'use client'

import { useState, useRef, useEffect } from 'react'

const REASONS = [
  'Price is too high',
  'Price is too low',
  'Wrong edition matched',
  'Prices are outdated',
  'Other',
]

export default function ReportPricingButton({ editionId }: { editionId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSubmit() {
    if (!reason) return
    setSending(true)
    await fetch('/api/pricing-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edition_id: editionId, reason, note }),
    })
    setSending(false)
    setDone(true)
    setTimeout(() => { setOpen(false); setDone(false); setReason(''); setNote('') }, 1800)
  }

  return (
    <div ref={ref} className="relative" onClick={e => e.preventDefault()}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        title="Report pricing issue"
        className="flex items-center gap-0.5 text-slate-600 hover:text-amber-400 transition-colors text-[10px] font-medium"
      >
        <span className="material-symbols-outlined text-[13px]">flag</span>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-4"
          onClick={e => e.stopPropagation()}>
          {done ? (
            <div className="text-center py-2">
              <span className="material-symbols-outlined text-emerald-400 text-2xl block mb-1">check_circle</span>
              <p className="text-emerald-300 text-xs font-semibold">Thanks for the report!</p>
            </div>
          ) : (
            <>
              <p className="text-white text-xs font-bold mb-3">Report Pricing Issue</p>
              <div className="space-y-1.5 mb-3">
                {REASONS.map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer group">
                    <div onClick={() => setReason(r)}
                      className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors ${reason === r ? 'border-amber-500 bg-amber-500/20' : 'border-slate-600 group-hover:border-amber-500/50'}`} />
                    <span className={`text-[11px] ${reason === r ? 'text-amber-300' : 'text-slate-400'}`}>{r}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional note…"
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-amber-500/50 mb-3"
              />
              <button
                onClick={handleSubmit}
                disabled={sending || !reason}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                {sending ? 'Sending…' : 'Submit Report'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
