'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',              label: 'Dashboard',        icon: 'dashboard' },
  { href: '/admin/submissions',  label: 'Submissions',      icon: 'inbox' },
  { href: '/admin/editions',     label: 'Editions',         icon: 'menu_book' },
  { href: '/admin/books',        label: 'Books',            icon: 'library_books' },
  { href: '/admin/sources',      label: 'Sources',          icon: 'storefront' },
  { href: '/admin/pricing-reports', label: 'Price Reports', icon: 'flag' },
  { href: '/admin/calendar',     label: 'Calendar',         icon: 'calendar_month' },
]

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname()

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800/50 flex flex-col py-6">
        <div className="px-5 mb-8">
          <Link href="/" className="text-lg font-black text-slate-100 tracking-tighter hover:text-violet-300 transition-colors">Shelfworth</Link>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Admin</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(item => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-600/20 text-violet-200'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 mt-6 pt-6 border-t border-slate-800/50">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-900/70 border-b border-slate-800/50 px-8 py-4 shrink-0">
          <h1 className="text-lg font-bold text-white">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
