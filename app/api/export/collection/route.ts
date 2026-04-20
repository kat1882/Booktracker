import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(values: (string | number | null | undefined)[]) {
  return values.map(csvEscape).join(',')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profile').select('is_pro').eq('id', user.id).maybeSingle()
  if (!profile?.is_pro) return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })

  const { data: entries } = await supabase
    .from('user_collection')
    .select(`
      reading_status, rating, condition, purchase_price, for_sale, asking_price, date_read, date_started,
      book:book_id ( title, author, genre, page_count ),
      edition:edition_id (
        edition_name, edition_type, isbn, publisher, release_month,
        original_retail_price, estimated_value, cover_artist, edge_treatment, binding, extras,
        source:source_id ( name )
      )
    `)
    .eq('user_id', user.id)
    .order('reading_status')

  const headers = [
    'Title', 'Author', 'Genre', 'Pages',
    'Edition Name', 'Edition Type', 'Source', 'ISBN', 'Publisher', 'Release',
    'Cover Artist', 'Edge Treatment', 'Binding', 'Extras',
    'Status', 'Rating', 'Date Started', 'Date Read',
    'Condition', 'Purchase Price', 'Original Retail', 'Est. Market Value',
    'For Sale', 'Asking Price',
  ]

  const lines: string[] = [headers.join(',')]

  for (const e of (entries ?? [])) {
    const b = e.book as Record<string, unknown> | null
    const ed = e.edition as Record<string, unknown> | null
    const src = ed?.source as Record<string, unknown> | null

    lines.push(row([
      b?.title, b?.author, b?.genre, b?.page_count,
      ed?.edition_name, ed?.edition_type, src?.name, ed?.isbn, ed?.publisher, ed?.release_month,
      ed?.cover_artist, ed?.edge_treatment, ed?.binding, ed?.extras,
      e.reading_status, e.rating, e.date_started, e.date_read,
      e.condition, e.purchase_price, ed?.original_retail_price, ed?.estimated_value,
      e.for_sale ? 'Yes' : 'No', e.asking_price,
    ]))
  }

  const csv = lines.join('\n')
  const filename = `edition-tracker-collection-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
