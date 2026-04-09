import { createClient } from '@/lib/supabase-server'
import { createClient as anonClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import CalendarClient from './CalendarClient'

const anon = anonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch upcoming + recent releases (3 months back, 6 months forward)
  const from = new Date()
  from.setMonth(from.getMonth() - 1)
  const to = new Date()
  to.setMonth(to.getMonth() + 6)

  const [{ data: entries }, { data: sources }] = await Promise.all([
    anon
      .from('release_calendar')
      .select('*, source:source_id(id, name, type)')
      .gte('release_date', from.toISOString().slice(0, 10))
      .lte('release_date', to.toISOString().slice(0, 10))
      .order('release_date', { ascending: true }),
    anon.from('source').select('id, name, type').eq('type', 'subscription_box').order('name'),
  ])

  // User subscriptions
  let userSubs: string[] = []
  if (user) {
    const { data: subs } = await supabase
      .from('user_box_subscription')
      .select('source_id')
    userSubs = (subs ?? []).map(s => s.source_id)
  }

  // Group entries by month
  const byMonth: Record<string, typeof entries> = {}
  for (const entry of entries ?? []) {
    const d = new Date(entry.release_date + 'T00:00:00')
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key]!.push(entry)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Release Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming subscription box editions</p>
        </div>
        <Link href="/admin/calendar" className="text-xs text-gray-500 hover:text-violet-400 transition-colors">
          Admin →
        </Link>
      </div>

      {/* Subscribe to sources */}
      {sources && sources.length > 0 && (
        <CalendarClient
          sources={sources}
          initialSubs={userSubs}
          isLoggedIn={!!user}
        />
      )}

      {/* Calendar entries */}
      {Object.keys(byMonth).length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📅</p>
          <p>No upcoming releases yet.</p>
          {!user && (
            <p className="mt-2 text-sm">
              <Link href="/auth/login" className="text-violet-400 hover:underline">Sign in</Link> to subscribe to boxes and get auto-updates.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(byMonth).map(([month, monthEntries]) => (
            <section key={month}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
                {month}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(monthEntries ?? []).map(entry => {
                  const source = entry.source as { id: string; name: string } | null
                  const isPast = entry.release_date <= today
                  const releaseLabel = new Date(entry.release_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })

                  return (
                    <div
                      key={entry.id}
                      className={`bg-gray-900 border rounded-xl overflow-hidden flex gap-3 p-4 ${
                        isPast ? 'border-gray-800 opacity-70' : 'border-gray-800 hover:border-violet-600 transition-colors'
                      }`}
                    >
                      {/* Cover or placeholder */}
                      <div className="w-14 shrink-0">
                        <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden">
                          {entry.cover_image_url ? (
                            <Image src={entry.cover_image_url} alt={entry.book_title} fill className="object-cover" sizes="56px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-lg">📚</div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {source && (
                          <p className="text-xs text-violet-400 font-medium mb-0.5">{source.name}</p>
                        )}
                        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{entry.book_title}</p>
                        {entry.author && <p className="text-xs text-gray-500 mt-0.5">{entry.author}</p>}
                        {entry.edition_type && (
                          <p className="text-xs text-gray-600 mt-0.5 capitalize">{entry.edition_type.replace(/_/g, ' ')}</p>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.notes}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs font-medium ${isPast ? 'text-gray-600' : 'text-emerald-400'}`}>
                            {isPast ? `Released ${releaseLabel}` : releaseLabel}
                          </span>
                          {entry.edition_id && (
                            <Link
                              href={`/edition/${entry.edition_id}`}
                              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              View edition →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
