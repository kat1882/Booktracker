import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const ADMIN_USER_ID = 'd7e5e026-425b-4824-85a5-88d3412b95d3'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { action, rejection_reason } = await req.json()

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Fetch the submission
  const { data: sub, error: fetchErr } = await supabase
    .from('edition_submission')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !sub) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (action === 'reject') {
    await supabase
      .from('edition_submission')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason ?? null,
      })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  }

  // APPROVE: find or create book, then create edition

  // 1. Find or create source
  let sourceId: string | null = null
  const { data: existingSource } = await supabase
    .from('source')
    .select('id')
    .ilike('name', sub.source_name)
    .single()

  if (existingSource) {
    sourceId = existingSource.id
  } else {
    const { data: newSource } = await supabase
      .from('source')
      .insert({ name: sub.source_name })
      .select('id')
      .single()
    sourceId = newSource?.id ?? null
  }

  // 2. Find or create book
  let bookId: string | null = null
  const { data: existingBook } = await supabase
    .from('book')
    .select('id')
    .ilike('title', sub.book_title)
    .ilike('author', sub.book_author)
    .single()

  if (existingBook) {
    bookId = existingBook.id
  } else {
    // Try title-only match (author might differ in formatting)
    const { data: titleMatch } = await supabase
      .from('book')
      .select('id, author')
      .ilike('title', sub.book_title)
      .limit(1)
      .single()

    if (titleMatch) {
      bookId = titleMatch.id
    } else {
      // Create new book record
      const { data: newBook } = await supabase
        .from('book')
        .insert({
          title: sub.book_title,
          author: sub.book_author,
        })
        .select('id')
        .single()
      bookId = newBook?.id ?? null
    }
  }

  if (!bookId) {
    return NextResponse.json({ error: 'Failed to resolve book record' }, { status: 500 })
  }

  // 3. Create edition
  const { data: newEdition, error: editionErr } = await supabase
    .from('edition')
    .insert({
      book_id: bookId,
      source_id: sourceId,
      edition_name: sub.edition_name,
      edition_type: sub.edition_type,
      cover_image: sub.cover_image_url ?? null,
      release_month: sub.release_month ?? null,
      original_retail_price: sub.original_retail_price ?? null,
      isbn: sub.isbn ?? null,
      notes: sub.notes ?? null,
    })
    .select('id')
    .single()

  if (editionErr) {
    console.error('Edition insert error:', editionErr)
    return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 })
  }

  // 4. Mark submission approved
  await supabase
    .from('edition_submission')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      edition_id: newEdition.id,
    })
    .eq('id', id)

  return NextResponse.json({ ok: true, edition_id: newEdition.id })
}
