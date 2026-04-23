import Link from 'next/link'

const STEPS = [
  {
    icon: 'inventory_2',
    title: 'Build Your Vault',
    desc: 'Log every edition you own — subscription box exclusives, signed copies, limited runs. Track condition, purchase price, and notes.',
    color: 'text-violet-400',
    bg: 'bg-violet-600/10 border-violet-600/20',
  },
  {
    icon: 'auto_graph',
    title: 'See What It\'s Worth',
    desc: 'Real market values pulled from Mercari sold listings. Every edition shows its current median sale price so you always know your collection\'s worth.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-600/10 border-emerald-600/20',
  },
  {
    icon: 'search',
    title: 'Discover Rare Editions',
    desc: 'Browse thousands of subscription box and exclusive editions. Filter by source, genre, or price to find exactly what you\'re looking for.',
    color: 'text-sky-400',
    bg: 'bg-sky-600/10 border-sky-600/20',
  },
  {
    icon: 'storefront',
    title: 'Trade & Sell (Pro)',
    desc: 'List editions for sale, propose trades, and message collectors directly. The Exchange connects you with buyers and traders who know the value.',
    color: 'text-amber-400',
    bg: 'bg-amber-600/10 border-amber-600/20',
  },
]

const FEATURES = [
  { icon: 'photo_library',   label: 'Photo uploads per edition' },
  { icon: 'swap_horiz',      label: 'Trade proposals & inbox' },
  { icon: 'bar_chart',       label: 'Collection value dashboard' },
  { icon: 'public',          label: 'Public shareable profile' },
  { icon: 'local_mall',      label: 'Marketplace listings' },
  { icon: 'notifications',   label: 'Price change alerts' },
  { icon: 'library_books',   label: 'Reading status tracking' },
  { icon: 'volunteer_activism', label: 'Wishlist & want-to-read' },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0e131f] text-[#dde2f3]">

      {/* Nav */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-[#0e131f]/80 backdrop-blur-md border-b border-slate-800/50">
        <Link href="/" className="text-xl font-black tracking-tighter text-white hover:text-violet-300 transition-colors">Shelfworth</Link>
        <div className="flex items-center gap-4">
          <Link href="/browse" className="text-slate-400 hover:text-white text-sm transition-colors">Browse</Link>
          <Link href="/auth/login" className="text-slate-400 hover:text-white text-sm transition-colors">Sign In</Link>
          <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-600/20 text-violet-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            For Serious Book Collectors
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Your collection,<br />finally organized.
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Shelfworth is the only platform built specifically for subscription box and special edition collectors — with real market pricing, not guesses.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-20">
          {STEPS.map((step, i) => (
            <div key={i} className={`bg-slate-900/60 border rounded-2xl p-6 ${step.bg}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${step.bg}`}>
                  <span className={`material-symbols-outlined ${step.color}`}>{step.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Step {i + 1}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">

          {/* Free */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-7">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Free</p>
              <p className="text-4xl font-black text-white">$0</p>
              <p className="text-slate-500 text-sm mt-1">forever</p>
            </div>
            <ul className="space-y-3 mb-7">
              {['Unlimited collection tracking', 'Market value on every edition', 'Browse the full archive', 'Public profile page', 'Reading & wishlist tracking'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  {f}
                </li>
              ))}
              {['Marketplace messaging & trades', 'Create listings for sale'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-slate-700 text-base">close</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className="block w-full text-center border border-slate-700 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
              Start Free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-slate-900/60 border border-violet-600/40 rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">Pro</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-black text-white">$3</p>
                <p className="text-slate-400 text-sm mb-1.5">/month</p>
              </div>
              <p className="text-slate-500 text-sm mt-1">cancel anytime</p>
            </div>
            <ul className="space-y-3 mb-7">
              {['Everything in Free', 'Message sellers & make offers', 'Propose and accept trades', 'Create marketplace listings', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-violet-400 text-base">check</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className="block w-full text-center bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold transition-colors">
              Start with Pro
            </Link>
          </div>

        </div>

        {/* Features grid */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">Everything you need</h2>
          <p className="text-slate-500 text-sm">Built for the way collectors actually think about their books.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-20">
          {FEATURES.map(f => (
            <div key={f.label} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-2xl">{f.icon}</span>
              <p className="text-xs text-slate-400 leading-snug">{f.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-3">Ready to start?</h2>
          <p className="text-slate-400 mb-8">Free to join. No credit card required.</p>
          <Link href="/auth/signup" className="bg-violet-600 hover:bg-violet-500 text-white px-12 py-4 rounded-xl font-bold text-lg transition-colors shadow-xl shadow-violet-900/20 inline-block">
            Create Your Free Account
          </Link>
        </div>

      </main>
    </div>
  )
}
