/**
 * Repairs book title/author data imported from booksandspreadsheets.com.
 *
 * Problems to fix:
 *  1. Author embedded in title  ("A Haven Of Brimstone And Darkness Lucinda Dark" / Unknown)
 *  2. Title truncated, rest in author ("The Boy Who" / "Loved Wickedc.p. Harris")
 *  3. Pure Unknown authors where Google Books knows the answer
 *
 * Strategy:
 *  1. Read all .firecrawl/bas-*.md files → collect every /books-1/{slug} link
 *  2. For each slug, parse it (improved algorithm: try splitting last 1-3 words as author)
 *  3. Verify via Google Books — pick the split that yields the best match
 *  4. Find matching book record in DB by fuzzy-title search, update if we got better data
 *
 * Usage:
 *   node scripts/fix-bas-book-data.mjs              # preview only
 *   node scripts/fix-bas-book-data.mjs --fix        # apply changes
 *   node scripts/fix-bas-book-data.mjs --fix --limit=100
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ARGS = process.argv.slice(2)
const FIX = ARGS.includes('--fix')
const LIMIT = (() => { const a = ARGS.find(a => a.startsWith('--limit=')); return a ? parseInt(a.slice(8)) : 9999 })()
const DELAY_MS = 200

// Only TRUE stop words (articles, prepositions, conjunctions) — NOT thematic words
// because "Dark", "Rose", "Stone" are valid author surnames
const STOP_WORDS = new Set([
  'the','a','an','of','in','by','for','and','or','but','with','to','from',
  'at','on','is','are','was','had','has','my','your','his','her','its',
  'this','that','not','no','me','him','us','it','we','do','be','as','if',
  'so','all','up','out','our','who','what','how','where','when','their',
  'they','into','than','would','could','should','about','after','before',
])

function toTitleCase(s) {
  return s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ')
}

function slugToWords(slug) {
  return decodeURIComponent(slug).replace(/-/g, ' ').trim()
}

function looksLikeNameWord(w) {
  if (!w || w.length < 2) return false
  const clean = w.replace(/['.]/g, '')
  // Allow initials like "c.p." or "j.r."
  if (/^[a-z]\.[a-z]\.?$/i.test(w)) return true
  return /^[a-zA-Z'-]+$/.test(clean) && !STOP_WORDS.has(w.toLowerCase())
}

/** Try splitting slug into (title, author) by peeling off last N words */
function parseCandidates(slug) {
  const text = slugToWords(slug)
  const words = text.split(' ').filter(Boolean)
  const candidates = []

  // Candidate 0: whole slug is the title (no author)
  candidates.push({ title: toTitleCase(text), author: null, split: 0 })

  for (let n = 1; n <= Math.min(3, words.length - 1); n++) {
    const authorWords = words.slice(-n)
    const titleWords = words.slice(0, -n)
    // Allow 1-word titles only if we're peeling off a 2-word author (more confident)
    if (titleWords.length < 1) continue
    if (titleWords.length === 1 && n < 2) continue
    // All author words must look like name words
    if (!authorWords.every(looksLikeNameWord)) continue
    const authorStr = authorWords.join(' ')
    // Reject if author is all stop words or very short
    if (authorStr.length < 4) continue
    candidates.push({
      title: toTitleCase(titleWords.join(' ')),
      author: toTitleCase(authorStr),
      split: n,
    })
  }

  return candidates
}

async function googleBooksSearch(query) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3&langRestrict=en`
    const res = await fetch(url, { headers: { 'User-Agent': 'Shelfworth/1.0' } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []).map(item => ({
      title: item.volumeInfo?.title ?? '',
      author: item.volumeInfo?.authors?.[0] ?? '',
      subtitle: item.volumeInfo?.subtitle ?? '',
    }))
  } catch { return [] }
}

function normalize(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

function titleSimilarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) return 0.9
  // Word overlap
  const wa = new Set(na.split(' '))
  const wb = new Set(nb.split(' '))
  const intersection = [...wa].filter(w => wb.has(w)).length
  const union = new Set([...wa, ...wb]).size
  return intersection / union
}

async function findBestMatch(candidates) {
  // Try each candidate against Google Books, return best (title, author)
  let best = null
  let bestScore = 0

  for (const cand of candidates) {
    const query = cand.author
      ? `intitle:"${cand.title}" inauthor:"${cand.author}"`
      : `intitle:"${cand.title}"`

    const results = await googleBooksSearch(query)
    await sleep(DELAY_MS)

    for (const r of results) {
      if (!r.title) continue
      const score = titleSimilarity(cand.title, r.title)
      if (score > bestScore && score >= 0.6) {
        bestScore = score
        best = { title: r.title, author: r.author || cand.author, score, cand }
      }
    }

    // If no author candidate, also try broader search
    if (!cand.author && !best) {
      const broad = await googleBooksSearch(`"${cand.title}"`)
      await sleep(DELAY_MS)
      for (const r of broad) {
        if (!r.title) continue
        const score = titleSimilarity(cand.title, r.title)
        if (score > bestScore && score >= 0.6) {
          bestScore = score
          best = { title: r.title, author: r.author || null, score, cand }
        }
      }
    }
  }

  return best
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function findBookInDB(slug) {
  const words = slugToWords(slug)
  const titleCase = toTitleCase(words)

  // Try: full slug, trim 1-3 words from end (handles author appended to title in slug)
  const wordArr = titleCase.split(' ')
  const attempts = []
  for (let trim = 0; trim <= 3; trim++) {
    const t = wordArr.slice(0, wordArr.length - trim).join(' ')
    if (t.split(' ').length >= 2) attempts.push(t)
  }

  for (const attempt of attempts) {
    const { data } = await supabase
      .from('book')
      .select('id, title, author')
      .ilike('title', attempt)
      .limit(3)
    if (data && data.length > 0) return data
  }

  // Fuzzy: first 4 words
  const first4 = titleCase.split(' ').slice(0, 4).join(' ')
  if (first4.split(' ').length >= 3) {
    const { data } = await supabase
      .from('book')
      .select('id, title, author')
      .ilike('title', `${first4}%`)
      .limit(5)
    if (data && data.length > 0) return data
  }

  return []
}

async function main() {
  console.log(`Mode: ${FIX ? 'FIX' : 'PREVIEW'}\n`)

  // 1. Collect all unique book slugs from firecrawl files
  const firecrawlDir = path.join(__dirname, '../.firecrawl')
  const bookSlugRe = /\/books-1\/([^)"\s]+)/g
  const allSlugs = new Set()

  for (const file of fs.readdirSync(firecrawlDir)) {
    if (!file.startsWith('bas-') || !file.endsWith('.md')) continue
    const content = fs.readFileSync(path.join(firecrawlDir, file), 'utf-8')
    for (const m of content.matchAll(bookSlugRe)) {
      const slug = m[1].split('?')[0].replace(/\/$/, '')
      allSlugs.add(slug)
    }
  }

  console.log(`Collected ${allSlugs.size} unique book slugs\n`)

  const slugList = [...allSlugs].slice(0, LIMIT)

  let fixed = 0, skipped = 0, noMatch = 0, noGBooks = 0, errors = 0

  for (let i = 0; i < slugList.length; i++) {
    const slug = slugList[i]
    const words = slugToWords(slug)
    process.stdout.write(`[${i + 1}/${slugList.length}] "${words.slice(0, 50)}"… `)

    // 2. Parse candidates
    const candidates = parseCandidates(slug)

    // 3. Find current DB record(s)
    const dbBooks = await findBookInDB(slug)
    if (!dbBooks || dbBooks.length === 0) {
      console.log('not in DB')
      noMatch++
      continue
    }

    // Only process books that need fixing
    const needsFix = dbBooks.filter(b =>
      b.author === 'Unknown' ||
      b.author === 'unknown' ||
      // Author contains likely concatenated text (lowercase after uppercase, mid-word)
      /[A-Z][a-z]+[a-z]{2}[A-Z]/.test(b.author) ||
      // Author with initials jammed together
      /[a-z]\.[a-zA-Z]/.test(b.author)
    )

    if (needsFix.length === 0) {
      console.log(`ok (${dbBooks[0].author})`)
      skipped++
      continue
    }

    // 4. Look up on Google Books
    let match = await findBestMatch(candidates)

    // Fallback for indie books not on Google Books:
    // If author=Unknown and slug has a clean 2-word name at the end, trust the parse
    if (!match) {
      const nameSplit = candidates.find(c => c.split === 2 && c.author)
      if (nameSplit && needsFix.some(b => b.author === 'Unknown' || b.author === 'unknown')) {
        match = { title: nameSplit.title, author: nameSplit.author, score: 0.5, cand: nameSplit }
        console.log(`\n  (fallback: using slug parse, no GBooks)`)
      }
    }

    if (!match) {
      console.log(`no GBooks match`)
      noGBooks++
      continue
    }

    const { title, author, score } = match
    const book = needsFix[0]

    console.log(`\n  DB:     "${book.title}" / "${book.author}"`)
    console.log(`  Fix:    "${title}" / "${author ?? 'Unknown'}" (score: ${score.toFixed(2)})`)

    if (!FIX) {
      fixed++
      continue
    }

    // 5. Update the book record
    const { error } = await supabase
      .from('book')
      .update({
        title,
        author: author || book.author,
      })
      .eq('id', book.id)

    if (error) {
      console.log(`  ERROR: ${error.message}`)
      errors++
    } else {
      console.log(`  Updated.`)
      fixed++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Fixed: ${fixed} | Already OK: ${skipped} | Not in DB: ${noMatch} | No GBooks: ${noGBooks} | Errors: ${errors}`)
}

main().catch(console.error)
