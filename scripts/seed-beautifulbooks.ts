/**
 * Parses beautifulbooks.info monthly special edition pages and seeds the DB.
 * Handles both:
 *   - 2024+ monthly files: beautifulbooks.info-special-editions-YYYY-MM.md
 *   - 2021-2023 archive files: beautifulbooks-YYYY-archive.md / archived-special-2021.md
 *
 * Usage: npx tsx scripts/seed-beautifulbooks.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const DRY_RUN = process.argv.includes('--dry-run')

// Map retailer keywords in edition type strings to source names in our DB
// Order matters — longer/more specific keys must come before shorter substring keys
const RETAILER_SOURCE_MAP: Record<string, string> = {
  // Retailers
  'waterstones': 'Waterstones',
  "waterstone's": 'Waterstones',
  'ws exclusive': 'Waterstones',
  'barnes & noble': 'Barnes & Noble',
  'b&n': 'Barnes & Noble',
  'goldsboro': 'Goldsboro Books',
  'forbidden planet': 'Forbidden Planet',
  'folio society': 'Folio Society',
  'target': 'Target',
  'walmart': 'Walmart',
  'dymocks': 'Dymocks',
  'indigo exclusive': 'Indigo Exclusive',
  'broken binding': 'The Broken Binding',
  // Subscription boxes
  'owlcrate jr': 'OwlCrate Jr.',
  'owlcrate': 'OwlCrate',
  'fairyloot': 'FairyLoot',
  'fairy loot': 'FairyLoot',
  'illumicrate': 'Illumicrate',
  'litjoy': 'LitJoy Crate',
  'faecrate': 'FaeCrate',
  'fae crate': 'FaeCrate',
  'bookish box': 'The Bookish Box',
  'once upon a book club': 'Once Upon a Book Club',
}

interface ParsedEdition {
  title: string
  author: string
  releaseMonth: string  // e.g. "January 2024"
  editionType: string
  features: string
  sourceName: string | null
  fileName: string
}

function unescapeMarkdown(s: string): string {
  return s.replace(/\\([#[\]()!*_~`|])/g, '$1').trim()
}

function detectSource(editionType: string, features: string): string | null {
  const combined = (editionType + ' ' + features).toLowerCase()
  for (const [keyword, name] of Object.entries(RETAILER_SOURCE_MAP)) {
    if (combined.includes(keyword)) return name
  }
  return null
}

function extractMonth(fileName: string): string {
  // beautifulbooks.info-special-editions-2024-01.md
  const m = fileName.match(/(\d{4})-(\d{2})/)
  if (!m) return ''
  const year = m[1]
  const month = parseInt(m[2])
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[month - 1]} ${year}`
}

// ── 2024+ monthly file parser ─────────────────────────────────────────────────

function parseMarkdownFile(filePath: string): ParsedEdition[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath)
  const releaseMonth = extractMonth(fileName)
  const editions: ParsedEdition[] = []

  // Split on h5 headings which mark each book entry: ##### Title - Author
  const sections = content.split(/^##### /m)

  for (const section of sections.slice(1)) {
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue

    // First line: "Title - Author" or "Title: Subtitle - Author"
    const titleLine = lines[0]
    const dashIdx = titleLine.lastIndexOf(' - ')
    if (dashIdx === -1) continue

    const title = titleLine.slice(0, dashIdx).trim()
    const author = titleLine.slice(dashIdx + 3).trim()

    if (!title || !author) continue

    // Find edition type lines: "**Edition Type ._** description"
    const editionLines = lines.filter(l => l.startsWith('**') && l.includes('_._**'))

    for (const edLine of editionLines) {
      const typeMatch = edLine.match(/\*\*([^*]+)\s*_\._\*\*\s*(.*)/)
      if (!typeMatch) continue

      const editionType = typeMatch[1].trim()
      const features = typeMatch[2].replace(/[[\]()]/g, '').trim()
      const sourceName = detectSource(editionType, features)

      editions.push({
        title,
        author,
        releaseMonth,
        editionType,
        features,
        sourceName,
        fileName,
      })
    }
  }

  return editions
}

// ── 2021-2023 archive file parser ─────────────────────────────────────────────

const MONTHS_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i

function cleanBold(s: string): string {
  return s.replace(/\*+/g, '').trim()
}

function cleanAuthor(s: string): string {
  // Strip "illustrated by ..." and keep primary author
  return s.replace(/\s*,\s*illustrated by.*/i, '').replace(/\*+/g, '').trim()
}

function cleanTitle(s: string): string {
  // Remove series info in parens and trailing ** markdown
  return s.replace(/\s*\([^)]+\)\s*$/, '').replace(/\*+/g, '').trim()
}

function parseTitleLine(line: string): { title: string; author: string } | null {
  const cleaned = cleanBold(line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim())

  // "Title by Author" — most common in 2022/2023
  const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i)
  if (byMatch) {
    return { title: cleanTitle(byMatch[1]), author: cleanAuthor(byMatch[2]) }
  }

  // "Title – Author" or "Title - Author" (em-dash or regular dash)
  const dashMatch = cleaned.match(/^(.+?)\s+[–—]\s+(.+)$/) ||
                    cleaned.match(/^(.+?)\s+-\s+(.+)$/)
  if (dashMatch) {
    return { title: cleanTitle(dashMatch[1]), author: cleanAuthor(dashMatch[2]) }
  }

  return null
}

function parseEditionTypeLine(line: string): { editionType: string; features: string } | null {
  // Matches: **_Type:_** desc  OR  **_Type_**: desc  OR  **_Type_** desc
  const m = line.match(/\*\*_([^_*]+?)_?\*\*\s*:?\s*(.*)/) ||
             // [**Source**](url): description  — linked subscription box format
             line.match(/\[\*\*([^*]+?)\*\*\]\([^)]*\):\s+(.+)/) ||
             // **Source**: description  — plain bold colon format
             line.match(/\*\*([^*]+?)\*\*:\s+(.+)/)
  if (!m) return null
  const editionType = m[1].replace(/:$/, '').trim()
  const features = m[2].replace(/[[\]()]/g, '').trim()
  return { editionType, features }
}

function parseOldArchiveFile(filePath: string): ParsedEdition[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath)
  const editions: ParsedEdition[] = []

  // Split on ##### headings (book entries)
  const sections = content.split(/^#####\s+/m)
  let currentMonth = ''

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    // Scan for month headings (## or ####) that appear BEFORE the next ##### boundary
    // They appear in the section text before the book block starts
    const monthLines = section.match(/^#{1,4}\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/mi)
    if (monthLines) {
      currentMonth = monthLines[1].trim()
    }

    if (!currentMonth) continue

    const lines = section.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue

    // First line should be "**Title** by Author" or similar
    const firstLine = lines[0]
    if (!firstLine || firstLine.startsWith('#') || firstLine.startsWith('!') || firstLine.startsWith('[') || firstLine.startsWith('➤') || firstLine.startsWith('Jump')) continue

    const parsed = parseTitleLine(firstLine)
    if (!parsed || !parsed.title || !parsed.author) continue

    // Find all edition type lines in this block
    for (const line of lines.slice(1)) {
      // Stop if we hit another heading level
      if (/^#{1,4}\s+/.test(line)) {
        // But update month if found
        const mMatch = line.match(/^#{1,4}\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i)
        if (mMatch) currentMonth = mMatch[1].trim()
        break
      }

      const edParsed = parseEditionTypeLine(line)
      if (!edParsed) continue

      const { editionType, features } = edParsed
      const sourceName = detectSource(editionType, features)

      editions.push({
        title: parsed.title,
        author: parsed.author,
        releaseMonth: currentMonth,
        editionType,
        features,
        sourceName,
        fileName,
      })
    }
  }

  return editions
}

// ── DB seeding ────────────────────────────────────────────────────────────────

async function run() {
  const firecrawlDir = path.join(process.cwd(), '.firecrawl')

  // 2024+ monthly files
  const monthlyFiles = fs.readdirSync(firecrawlDir)
    .filter(f => f.match(/beautifulbooks\.info-special-editions-\d{4}-\d{2}\.md/))
    .sort()

  // Old archive files (2021-2023)
  const archiveFiles = [
    'beautifulbooks-2022-archive.md',
    'beautifulbooks-2023-archive.md',
    'beautifulbooks.info-finding-fancy-books-special-editions-archived-special-2021.md',
  ].filter(f => fs.existsSync(path.join(firecrawlDir, f)))

  console.log(`Found ${monthlyFiles.length} monthly files, ${archiveFiles.length} archive files\n`)

  const allEditions: ParsedEdition[] = []

  // Parse monthly files
  for (const file of monthlyFiles) {
    const parsed = parseMarkdownFile(path.join(firecrawlDir, file))
    console.log(`  [monthly] ${file}: ${parsed.length} editions`)
    allEditions.push(...parsed)
  }

  // Parse archive files
  for (const file of archiveFiles) {
    const parsed = parseOldArchiveFile(path.join(firecrawlDir, file))
    console.log(`  [archive] ${file}: ${parsed.length} editions`)
    allEditions.push(...parsed)
  }

  console.log(`\nTotal parsed: ${allEditions.length} edition entries`)

  // Only keep editions with a known source (retailer exclusives)
  const withSource = allEditions.filter(e => e.sourceName)
  const bySource: Record<string, number> = {}
  for (const e of withSource) {
    bySource[e.sourceName!] = (bySource[e.sourceName!] || 0) + 1
  }
  console.log('\nEditions with known source:')
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`)
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: showing first 15 with source ---')
    for (const e of withSource.slice(0, 15)) {
      console.log(`  [${e.sourceName}] "${e.title}" by ${e.author} — ${e.releaseMonth} — ${e.editionType}`)
    }
    return
  }

  // Load source IDs
  const { data: sources } = await supabase.from('source').select('id, name')
  const sourceMap = Object.fromEntries((sources ?? []).map(s => [s.name, s.id]))

  let inserted = 0, skipped = 0, errors = 0

  for (const ed of withSource) {
    const sourceId = sourceMap[ed.sourceName!]
    if (!sourceId) {
      console.log(`  ✗ Source not in DB: ${ed.sourceName}`)
      errors++
      continue
    }

    try {
      const title = unescapeMarkdown(ed.title)
      const author = unescapeMarkdown(ed.author)

      // Find or create book
      let bookId: string
      const { data: existingBook } = await supabase
        .from('book')
        .select('id')
        .ilike('title', title)
        .maybeSingle()

      if (existingBook) {
        bookId = existingBook.id
      } else {
        const { data: newBook, error: bookErr } = await supabase
          .from('book')
          .insert({ title, author })
          .select('id')
          .single()

        if (bookErr || !newBook) {
          // Retry with case-insensitive lookup in case of duplicate title constraint
          const { data: retry } = await supabase.from('book').select('id').ilike('title', title).maybeSingle()
          if (retry) { bookId = retry.id }
          else {
            console.error(`  ✗ Book insert failed for "${title}" by ${author}:`, bookErr?.message)
            errors++; continue
          }
        } else {
          bookId = newBook.id
        }
      }

      // Check if edition already exists for this source + book
      const { data: existingEd } = await supabase
        .from('edition')
        .select('id')
        .eq('source_id', sourceId)
        .eq('book_id', bookId)
        .maybeSingle()

      if (existingEd) { skipped++; continue }

      const editionName = `${title} (${ed.editionType})`
      const coverImage = `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`

      const { error: edErr } = await supabase.from('edition').insert({
        book_id: bookId,
        source_id: sourceId,
        edition_name: editionName,
        edition_type: 'collectors',
        release_month: ed.releaseMonth,
        notes: ed.features || null,
        cover_image: coverImage,
      })

      if (edErr) {
        console.error(`  ✗ "${ed.title}":`, edErr.message)
        errors++
      } else {
        console.log(`  ✓ [${ed.sourceName}] ${ed.title} — ${ed.releaseMonth}`)
        inserted++
      }

      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.error(`  ✗ Error for "${ed.title}":`, err)
      errors++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped, ${errors} errors`)
}

run().catch(console.error)
