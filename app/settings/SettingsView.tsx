'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const GENRES = [
  'Fantasy', 'Romance', 'Sci-Fi', 'Mystery', 'Thriller', 'Horror',
  'Literary Fiction', 'Historical Fiction', 'Non-Fiction', 'YA', 'Graphic Novel', 'Poetry',
]

export default function SettingsView({
  email,
  username: initialUsername,
  displayName: initialDisplayName,
  bio: initialBio,
  country: initialCountry,
  publicPortfolio: initialPublicPortfolio,
  showMarketValue: initialShowMarketValue,
}: {
  email: string
  username: string
  displayName: string
  bio: string
  country: string
  publicPortfolio: boolean
  showMarketValue: boolean
}) {
  const router = useRouter()
  const [username, setUsername] = useState(initialUsername)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio)
  const [country, setCountry] = useState(initialCountry)
  const [publicPortfolio, setPublicPortfolio] = useState(initialPublicPortfolio)
  const [showMarketValue, setShowMarketValue] = useState(initialShowMarketValue)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name: displayName, bio, country, public_portfolio: publicPortfolio, show_market_value: showMarketValue }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e131f] flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col py-6 px-4 hidden md:flex border-r border-slate-800/50">
        <div className="mb-10 px-4">
          <Link href="/" className="text-xl font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Curator Settings</p>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/shelves" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="font-medium text-sm">The Vault</span>
          </Link>
          <Link href="/shelves" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">auto_stories</span>
            <span className="font-medium text-sm">The Library</span>
          </Link>
          <Link href="/collection" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">analytics</span>
            <span className="font-medium text-sm">Intelligence</span>
          </Link>
          <Link href="/marketplace" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">local_mall</span>
            <span className="font-medium text-sm">The Exchange</span>
          </Link>
          <Link href="/boxes" className="w-full px-4 py-3 flex items-center gap-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
            <span className="material-symbols-outlined text-xl">inventory_2</span>
            <span className="font-medium text-sm">Box Registry</span>
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-3">
          <Link href="/browse" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
            Add to Collection
          </Link>
          <Link href="/profile" className="px-4 py-2 flex items-center gap-3 text-slate-500 hover:text-slate-200 text-sm transition-colors rounded-lg hover:bg-slate-800">
            <span className="material-symbols-outlined text-lg">person</span>
            My Profile
          </Link>
          <div className="px-4 py-2 flex items-center gap-3 rounded-lg bg-violet-600/20 text-violet-300">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
            <span className="text-sm font-medium">Settings</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/profile" className="hover:text-slate-200 transition-colors">Profile</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-white font-semibold">Edit Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white'
              }`}
            >
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
            )}

            {/* Page header */}
            <div>
              <p className="text-violet-400 uppercase tracking-[0.2em] text-xs font-bold mb-2 font-mono">Account</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Edit Profile</h1>
              <p className="text-slate-400 mt-1 text-sm">Manage your curator identity and collection preferences.</p>
            </div>

            {/* ── Curator Identity ── */}
            <section className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400 text-lg">badge</span>
                Curator Identity
              </h2>

              {/* Avatar placeholder */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shrink-0 ring-2 ring-violet-500/30">
                  <span className="text-white text-3xl font-black">{(displayName || username).charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white mb-1">Profile Photo</p>
                  <p className="text-xs text-slate-500 mb-3">Photo uploads coming soon.</p>
                  <button disabled className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-600 text-xs font-medium cursor-not-allowed">
                    Upload Photo
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Display Name</label>
                <input
                  type="text"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Curator Handle */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Curator Handle</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">@</span>
                  <input
                    type="text"
                    placeholder="yourhandle"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1.5">Letters, numbers, and underscores only.</p>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Bio</label>
                <textarea
                  placeholder="Tell the community about your collection…"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
                <p className="text-xs text-slate-600 mt-1 text-right">{bio.length}/500</p>
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Country</label>
                <input
                  type="text"
                  placeholder="e.g. United Kingdom"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </section>

            {/* ── Archival Preferences ── */}
            <section className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400 text-lg">tune</span>
                Archival Preferences
              </h2>

              {/* Genre interests */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3 block">Genre Interests</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <span
                      key={g}
                      className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 text-xs font-medium cursor-default select-none"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-2">Genre preferences coming soon.</p>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Public Portfolio</p>
                    <p className="text-xs text-slate-500 mt-0.5">Allow others to view your collection</p>
                  </div>
                  <button
                    onClick={() => setPublicPortfolio(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${publicPortfolio ? 'bg-violet-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${publicPortfolio ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                <div className="h-px bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Show Market Value Trends</p>
                    <p className="text-xs text-slate-500 mt-0.5">Display estimated values on your profile</p>
                  </div>
                  <button
                    onClick={() => setShowMarketValue(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${showMarketValue ? 'bg-violet-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showMarketValue ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            </section>

            {/* ── Access Control ── */}
            <section className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400 text-lg">lock</span>
                Access Control
              </h2>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-600 mt-1.5">Email cannot be changed here.</p>
              </div>

              <div className="pt-1">
                <p className="text-sm font-medium text-slate-300 mb-1">Security Credentials</p>
                <p className="text-xs text-slate-500 mb-3">Update your password or linked accounts.</p>
                <Link
                  href="/auth/update-password"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-violet-500/50 hover:text-violet-300 text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">key</span>
                  Update Security Credentials
                </Link>
              </div>
            </section>

            {/* Bottom save */}
            <div className="flex gap-3 pb-6">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  saved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white'
                }`}
              >
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg px-6 py-4 flex justify-around items-center z-10 border-t border-slate-800/50">
        <Link href="/shelves" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold uppercase">Vault</span>
        </Link>
        <Link href="/browse" className="w-12 h-12 -mt-8 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center">
          <span className="material-symbols-outlined">add</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-violet-400">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          <span className="text-[10px] font-bold uppercase">Settings</span>
        </Link>
      </nav>

    </div>
  )
}
