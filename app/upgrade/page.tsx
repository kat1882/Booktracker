export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <span className="inline-block bg-violet-600/20 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">Pro</span>
          <h1 className="text-3xl font-bold text-white mb-3">Know what your collection is worth</h1>
          <p className="text-gray-400">Unlock the collection value estimator and more for $3/month.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
          <div className="flex items-end gap-1 mb-6">
            <span className="text-4xl font-bold text-white">$3</span>
            <span className="text-gray-500 mb-1">/month</span>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              "Collection value estimator — see your shelf's total market worth",
              'Export your collection to CSV / spreadsheet',
              'Wishlist — track editions you want to buy',
              'Cancel anytime',
            ].map(f => (
              <li key={f} className="flex gap-3 text-sm text-gray-300">
                <span className="text-violet-400 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-900/20 border border-red-800 rounded-lg p-3">{decodeURIComponent(error)}</p>
          )}
          <form action="/api/stripe/checkout" method="POST">
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Upgrade to Pro
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600">
          Secure payment via Stripe · Cancel anytime from your profile
        </p>
      </div>
    </main>
  )
}
