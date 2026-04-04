export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <h1 className="text-5xl font-bold mb-4 tracking-tight">Special Edition Book Tracker</h1>
      <p className="text-gray-400 text-lg max-w-xl mb-8">
        The only place to track subscription box exclusives, signed editions, and special variants — with condition, value, and community data.
      </p>
      <a
        href="/browse"
        className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        Browse Editions →
      </a>
    </div>
  )
}
