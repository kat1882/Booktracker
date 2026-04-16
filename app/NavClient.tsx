'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const publicLinks = [
    { href: '/search', label: 'Search' },
    { href: '/boxes', label: 'Monthly Boxes' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/trending', label: 'Trending' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/submit', label: 'Submit' },
  ]

  const authLinks = isLoggedIn
    ? [
        { href: '/shelves', label: 'My Shelves' },
        { href: '/wishlist', label: 'Wish List' },
        { href: '/lists', label: 'Lists' },
        { href: '/stats', label: 'Stats' },
        { href: '/profile', label: 'Profile' },
      ]
    : []

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex gap-5 items-center text-sm text-gray-400">
        {publicLinks.map(l => (
          <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
        ))}
        {isLoggedIn ? (
          <>
            {authLinks.map(l => (
              <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
            ))}
            <form action="/auth/signout" method="POST">
              <button className="hover:text-white transition-colors">Sign out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
              Sign up
            </Link>
          </>
        )}
      </nav>

      {/* Mobile hamburger */}
      <div className="md:hidden relative" ref={menuRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-gray-400 hover:text-white p-1 transition-colors"
          aria-label="Menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-9 z-50 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden py-1">
            {publicLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-gray-800 my-1" />
            {isLoggedIn ? (
              <>
                {authLinks.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
                <form action="/auth/signout" method="POST">
                  <button className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="block px-4 py-2.5 text-sm text-violet-400 hover:bg-gray-800 hover:text-violet-300 transition-colors font-medium">
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
