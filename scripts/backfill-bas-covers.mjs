/**
 * Backfills missing cover_image on editions by re-parsing BAS markdown files.
 *
 * The seed script captured book slugs but not cover URLs. This script:
 *  1. Reads all .firecrawl/bas-*.md files
 *  2. Extracts bookSlug → coverUrl from the ###### BOOK section
 *  3. Strips Wix transform params to get clean image URL
 *  4. Finds editions in DB matching the book slug (via title/author)
 *  5. Updates cover_image where it's currently null
 *
 * Usage:
 *   node scripts/backfill-bas-covers.mjs          # preview
 *   node scripts/backfill-bas-covers.mjs --fix     # apply
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIX = process.argv.includes('--fix')

const supabase = createClient(
  'https://fubplguqhrsubaorfnqh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
)

/** Strip Wix CDN transform params — keep base media URL */
function cleanWixUrl(url) {
  // https://static.wixstatic.com/media/88deaf_XXX~mv2.jpg/v1/fill/... → strip from /v1/ onward
  return url.replace(/\/v1\/fill\/.*$/, '').replace(/\/v1\/crop\/.*$/, '')
}

/** Parse all bas-*.md files and return Map<bookSlug, coverUrl> */
function parseCoverMap() {
  const firecrawlDir = path.join(__dirname, '..', '.firecrawl')
  const files = fs.readdirSync(firecrawlDir).filter(f => f.startsWith('bas-') && f.endsWith('.md'))

  const coverMap = new Map() // bookSlug → coverUrl

  const bookImageRe = /!\[[^\]]*\]\((https:\/\/static\.wixstatic\.com\/media\/[^)]+)\)\]\(https:\/\/www\.booksandspreadsheets\.com\/books-1\/([^)]+)\)/

  for (const file of files) {
    const content = fs.readFileSync(path.join(firecrawlDir, file), 'utf-8')
    const lines = content.split('\n')
    let inBook = false

    for (const line of lines) {
      if (line.includes('###### BOOK')) { inBook = true; continue }
      if (line.startsWith('###### ')) { inBook = false; continue }

      if (inBook) {
        const m = bookImageRe.exec(line)
        if (m) {
          const coverUrl = cleanWixUrl(m[1])
          const bookSlug = m[2]
          if (!coverMap.has(bookSlug)) {
            coverMap.set(bookSlug, coverUrl)
          }
        }
      }
    }
  }

  return coverMap
}

function decodeSlug(slug) {
  try { return decodeURIComponent(slug).replace(/-/g, ' ').trim() } catch { return slug.replace(/-/g, ' ').trim() }
}

async function main() {
  console.log(`Mode: ${FIX ? 'FIX' : 'PREVIEW'}\n`)

  const coverMap = parseCoverMap()
  console.log(`Parsed ${coverMap.size} book slug → cover URL mappings\n`)

  // Fetch all editions with null cover_image (paginate to bypass 1000-row limit)
  let nullEditions = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data } = await supabase
      .from('edition')
      .select('id, edition_name, cover_image, book:book_id(id, title, author)')
      .is('cover_image', null)
      .range(offset, offset + PAGE - 1)
    if (!data || data.length === 0) break
    nullEditions = nullEditions.concat(data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  console.log(`Found ${nullEditions.length} editions with no cover image\n`)

  let updated = 0
  let notFound = 0

  for (const ed of nullEditions ?? []) {
    const title = (ed.book?.title ?? '').toLowerCase()
    const author = (ed.book?.author ?? '').toLowerCase()

    // Try to find a matching slug in the cover map
    let matchedUrl = null

    for (const [slug, url] of coverMap) {
      const decoded = decodeSlug(slug).toLowerCase()
      // Check if decoded slug contains the title (and optionally part of author)
      if (decoded.includes(title) && title.length > 3) {
        matchedUrl = url
        break
      }
    }

    if (!matchedUrl) {
      notFound++
      continue
    }

    console.log(`  "${ed.book?.title}" → ${matchedUrl.slice(0, 60)}...`)

    if (FIX) {
      const { error } = await supabase
        .from('edition')
        .update({ cover_image: matchedUrl })
        .eq('id', ed.id)

      if (error) console.log(`    ERROR: ${error.message}`)
      else updated++
    } else {
      updated++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Would update: ${updated} | No match: ${notFound}`)
}

main().catch(console.error)
