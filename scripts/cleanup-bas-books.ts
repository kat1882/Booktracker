/**
 * Cleans up book records created from BAS slugs where the author name
 * was incorrectly embedded in the title (e.g. "Queen Of Myth And Monsters Scarlett St. Clair").
 *
 * Strategy:
 *  1. Read all book slugs from .firecrawl/bas-*.md files
 *  2. For each slug, run an improved parser to get title + author
 *  3. Search DB for a book whose current title matches what the OLD bad parser would have created
 *  4. If found, update to the correct title + author
 *  5. For remaining Unknown-author books, try Open Library lookup
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Genuine stop words — articles, prepositions, conjunctions, pronouns
// These CANNOT be author surnames, so safe to use as split-blockers
const STOP_WORDS = new Set([
  'the','a','an','of','in','by','for','and','or','but','with','to','from',
  'at','on','is','are','was','had','has','my','your','his','her','its',
  'this','that','not','no','me','him','us','it','we','do','be','as','if',
  'so','all','up','out','our','who','what','how','where','when','their',
  'they','into','than','would','could','should','about','after','before',
])

function decodeSlug(slug: string): string {
  try { return decodeURIComponent(slug).replace(/-/g, ' ').trim() } catch {
    return slug.replace(/-/g, ' ').trim()
  }
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

/** Improved parser — uses minimal stop-word set, better handles single-initial patterns */
function parseSlugImproved(slug: string): { title: string; author: string | null } {
  let decoded = slug
  try { decoded = decodeURIComponent(slug) } catch {}
  decoded = decoded.replace(/-/g, ' ').trim()
  const words = decoded.split(' ').filter(Boolean)

  // 1. Initials pattern: look for x.y. or x. anywhere in the last 4 tokens
  for (let i = words.length - 1; i >= Math.max(0, words.length - 4); i--) {
    if (/^[a-z]\.[a-z]\.?$/i.test(words[i]) && words.length - i <= 4 && i >= 2) {
      const titlePart = words.slice(0, i).join(' ')
      const authorPart = words.slice(i).join(' ')
      return { title: toTitleCase(titlePart), author: toTitleCase(authorPart) }
    }
  }

  // 2. 2-word author: last 2 words that are purely alphabetical and not stop words
  if (words.length >= 4) {
    const last2 = words.slice(-2)
    const titlePart = words.slice(0, -2)
    const valid = last2.every(w =>
      !STOP_WORDS.has(w.toLowerCase()) &&
      /^[a-záéíóúüñ''-]+$/i.test(w) &&
      w.length >= 3
    )
    if (valid && titlePart.length >= 2) {
      return { title: toTitleCase(titlePart.join(' ')), author: toTitleCase(last2.join(' ')) }
    }
  }

  // 3. 3-word author (handles "Firstname St. Lastname" or "F. Firstname Lastname")
  if (words.length >= 5) {
    const last3 = words.slice(-3)
    const titlePart = words.slice(0, -3)
    // Accept if at least 2 of the 3 are name-like (allow "St." in middle)
    const nameLike = last3.filter(w =>
      !STOP_WORDS.has(w.toLowerCase()) &&
      /^[a-z.'-]+$/i.test(w) &&
      w.length >= 2
    )
    if (nameLike.length >= 2 && titlePart.length >= 2) {
      return { title: toTitleCase(titlePart.join(' ')), author: toTitleCase(last3.join(' ')) }
    }
  }

  return { title: toTitleCase(decoded), author: null }
}

/** What the ORIGINAL bad parser would have produced (replicate its logic) */
const OLD_TITLE_WORDS = new Set([
  'the','a','an','of','in','by','for','and','or','but','with','to','from',
  'at','on','is','are','my','your','his','her','its','this','that','not','no',
  'me','him','us','it','we','do','be','as','if','so','all','up','out','our',
  'who','what','how','where','when','their','they','into','than',
  'king','queen','prince','princess','lord','lady','knight','dragon',
  'wolf','crown','throne','shadow','darkness','light','fire','ice',
  'moon','sun','star','stars','blood','bone','bones','heart','hearts',
  'soul','souls','rose','thorn','sword','blade','night','dawn','dusk',
  'court','kingdom','empire','villain','villains','angel','demon',
  'ghost','witch','hunter','killer','master','monster','legend',
  'fate','destiny','power','magic','curse','spell','ruin','chaos',
  'storm','ember','embers','ash','ashes','dust','silver','gold',
  'black','white','red','blue','dark','wild','lost','broken','hidden',
  'secret','love','war','peace','death','life','hope','fear','sin',
  'grace','mercy','vengeance','honour','glory','wrath','fury',
  'hollow','void','abyss','eden','heaven','hell','game','hunt',
  'rise','fall','reign','rule','born','cold','bitter','sweet',
  'cruel','beautiful','wicked','vicious','savage','deadly',
])

function parseSlugOld(slug: string): { title: string; author: string | null } {
  let decoded = slug
  try { decoded = decodeURIComponent(slug) } catch {}
  decoded = decoded.replace(/-/g, ' ').trim()
  const words = decoded.split(' ').filter(Boolean)

  for (let i = words.length - 1; i >= Math.max(0, words.length - 4); i--) {
    if (/^[a-z]\.[a-z]\.?$/i.test(words[i]) && words.length - i <= 3 && i >= 2) {
      return {
        title: toTitleCase(words.slice(0, i).join(' ')),
        author: toTitleCase(words.slice(i).join(' ')),
      }
    }
  }

  if (words.length >= 4) {
    const last2 = words.slice(-2)
    const titlePart = words.slice(0, -2)
    const valid = last2.every(w =>
      !OLD_TITLE_WORDS.has(w.toLowerCase()) &&
      /^[a-z''-]+$/i.test(w) &&
      w.length >= 3
    )
    if (valid && titlePart.length >= 2) {
      return { title: toTitleCase(titlePart.join(' ')), author: toTitleCase(last2.join(' ')) }
    }
  }

  if (words.length >= 5) {
    const last3 = words.slice(-3)
    const titlePart = words.slice(0, -3)
    const allOk = last3.every(w =>
      !OLD_TITLE_WORDS.has(w.toLowerCase()) &&
      /^[a-z''-]+$/i.test(w) &&
      w.length >= 2
    )
    if (allOk && titlePart.length >= 2) {
      return { title: toTitleCase(titlePart.join(' ')), author: toTitleCase(last3.join(' ')) }
    }
  }

  return { title: toTitleCase(decoded), author: null }
}

/** Try Open Library search for a title, return best match */
async function lookupOpenLibrary(title: string): Promise<{ title: string; author: string } | null> {
  try {
    const encoded = encodeURIComponent(title)
    const res = await fetch(`https://openlibrary.org/search.json?title=${encoded}&limit=1&fields=title,author_name`)
    if (!res.ok) return null
    const data = await res.json() as any
    if (!data.docs?.length) return null
    const doc = data.docs[0]
    if (!doc.title) return null
    // Only accept if OL title roughly matches our candidate
    const olTitle = doc.title.toLowerCase().trim()
    const ourTitle = title.toLowerCase().trim()
    if (!olTitle.startsWith(ourTitle.slice(0, Math.min(20, ourTitle.length)))) return null
    return {
      title: doc.title,
      author: doc.author_name?.[0] ?? 'Unknown',
    }
  } catch {
    return null
  }
}

async function main() {
  // 1. Read all book slugs from .firecrawl markdown files
  const firecrawlDir = path.join(__dirname, '../.firecrawl')
  const allSlugs = new Set<string>()
  const bookSlugRe = /\]\(https:\/\/www\.booksandspreadsheets\.com\/books-1\/([^)]+)\)/g

  for (const file of fs.readdirSync(firecrawlDir)) {
    if (!file.startsWith('bas-') || !file.endsWith('.md')) continue
    const content = fs.readFileSync(path.join(firecrawlDir, file), 'utf-8')
    for (const m of content.matchAll(bookSlugRe)) allSlugs.add(m[1])
  }

  console.log(`Found ${allSlugs.size} unique book slugs\n`)

  // 2. For each slug, compare old vs new parse
  let fixed = 0
  let olFixed = 0
  let unchanged = 0
  let notFound = 0
  let errors = 0

  const slugList = [...allSlugs]

  for (const slug of slugList) {
    const oldParse = parseSlugOld(slug)
    const newParse = parseSlugImproved(slug)

    // Only process if the two parsers produce different results (new has author, old didn't)
    if (newParse.author && (!oldParse.author || oldParse.title !== newParse.title)) {
      // Look for a book in the DB with the OLD (wrong) title and author = "Unknown"
      const { data: books } = await supabase
        .from('book')
        .select('id, title, author')
        .ilike('title', oldParse.title)
        .eq('author', 'Unknown')
        .limit(1)

      if (books && books.length > 0) {
        const book = books[0]
        const { error } = await supabase
          .from('book')
          .update({ title: newParse.title, author: newParse.author })
          .eq('id', book.id)

        if (error) {
          // Duplicate title — book with new title already exists
          // Just update author on the existing wrong-titled book if possible
          errors++
        } else {
          console.log(`Fixed: "${book.title}" → "${newParse.title}" by ${newParse.author}`)
          fixed++
        }
      }
    }
  }

  // 3. Try Open Library for remaining Unknown-author BAS books
  console.log('\nLooking up remaining Unknown-author books via Open Library...')
  const { data: unknownBooks } = await supabase
    .from('book')
    .select('id, title, author')
    .eq('author', 'Unknown')
    .limit(500)  // process in batches

  if (unknownBooks) {
    for (const book of unknownBooks) {
      // Try trimming last 1-3 words and searching OL
      const words = book.title.split(' ')
      let found = false

      for (let trim = 0; trim <= 3 && !found; trim++) {
        const candidate = words.slice(0, words.length - trim).join(' ')
        if (candidate.length < 5) break

        const olResult = await lookupOpenLibrary(candidate)
        if (olResult && olResult.author !== 'Unknown') {
          const { error } = await supabase
            .from('book')
            .update({ title: olResult.title, author: olResult.author })
            .eq('id', book.id)

          if (!error) {
            console.log(`OL: "${book.title}" → "${olResult.title}" by ${olResult.author}`)
            olFixed++
            found = true
          }
        }

        // Rate limit OL queries
        await new Promise(r => setTimeout(r, 100))
      }
    }
  }

  console.log('\n=== Results ===')
  console.log(`Slug-parse fixed:    ${fixed}`)
  console.log(`Open Library fixed:  ${olFixed}`)
  console.log(`Errors/conflicts:    ${errors}`)
}

main().catch(console.error)
