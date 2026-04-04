import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Popular book series & titles favoured by subscription boxes and collectors
const SEARCH_QUERIES = [
  // Sarah J. Maas
  'A Court of Thorns and Roses Sarah Maas',
  'A Court of Mist and Fury Sarah Maas',
  'A Court of Wings and Ruin Sarah Maas',
  'A Court of Silver Flames Sarah Maas',
  'Throne of Glass Sarah Maas',
  'Crown of Midnight Sarah Maas',
  'Heir of Fire Sarah Maas',
  'Queen of Shadows Sarah Maas',
  'Empire of Storms Sarah Maas',
  'Tower of Dawn Sarah Maas',
  'Kingdom of Ash Sarah Maas',
  'Crescent City House of Earth and Blood Sarah Maas',
  'Crescent City House of Sky and Breath Sarah Maas',
  'House of Flame and Shadow Sarah Maas',
  // Leigh Bardugo
  'Shadow and Bone Leigh Bardugo',
  'Siege and Storm Leigh Bardugo',
  'Ruin and Rising Leigh Bardugo',
  'Six of Crows Leigh Bardugo',
  'Crooked Kingdom Leigh Bardugo',
  'King of Scars Leigh Bardugo',
  'Rule of Wolves Leigh Bardugo',
  'The Language of Thorns Leigh Bardugo',
  'Ninth House Leigh Bardugo',
  'Hell Bent Leigh Bardugo',
  // Holly Black
  'The Cruel Prince Holly Black',
  'The Wicked King Holly Black',
  'The Queen of Nothing Holly Black',
  'The Stolen Heir Holly Black',
  // V.E. Schwab
  'A Darker Shade of Magic V.E. Schwab',
  'A Gathering of Shadows V.E. Schwab',
  'A Conjuring of Light V.E. Schwab',
  'The Invisible Life of Addie LaRue V.E. Schwab',
  'Vicious V.E. Schwab',
  'Vengeful V.E. Schwab',
  // Romantasy / Romance
  'From Blood and Ash Jennifer Armentrout',
  'A Kingdom of the Wicked Kerri Maniscalco',
  'Caraval Stephanie Garber',
  'Legendary Stephanie Garber',
  'Finale Stephanie Garber',
  'The Ballad of Never After Stephanie Garber',
  'Once Upon a Broken Heart Stephanie Garber',
  'The Love Hypothesis Ali Hazelwood',
  'Check Mate Ali Hazelwood',
  'Beach Read Emily Henry',
  'People We Meet on Vacation Emily Henry',
  'Book Lovers Emily Henry',
  'Happy Place Emily Henry',
  'Funny Story Emily Henry',
  // Fantasy / Epic
  'The Name of the Wind Patrick Rothfuss',
  'The Way of Kings Brandon Sanderson',
  'Mistborn Brandon Sanderson',
  'The Final Empire Brandon Sanderson',
  'The Priory of the Orange Tree Samantha Shannon',
  'The Poppy War R.F. Kuang',
  'Babel R.F. Kuang',
  'Yellowface R.F. Kuang',
  'The Jasmine Throne Tasha Suri',
  'The Oleander Sword Tasha Suri',
  'A Memory Called Empire Arkady Martine',
  // Rick Riordan
  'The Lightning Thief Rick Riordan',
  'The Sea of Monsters Rick Riordan',
  'The Titan\'s Curse Rick Riordan',
  'The Battle of the Labyrinth Rick Riordan',
  'The Last Olympian Rick Riordan',
  // More fantasy
  'The Hunger Games Suzanne Collins',
  'Catching Fire Suzanne Collins',
  'Mockingjay Suzanne Collins',
  'An Ember in the Ashes Sabaa Tahir',
  'A Torch Against the Night Sabaa Tahir',
  'Red Queen Victoria Aveyard',
  'Glass Sword Victoria Aveyard',
  'Strange the Dreamer Laini Taylor',
  'Muse of Nightmares Laini Taylor',
  'Daughter of Smoke and Bone Laini Taylor',
  'Days of Blood and Starlight Laini Taylor',
  'The Night Circus Erin Morgenstern',
  'The Starless Sea Erin Morgenstern',
  'Piranesi Susanna Clarke',
  'Jonathan Strange Mr Norrell Susanna Clarke',
  'The Atlas Six Olivie Blake',
  'The Atlas Paradox Olivie Blake',
  'The Atlas Complex Olivie Blake',
  'A Little Life Hanya Yanagihara',
  // Horror / Dark
  'Mexican Gothic Silvia Moreno-Garcia',
  'Carmilla J. Sheridan Le Fanu',
  'Dracula Bram Stoker',
  'Gideon the Ninth Tamsyn Muir',
  'Harrow the Ninth Tamsyn Muir',
  // Contemporary / Literary
  'The Seven Husbands of Evelyn Hugo Taylor Jenkins Reid',
  'Daisy Jones the Six Taylor Jenkins Reid',
  'Malibu Rising Taylor Jenkins Reid',
  'Carrie Soto is Back Taylor Jenkins Reid',
  // More YA
  'Children of Blood and Bone Tomi Adeyemi',
  'Children of Virtue and Vengeance Tomi Adeyemi',
  'An Ember in the Ashes Sabaa Tahir',
  'Warcross Marie Lu',
  'Internment Roshani Chokshi',
  'The Star-Touched Queen Roshani Chokshi',
  'Spin the Dawn Elizabeth Lim',
  'Descendant of the Crane Joan He',
]

interface OLResult {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  subject?: string[]
}

function pickGenre(subjects?: string[]): string | null {
  if (!subjects) return null
  const lower = subjects.map(s => s.toLowerCase())
  if (lower.some(s => s.includes('romance'))) return 'romance'
  if (lower.some(s => s.includes('fantasy'))) return 'fantasy'
  if (lower.some(s => s.includes('horror'))) return 'horror'
  if (lower.some(s => s.includes('science fiction'))) return 'sci-fi'
  if (lower.some(s => s.includes('mystery') || s.includes('thriller'))) return 'thriller'
  if (lower.some(s => s.includes('young adult'))) return 'ya'
  if (lower.some(s => s.includes('historical'))) return 'historical'
  return null
}

async function searchOL(query: string): Promise<OLResult | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=key,title,author_name,first_publish_year,cover_i,subject`
    )
    const data = await res.json()
    return data.docs?.[0] ?? null
  } catch { return null }
}

async function seed() {
  let inserted = 0
  let skipped = 0

  console.log(`Seeding ${SEARCH_QUERIES.length} books from Open Library...\n`)

  for (const query of SEARCH_QUERIES) {
    const result = await searchOL(query)
    if (!result) { console.log(`  ✗ Not found: ${query}`); skipped++; continue }

    const olId = result.key.replace('/works/', '')
    const author = result.author_name?.[0] ?? 'Unknown'
    const genre = pickGenre(result.subject)

    // Skip if already exists
    const { data: existing } = await supabase
      .from('book')
      .select('id')
      .eq('open_library_id', olId)
      .single()

    if (existing) { console.log(`  ~ Already exists: ${result.title}`); skipped++; continue }

    const { error } = await supabase.from('book').insert({
      title: result.title,
      author,
      genre,
      original_pub_date: result.first_publish_year ? `${result.first_publish_year}-01-01` : null,
      open_library_id: olId,
      cover_ol_id: result.cover_i?.toString() ?? null,
    })

    if (error) {
      // title conflict — update open_library_id if missing
      const { error: updateErr } = await supabase
        .from('book')
        .update({ open_library_id: olId, cover_ol_id: result.cover_i?.toString() ?? null })
        .eq('title', result.title)
        .is('open_library_id', null)
      if (!updateErr) { console.log(`  ↑ Updated OL ID: ${result.title}`); inserted++ }
      else { console.log(`  ✗ Error: ${result.title} — ${error.message}`); skipped++ }
      continue
    }

    console.log(`  ✓ ${result.title} by ${author}`)
    inserted++

    // Small delay to avoid rate limiting Open Library
    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\nDone. ${inserted} books added/updated, ${skipped} skipped.`)
}

seed().catch(console.error)
