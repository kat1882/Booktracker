'use client'

import { useState } from 'react'

export default function CopyLinkButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/user/${username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
    >
      <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'link'}</span>
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}
