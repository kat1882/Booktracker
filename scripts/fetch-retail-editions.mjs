/**
 * fetch-retail-editions.mjs
 * Fetches individual BAS special-edition pages using fetch() (no firecrawl needed)
 * and saves them to the .firecrawl directory.
 *
 * Run: node scripts/fetch-retail-editions.mjs
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs'

const FIRECRAWL_DIR = 'C:/Users/ldavi/OneDrive/Desktop/.claude/.firecrawl'
const BASE_URL = 'https://www.booksandspreadsheets.com/special-editions/'

// Read the URL list
const urls = readFileSync(`${FIRECRAWL_DIR}/all-edition-urls.txt`, 'utf8')
  .trim().split('\n')
  .filter(Boolean)
  .filter(u => u.includes('special-editions/'))

// Only the release-page retail editions (not sub-box ones we already have)
const subBoxBrands = ['illumicrate','fairyloot','owlcrate','thebookishbox','litjoy',
  'once-upon','afterlight','starbright','faecrate','fae-crate','fabled','foxglove',
  'butterfly-book-club','bookish-spice','books-for-days','cover-to-cover','coveted-cover',
  'dazzling','bad-women-books','nocturnal-ink','lilac-library','lavish-library',
  'moonlight-book-box','rainbow-crate','red-flags','roses-thorns','page-wick',
  'litjoy','thebookishbox','locked-library','onyx','darkly-book-box','once-upon-a-book-club',
  'little-wicked','la-petite-mort','sinful-obsessions','smut-sip','twisted-fantasy',
  'venom-and-lace','venus-volumes','wicked-tales','yo-leo-sola','amor-eterno',
  'romance-cartel','aurora-crate','arcane-society','after-dark','allurial','belle',
  'bewitched-pages','blush-book-box','book-in-a-box','chapter-55','corrupted-nights',
  'cover-snob','curious-king','dark-desires','dark-and-nerdy','dirty-diction',
  'dreamerwhale','endless-vines','eternal-embers','euphoric-lit','evernight',
  'fated-arcana','fated-pages','fated-mates','forbidden-wing','haunted-hearts',
  'inkstone-books','iridescent','knot-and-page','lunarya','mahogany-mail',
  'midnight-whispers','motley-chronicles','novel-grounds','page-wick','rainbow-after-dark',
  'romance-era','romance-me','ruined-by-fiction','satisfiction','sonny-book-box',
  'spiced-book-box','the-book-cove','the-love-club','the-love-story','final-score',
  'gold-leaf','grimoire-alchemy','ink-pages']

const retailUrls = urls.filter(u => {
  const slug = u.split('/special-editions/')[1]?.toLowerCase() || ''
  return !subBoxBrands.some(b => slug.includes(b))
})

console.log(`Total URLs: ${urls.length}`)
console.log(`Retail/publisher editions to fetch: ${retailUrls.length}`)

// Check which are already fetched
const existing = new Set(
  readdirSync(FIRECRAWL_DIR)
    .filter(f => f.includes('-special-editions-') && f.endsWith('.md'))
    .map(f => f.replace('booksandspreadsheets.com-special-editions-','').replace('.md',''))
)

const toFetch = retailUrls.filter(u => {
  const slug = u.split('/special-editions/')[1]
  return !existing.has(slug)
})

console.log(`Already fetched: ${existing.size}`)
console.log(`Fetching: ${toFetch.length}`)

// Fetch in parallel batches
const BATCH_SIZE = 8
const DELAY_MS = 500
let fetched = 0, failed = 0

async function fetchEditionPage(url) {
  const slug = url.split('/special-editions/')[1]
  const filename = `${FIRECRAWL_DIR}/booksandspreadsheets.com-special-editions-${slug}.md`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()

    // Extract key info from HTML
    // Title: look for og:title or h1
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/) ||
                       html.match(/<title>([^<]+)<\/title>/)

    // Simple text extraction - get main content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    writeFileSync(filename, text.slice(0, 5000)) // Save first 5000 chars
    return true
  } catch (e) {
    return false
  }
}

// Process in batches
for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
  const batch = toFetch.slice(i, i + BATCH_SIZE)
  const results = await Promise.all(batch.map(fetchEditionPage))
  fetched += results.filter(Boolean).length
  failed += results.filter(r => !r).length

  if (i % 40 === 0) {
    process.stdout.write(`\r  ${i + BATCH_SIZE}/${toFetch.length} processed (${fetched} ok, ${failed} failed)...`)
  }

  // Small delay between batches
  if (i + BATCH_SIZE < toFetch.length) {
    await new Promise(r => setTimeout(r, DELAY_MS))
  }
}

console.log(`\n\nDone: ${fetched} fetched, ${failed} failed`)
