import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      book_title, book_author, edition_name, edition_type,
      source_name, cover_image_url, release_month,
      original_retail_price, isbn, notes, submitter_email,
    } = body

    if (!book_title || !book_author || !edition_name || !edition_type || !source_name) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('edition_submission').insert({
      book_title: book_title.trim(),
      book_author: book_author.trim(),
      edition_name: edition_name.trim(),
      edition_type,
      source_name: source_name.trim(),
      cover_image_url: cover_image_url || null,
      release_month: release_month || null,
      original_retail_price: original_retail_price ?? null,
      isbn: isbn || null,
      notes: notes || null,
      submitted_by: user?.id ?? null,
      submitter_email: user?.email ?? submitter_email ?? null,
      status: 'pending',
    })

    if (error) {
      console.error('Submission insert error:', error)
      return NextResponse.json({ error: 'Failed to save submission.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Submit route error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
