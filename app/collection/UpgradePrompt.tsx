import Link from 'next/link'

export default function UpgradePrompt({ editionCount }: { editionCount: number }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10">
          <span className="inline-block bg-violet-600/20 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">Pro feature</span>
          <h2 className="text-2xl font-bold text-white mb-3">Your collection is worth something</h2>
          <p className="text-gray-400 text-sm mb-2">
            You have <span className="text-white font-semibold">{editionCount} editions</span> in your collection.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Upgrade to Pro to see total market value, gain/loss, top performers, and more.
          </p>
          <form action="/api/stripe/checkout" method="POST">
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
            >
              Unlock for $3/month
            </button>
          </form>
          <Link href="/shelves" className="block text-sm text-gray-500 hover:text-gray-400 transition-colors">
            Back to shelves
          </Link>
        </div>
      </div>
    </div>
  )
}
