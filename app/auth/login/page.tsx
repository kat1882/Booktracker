'use client'
import { createClient } from '@/lib/supabase-browser'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/'); router.refresh() }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-gray-400 text-sm mb-6">Welcome back to Shelfworth</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email" required placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <input
            type="password" required placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          No account? <Link href="/auth/signup" className="text-violet-400 hover:text-violet-300">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
