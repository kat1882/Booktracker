/**
 * Seed editions from BooksAndSpreadsheets.com monthly pages
 *
 * Parses scraped markdown files in .firecrawl/bas-*25.md
 * Matches book slugs against existing DB books (progressive title trimming)
 * Adds editions for matched books, skips unknown books
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fubplguqhrsubaorfnqh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hHTAapcM7aPrA4MqfrMCbw_dk-amEF5'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Map BAS company slugs → source info
// Multiple slugs can map to the same source name (sub-boxes of same company)
const COMPANY_MAP: Record<string, { name: string; type: string; website?: string }> = {
  // Already in DB
  'fairyloot-adult':           { name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com' },
  'fairyloot-romantasy':       { name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com' },
  'fairyloot-ya':              { name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com' },
  'fairyloot-epic-fantasy':    { name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com' },
  'owlcrate-adult':            { name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com' },
  'owlcrate-romance':          { name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com' },
  'owlcrate-romantasy':        { name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com' },
  'owlcrate-horror':           { name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com' },
  'owlcrate-sci-fi':           { name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com' },
  'owlcrate-ya':               { name: 'OwlCrate Jr.', type: 'subscription_box', website: 'https://www.owlcrate.com/owlcrate-jr' },
  'moonlight-book-box':        { name: 'Moonlight Book Box', type: 'subscription_box', website: 'https://moonlightbookbox.com' },
  'locked-library':            { name: 'The Locked Library', type: 'subscription_box', website: 'https://www.thelockedlibrary.com' },
  'litjoy':                    { name: 'LitJoy Crate', type: 'subscription_box', website: 'https://litjoycrate.com' },
  'thebookishbox':             { name: 'The Bookish Box', type: 'subscription_box', website: 'https://www.thebookishbox.com' },
  'illumicrate':               { name: 'Illumicrate', type: 'subscription_box', website: 'https://illumicrate.com' },
  'goldsboro-premier':         { name: 'Goldsboro Books', type: 'retailer', website: 'https://www.goldsborobooks.com' },
  'goldsboro-crime-collective':{ name: 'Goldsboro Books', type: 'retailer', website: 'https://www.goldsborobooks.com' },
  'goldsboro-gsff':            { name: 'Goldsboro Books', type: 'retailer', website: 'https://www.goldsborobooks.com' },
  'faecrate-ya':               { name: 'FaeCrate', type: 'subscription_box', website: 'https://www.faecrate.com' },
  // New sources
  'afterlight-romance':                    { name: 'Afterlight Romance', type: 'subscription_box' },
  'arcane-society':                        { name: 'Arcane Society', type: 'subscription_box' },
  'autumn-midnights':                      { name: 'Autumn Midnights', type: 'subscription_box' },
  'baddies-book-box':                      { name: 'Baddies Book Box', type: 'subscription_box' },
  'belle':                                 { name: 'Belle Book Box', type: 'subscription_box' },
  'blackout-romance':                      { name: 'Blackout Romance', type: 'subscription_box' },
  'book-in-a-box':                         { name: 'Book in a Box', type: 'subscription_box' },
  'bookish-%26-spice-dark-romance':        { name: 'Bookish & Spice', type: 'subscription_box' },
  'bookish-%26-spice-romantasy':           { name: 'Bookish & Spice', type: 'subscription_box' },
  'broken-binding-fantasy':               { name: 'The Broken Binding', type: 'retailer', website: 'https://www.thebrokenbinding.co.uk' },
  'broken-binding-sci-fi':               { name: 'The Broken Binding', type: 'retailer', website: 'https://www.thebrokenbinding.co.uk' },
  'butterfly-book-club-fantasy-fated-flames': { name: 'Butterfly Book Club', type: 'subscription_box' },
  'butterfly-book-club-sinful-souls':      { name: 'Butterfly Book Club', type: 'subscription_box' },
  'corrupted-nights':                      { name: 'Corrupted Nights', type: 'subscription_box' },
  'cover-snob':                            { name: 'Cover Snob', type: 'subscription_box' },
  'cover-to-cover-red-flags':             { name: 'Cover to Cover', type: 'subscription_box' },
  'cover-to-cover-white-knights':         { name: 'Cover to Cover', type: 'subscription_box' },
  'coveted-cover-aetheria':               { name: 'Coveted Cover', type: 'subscription_box' },
  'coveted-cover-nocturna':               { name: 'Coveted Cover Nocturna', type: 'subscription_box' },
  'dark-%26-quirky':                       { name: 'Dark & Quirky', type: 'subscription_box' },
  'dark-and-nerdy':                        { name: 'Dark and Nerdy', type: 'subscription_box' },
  'dark-and-sinful':                       { name: 'Dark and Sinful', type: 'subscription_box' },
  'dark-desires':                          { name: 'Dark Desires', type: 'subscription_box' },
  'darkly-book-box':                       { name: 'The Darkly Box', type: 'subscription_box' },
  'dazzling-adult-quarterly':              { name: 'Dazzling', type: 'subscription_box' },
  'dazzling-ya-monthly':                   { name: 'Dazzling', type: 'subscription_box' },
  'eternal-embers':                        { name: 'Eternal Embers', type: 'subscription_box' },
  'evernight':                             { name: 'Evernight', type: 'subscription_box' },
  'fabled-midnight':                       { name: 'Fabled', type: 'subscription_box' },
  'fabled-moonlight':                      { name: 'Fabled', type: 'subscription_box' },
  'fabled-nights':                         { name: 'Fabled', type: 'subscription_box' },
  'fabled-twilight':                       { name: 'Fabled', type: 'subscription_box' },
  'fated-mates':                           { name: 'Fated Mates', type: 'subscription_box' },
  'forbidden-wing':                        { name: 'Forbidden Wing', type: 'subscription_box' },
  'fox-%26-wit':                           { name: 'Fox & Wit', type: 'subscription_box' },
  'foxglove-romance':                      { name: 'Foxglove Romance', type: 'subscription_box' },
  'gold-leaf':                             { name: 'Gold Leaf', type: 'subscription_box' },
  'grimoire-%26-alchemy':                  { name: 'Grimoire & Alchemy', type: 'subscription_box' },
  'inkstone-books':                        { name: 'Inkstone Books', type: 'subscription_box' },
  'la-petite-mort-book-box':              { name: 'La Petite Mort Book Box', type: 'subscription_box' },
  'lilac-library-romantasy':              { name: 'Lilac Library', type: 'subscription_box' },
  'little-wicked':                         { name: 'Little Wicked', type: 'subscription_box' },
  'love-club-book-shop':                  { name: 'Love Club Book Shop', type: 'subscription_box' },
  "marley's-must-reads":                   { name: "Marley's Must Reads", type: 'subscription_box' },
  'midnight-bookshelf':                    { name: 'Midnight Bookshelf', type: 'subscription_box' },
  'motley-chronicles':                     { name: 'Motley Chronicles', type: 'subscription_box' },
  'mystic-box':                            { name: 'Mystic Box', type: 'subscription_box' },
  'nocturnal-ink-provocative-pages':       { name: 'Nocturnal Ink', type: 'subscription_box' },
  'nocturnal-ink-twisted-desires':         { name: 'Nocturnal Ink', type: 'subscription_box' },
  'onyx':                                  { name: 'Onyx Book Box', type: 'subscription_box' },
  'page-%26-wick':                         { name: 'Page & Wick', type: 'subscription_box' },
  'pretty-little-words-novel-noir-luxe-book-box': { name: 'Pretty Little Words', type: 'subscription_box' },
  'probably-smut':                         { name: 'Probably Smut', type: 'subscription_box' },
  'rainbow-after-dark':                    { name: 'Rainbow After Dark', type: 'subscription_box' },
  'rainbow-crate':                         { name: 'Rainbow Crate', type: 'subscription_box' },
  'renegade-romance':                      { name: 'Renegade Romance', type: 'subscription_box' },
  'romance-cartel-enchantasy':             { name: 'Romance Cartel', type: 'subscription_box' },
  'romance-cartel-his-obsession':          { name: 'Romance Cartel', type: 'subscription_box' },
  'romance-cartel-literati':               { name: 'Romance Cartel', type: 'subscription_box' },
  'satisfiction':                          { name: 'Satisfiction', type: 'subscription_box' },
  'sinful-obsessions':                     { name: 'Sinful Obsessions', type: 'subscription_box' },
  'smut-%26-sip':                          { name: 'Smut & Sip', type: 'subscription_box' },
  'starbright':                            { name: 'Starbright', type: 'subscription_box' },
  'the-book-cove':                         { name: 'The Book Cove', type: 'subscription_box' },
  'the-love-story-society':               { name: 'The Love Story Society', type: 'subscription_box' },
  'twisted-fantasy':                       { name: 'Twisted Fantasy', type: 'subscription_box' },
  'twisted-horror-erotica':               { name: 'Twisted Horror Erotica', type: 'subscription_box' },
  'wicked-tales':                          { name: 'Wicked Tales', type: 'subscription_box' },
  'yo-leo-sola-book-box':                 { name: 'Yo Leo Sola Book Box', type: 'subscription_box' },
  // Additional slugs found in pre-order/release pages
  // Aliases for existing sources
  'fairyloot':                            { name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com' },
  'fairy-loot-cozy-fantasy':             { name: 'FairyLoot', type: 'subscription_box', website: 'https://www.fairyloot.com' },
  'owlcrate':                             { name: 'OwlCrate', type: 'subscription_box', website: 'https://www.owlcrate.com' },
  'fae-crate-adult':                      { name: 'FaeCrate', type: 'subscription_box', website: 'https://www.faecrate.com' },
  'fae-crate-opus':                       { name: 'FaeCrate', type: 'subscription_box', website: 'https://www.faecrate.com' },
  'goldsboro':                            { name: 'Goldsboro Books', type: 'retailer', website: 'https://www.goldsborobooks.com' },
  'beastly-tales-book-box':              { name: 'Beastly Tales Book Box', type: 'retailer', website: 'https://beastlytalesbookbox.com' },
  'imagine-books-shop':                   { name: 'Imagine Books Shop', type: 'retailer', website: 'https://imaginebooks.shop' },
  'broken-binding':                       { name: 'The Broken Binding', type: 'retailer', website: 'https://www.thebrokenbinding.co.uk' },
  'broken-binding-sci-fi-%26-fantasy':   { name: 'The Broken Binding', type: 'retailer', website: 'https://www.thebrokenbinding.co.uk' },
  'cover-to-cover':                       { name: 'Cover to Cover', type: 'subscription_box' },
  'coveted-cover':                        { name: 'Coveted Cover', type: 'subscription_box' },
  'romance-cartel':                       { name: 'Romance Cartel', type: 'subscription_box' },
  'bookish-%26-spice':                   { name: 'Bookish & Spice', type: 'subscription_box' },
  'bookish-%26-spice-contemporary-romance': { name: 'Bookish & Spice', type: 'subscription_box' },
  'butterfly-book-club-carnal-creatures': { name: 'Butterfly Book Club', type: 'subscription_box' },
  'butterfly-book-club-hive':            { name: 'Butterfly Book Club', type: 'subscription_box' },
  'fabled-co':                            { name: 'Fabled', type: 'subscription_box' },
  'dazzling-bookish-shop':               { name: 'Dazzling', type: 'subscription_box' },
  'ethereal-by-eternal-embers':          { name: 'Eternal Embers', type: 'subscription_box' },
  'nocturnal-ink-delust-box':            { name: 'Nocturnal Ink', type: 'subscription_box' },
  'nocturnal-ink-hooked-on-him':         { name: 'Nocturnal Ink', type: 'subscription_box' },
  "lilac-library's":                     { name: 'Lilac Library', type: 'subscription_box' },
  'lilac-library-romance':               { name: 'Lilac Library', type: 'subscription_box' },
  'pretty-little-words':                 { name: 'Pretty Little Words', type: 'subscription_box' },
  'the-love-club-bookshop-monthly':      { name: 'Love Club Book Shop', type: 'subscription_box' },
  'the-love-club-bookshop-quarterly':    { name: 'Love Club Book Shop', type: 'subscription_box' },
  'bad-women-books-romantasy-book-box':  { name: 'Bad Women Books', type: 'subscription_box' },
  'bad-women-books-vintage-romance-box': { name: 'Bad Women Books', type: 'subscription_box' },
  'books-for-days-crate-romance':        { name: 'Books for Days Crate', type: 'subscription_box' },
  'hear-me-out-by-lavish-library':       { name: 'Lavish Library', type: 'subscription_box' },
  // New sources
  'after-dark-bookshop':                 { name: 'After Dark Bookshop', type: 'subscription_box', website: 'https://afterdarkbookshop.com' },
  'all-of-the-above-book-box':           { name: 'All of the Above Book Box', type: 'subscription_box' },
  'allurial':                             { name: 'Allurial', type: 'subscription_box' },
  'amor-eterno-book-box':                { name: 'Amor Eterno Book Box', type: 'subscription_box' },
  'aurora-crate':                         { name: 'Aurora Crate', type: 'subscription_box' },
  'author-editions':                      { name: 'Author Editions', type: 'retailer' },
  'bad-girls-book-box':                  { name: 'Bad Girls Book Box', type: 'subscription_box' },
  'bad-women-books':                      { name: 'Bad Women Books', type: 'subscription_box' },
  'barnes-%26-noble':                    { name: 'Barnes & Noble', type: 'retailer', website: 'https://www.barnesandnoble.com' },
  'bewitched-pages':                      { name: 'Bewitched Pages', type: 'subscription_box' },
  'beyond-the-pages':                    { name: 'Beyond the Pages', type: 'subscription_box' },
  'bibleophile-custom-sprayed-edges':    { name: 'Bibleophile', type: 'retailer' },
  'blackraven-books':                    { name: 'Blackraven Books', type: 'subscription_box' },
  'blush-book-box':                      { name: 'Blush Book Box', type: 'subscription_box' },
  'bookaholic':                           { name: 'Bookaholic', type: 'subscription_box' },
  'books-for-days':                       { name: 'Books for Days Crate', type: 'subscription_box' },
  'bright-side-candles-pre-orders':      { name: 'Bright Side Candles', type: 'retailer' },
  'chapter-55':                           { name: 'Chapter 55', type: 'subscription_box' },
  'curious-king':                         { name: 'Curious King', type: 'subscription_box' },
  'custom-sprayed-edges':                { name: 'Custom Sprayed Edges', type: 'retailer' },
  'dark-and-disturbed':                  { name: 'Dark and Disturbed', type: 'subscription_box' },
  'dirty-diction-fiction':               { name: 'Dirty Diction Fiction', type: 'subscription_box' },
  'dreamerwhale':                         { name: 'Dreamerwhale', type: 'subscription_box' },
  'elysian-crates':                       { name: 'Elysian Crates', type: 'subscription_box' },
  'endless-pages':                        { name: 'Endless Pages', type: 'subscription_box' },
  'endless-vines-%26-roses':             { name: 'Endless Vines & Roses', type: 'subscription_box' },
  'euphoric-lit':                         { name: 'Euphoric Lit', type: 'subscription_box' },
  'everheart-book-box':                  { name: 'Everheart Book Box', type: 'subscription_box' },
  'exclusi-books':                        { name: 'Exclusi Books', type: 'retailer' },
  'faentasy-designs':                    { name: 'Faentasy Designs', type: 'retailer' },
  'fated-arcana':                         { name: 'Fated Arcana', type: 'subscription_box' },
  'fated-pages':                          { name: 'Fated Pages', type: 'subscription_box' },
  'final-score':                          { name: 'Final Score', type: 'subscription_box' },
  'forbidden-love-bookstore':            { name: 'Forbidden Love Bookstore', type: 'retailer' },
  'foxglove-fantasy-fiction':            { name: 'Foxglove Fantasy Fiction', type: 'subscription_box' },
  'haunted-hearts':                       { name: 'Haunted Hearts', type: 'subscription_box' },
  'indigo-exclusive':                    { name: 'Indigo Exclusive', type: 'retailer', website: 'https://www.chapters.indigo.ca' },
  'ink-pages':                            { name: 'Ink Pages', type: 'subscription_box' },
  'iridescent-fairytale':                { name: 'Iridescent Fairytale', type: 'subscription_box' },
  'kingdom-book-designs':                { name: 'Kingdom Book Designs', type: 'retailer' },
  'knot-and-page':                        { name: 'Knot and Page', type: 'subscription_box' },
  'last-chapter-book-box':              { name: 'Last Chapter Book Box', type: 'subscription_box' },
  'lavish-library':                       { name: 'Lavish Library', type: 'subscription_box' },
  'lit-haven':                            { name: 'Lit Haven', type: 'subscription_box' },
  'lit-pins-%26-co':                     { name: 'Lit Pins & Co', type: 'retailer' },
  'luna-%26-lore':                       { name: 'Luna & Lore', type: 'subscription_box' },
  'lunarya':                              { name: 'Lunarya', type: 'subscription_box' },
  'mahogany-mail':                        { name: 'Mahogany Mail', type: 'subscription_box' },
  'midnight-whispers':                    { name: 'Midnight Whispers', type: 'subscription_box' },
  'millennia-books':                      { name: 'Millennia Books', type: 'subscription_box' },
  'mindsight':                            { name: 'Mindsight', type: 'subscription_box' },
  'mondlicht-b%C3%BCcher':              { name: 'Mondlicht Bücher', type: 'subscription_box' },
  'most-bookstores':                      { name: 'Most Bookstores', type: 'retailer' },
  'nostalgic-af-books':                  { name: 'Nostalgic AF Books', type: 'subscription_box' },
  'novaflame':                            { name: 'Novaflame', type: 'subscription_box' },
  'novel-grounds':                        { name: 'Novel Grounds', type: 'subscription_box' },
  'obsidian-descension':                 { name: 'Obsidian Descension', type: 'subscription_box' },
  'perfectly-edged':                      { name: 'Perfectly Edged', type: 'retailer' },
  'prettygalxcrates':                    { name: 'Pretty Galx Crates', type: 'subscription_box' },
  'read-in-peace':                        { name: 'Read in Peace', type: 'subscription_box' },
  'red-flags-%26-roses':                 { name: 'Red Flags & Roses', type: 'subscription_box' },
  'romance-era':                          { name: 'Romance Era', type: 'subscription_box' },
  'romance-me':                           { name: 'Romance Me', type: 'subscription_box' },
  'roses-%26-thorns':                    { name: 'Roses & Thorns', type: 'subscription_box' },
  'ruined-by-fiction':                   { name: 'Ruined by Fiction', type: 'subscription_box' },
  'sonny-book-box':                       { name: 'Sonny Book Box', type: 'subscription_box' },
  'spiced-book-box':                      { name: 'Spiced Book Box', type: 'subscription_box' },
  'target-exclusive':                    { name: 'Target', type: 'retailer', website: 'https://www.target.com' },
  'the-works':                            { name: 'The Works', type: 'retailer', website: 'https://www.theworks.co.uk' },
  'twisted-fiction':                      { name: 'Twisted Fiction', type: 'subscription_box' },
  'venom-and-lace-book-box':             { name: 'Venom and Lace Book Box', type: 'subscription_box' },
  'venus-volumes':                        { name: 'Venus Volumes', type: 'subscription_box' },
  'walmart-exclusives':                  { name: 'Walmart', type: 'retailer', website: 'https://www.walmart.com' },
  'waterstones':                          { name: 'Waterstones', type: 'retailer', website: 'https://www.waterstones.com' },
}

interface EditionEntry {
  companySlug: string
  bookSlug: string
  editionSlug: string
  month: string   // e.g. "January 2025"
}

/** Parse BAS monthly markdown file into edition entries */
function parseMonthlyFile(content: string, month: string): EditionEntry[] {
  const entries: EditionEntry[] = []
  const lines = content.split('\n')

  let state: 'none' | 'company' | 'book' | 'edition' = 'none'
  let currentCompany = ''
  let currentBook = ''

  const companyRe = /\]\(https:\/\/www\.booksandspreadsheets\.com\/companies\/([^)]+)\)/
  const bookRe    = /\]\(https:\/\/www\.booksandspreadsheets\.com\/books-1\/([^)]+)\)/
  const editionRe = /\]\(https:\/\/www\.booksandspreadsheets\.com\/special-editions\/([^)]+)\)/

  for (const line of lines) {
    if (line.includes('###### COMPANY')) { state = 'company'; continue }
    if (line.includes('###### BOOK'))    { state = 'book';    continue }
    if (line.includes('###### EDITION')) { state = 'edition'; continue }
    if (line.includes('###### SALE'))    { state = 'none';    continue }

    if (state === 'company') {
      const m = companyRe.exec(line)
      if (m) currentCompany = m[1]
    } else if (state === 'book') {
      const m = bookRe.exec(line)
      if (m) currentBook = m[1]
    } else if (state === 'edition') {
      const m = editionRe.exec(line)
      if (m && currentCompany && currentBook) {
        entries.push({
          companySlug: currentCompany,
          bookSlug: currentBook,
          editionSlug: m[1],
          month,
        })
        // Don't reset — same company/book might have multiple editions? Reset after SALE DETAILS.
      }
    }
  }

  return entries
}

/** Decode URL-encoded slug and convert hyphens to spaces */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, ' ').trim()
  } catch {
    return slug.replace(/-/g, ' ').trim()
  }
}


// Common English words that typically appear in book titles (not author names)
const TITLE_WORDS = new Set([
  // articles / prepositions / conjunctions
  'the', 'a', 'an', 'of', 'in', 'by', 'for', 'and', 'or', 'but', 'with',
  'to', 'from', 'at', 'on', 'is', 'are', 'my', 'your', 'his', 'her', 'its',
  'this', 'that', 'not', 'no', 'me', 'him', 'us', 'it', 'we', 'do', 'be',
  'as', 'if', 'so', 'all', 'up', 'out', 'our', 'who', 'what', 'how', 'where',
  'when', 'their', 'they', 'into', 'than',
  // common fantasy / romance title words
  'king', 'queen', 'prince', 'princess', 'lord', 'lady', 'knight', 'dragon',
  'wolf', 'crown', 'throne', 'shadow', 'darkness', 'light', 'fire', 'ice',
  'moon', 'sun', 'star', 'stars', 'blood', 'bone', 'bones', 'heart', 'hearts',
  'soul', 'souls', 'rose', 'thorn', 'sword', 'blade', 'night', 'dawn', 'dusk',
  'court', 'kingdom', 'empire', 'villain', 'villains', 'angel', 'demon',
  'ghost', 'witch', 'hunter', 'killer', 'master', 'monster', 'legend',
  'fate', 'destiny', 'power', 'magic', 'curse', 'spell', 'ruin', 'chaos',
  'storm', 'ember', 'embers', 'ash', 'ashes', 'dust', 'silver', 'gold',
  'black', 'white', 'red', 'blue', 'dark', 'wild', 'lost', 'broken', 'hidden',
  'secret', 'love', 'war', 'peace', 'death', 'life', 'hope', 'fear', 'sin',
  'grace', 'mercy', 'vengeance', 'honour', 'glory', 'wrath', 'fury',
  'hollow', 'void', 'abyss', 'eden', 'heaven', 'hell', 'game', 'hunt',
  'rise', 'fall', 'reign', 'rule', 'born', 'blood', 'cold', 'bitter',
  'sweet', 'cruel', 'beautiful', 'wicked', 'vicious', 'savage', 'deadly',
])

/** Parse a book slug into { title, author }.
 *  Returns author=null if we can't confidently determine it. */
function parseBookSlug(slug: string): { title: string; author: string | null } {
  let decoded = slug
  try { decoded = decodeURIComponent(slug) } catch {}
  decoded = decoded.replace(/-/g, ' ').trim()

  const words = decoded.split(' ').filter(Boolean)

  // Look for initials pattern (like k.m., v.e., l.j., a.l.) - very reliable author indicator
  for (let i = words.length - 1; i >= Math.max(0, words.length - 4); i--) {
    if (/^[a-z]\.[a-z]\.?$/i.test(words[i])) {
      // Author starts at this token
      if (i < words.length && words.length - i <= 3 && i >= 2) {
        const titlePart = words.slice(0, i).join(' ')
        const authorPart = words.slice(i).join(' ')
        return {
          title: toTitleCase(titlePart),
          author: toTitleCase(authorPart),
        }
      }
    }
  }

  // Try 2-word author split: last 2 words that are not title/stop words
  if (words.length >= 4) {
    const last2 = words.slice(words.length - 2)
    const titlePart = words.slice(0, words.length - 2)

    const bothNameLike = last2.every(w => {
      const lower = w.toLowerCase()
      return (
        !TITLE_WORDS.has(lower) &&
        /^[a-z''-]+$/i.test(w) &&   // alphabetic only (allow apostrophes, hyphens)
        w.length >= 3
      )
    })

    if (bothNameLike && titlePart.length >= 2) {
      return {
        title: toTitleCase(titlePart.join(' ')),
        author: toTitleCase(last2.join(' ')),
      }
    }
  }

  // Try 3-word author (firstname middlename lastname) — only if last word not title-like
  if (words.length >= 5) {
    const last3 = words.slice(words.length - 3)
    const titlePart = words.slice(0, words.length - 3)

    const allNameLike = last3.every(w => {
      const lower = w.toLowerCase()
      return !TITLE_WORDS.has(lower) && /^[a-z''-]+$/i.test(w) && w.length >= 2
    })

    if (allNameLike && titlePart.length >= 2) {
      return {
        title: toTitleCase(titlePart.join(' ')),
        author: toTitleCase(last3.join(' ')),
      }
    }
  }

  // Can't determine author
  return { title: toTitleCase(decoded), author: null }
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ')
}

/** Try to find a book in the DB by trying progressively shorter title candidates
 *  (strips trailing words which might be author name in slug) */
async function findBookBySlug(bookSlug: string): Promise<string | null> {
  const decoded = decodeSlug(bookSlug)
  const words = decoded.split(' ').filter(Boolean)

  // Try full slug title, then remove last 1/2/3 words (possible author name)
  for (let trim = 0; trim <= 3; trim++) {
    if (words.length - trim < 1) break  // Need at least 1 word

    const candidate = words.slice(0, words.length - trim).join(' ')
    const { data } = await supabase
      .from('book')
      .select('id, title, author')
      .ilike('title', candidate)
      .limit(1)

    if (data && data.length > 0) {
      return data[0].id
    }
  }

  return null
}

/** Find book in DB or create it from slug data */
async function findOrCreateBook(bookSlug: string): Promise<string | null> {
  // First try to find existing book
  const existingId = await findBookBySlug(bookSlug)
  if (existingId) return existingId

  // Parse slug into title + author
  const parsed = parseBookSlug(bookSlug)
  const author = parsed.author ?? 'Unknown'

  // Don't create if title is clearly garbled (too short or all special chars)
  if (parsed.title.length < 3) return null

  const { data: created, error } = await supabase
    .from('book')
    .insert({ title: parsed.title, author })
    .select('id')
    .single()

  if (error || !created) {
    console.error(`  Failed to create book "${parsed.title}":`, error?.message)
    return null
  }

  return created.id
}

// Cache: source name → source id (avoid repeated lookups/inserts)
const sourceCache = new Map<string, string>()

async function findOrCreateSource(companySlug: string): Promise<string | null> {
  const info = COMPANY_MAP[companySlug]
  if (!info) return null

  if (sourceCache.has(info.name)) return sourceCache.get(info.name)!

  const { data: existing } = await supabase
    .from('source')
    .select('id')
    .ilike('name', info.name)
    .limit(1)

  if (existing && existing.length > 0) {
    sourceCache.set(info.name, existing[0].id)
    return existing[0].id
  }

  // Create new source
  const { data: created, error } = await supabase
    .from('source')
    .insert({ name: info.name, type: info.type, website: info.website || null })
    .select('id')
    .single()

  if (error || !created) {
    console.error(`  Failed to create source "${info.name}":`, error?.message)
    return null
  }

  console.log(`  Created new source: ${info.name}`)
  sourceCache.set(info.name, created.id)
  return created.id
}


async function main() {
  const firecrawlDir = path.join(__dirname, '../.firecrawl')

  // Auto-discover all bas-*.md files and parse month/year from filename
  const MONTH_NAMES: Record<string, string> = {
    january: 'January', february: 'February', march: 'March', april: 'April',
    may: 'May', june: 'June', july: 'July', august: 'August',
    september: 'September', october: 'October', november: 'November', december: 'December',
    jan: 'January', feb: 'February', mar: 'March', apr: 'April',
    jun: 'June', jul: 'July', aug: 'August', sep: 'September',
    oct: 'October', nov: 'November', dec: 'December',
  }

  function parseMonthFromFilename(filename: string): string | null {
    // Matches patterns like: bas-january25.md, bas-january25-pre.md, bas-jan25-box.md
    const m = filename.match(/^bas-([a-z]+)(\d{2})(?:-[a-z]+)?\.md$/)
    if (!m) return null
    const monthName = MONTH_NAMES[m[1]]
    if (!monthName) return null
    const year = parseInt(m[2]) + 2000
    return `${monthName} ${year}`
  }

  const allFiles = fs.readdirSync(firecrawlDir)
    .filter(f => f.startsWith('bas-') && f.endsWith('.md'))
    .sort()

  const monthFiles: Array<{ file: string; month: string }> = []
  for (const file of allFiles) {
    const month = parseMonthFromFilename(file)
    if (month) monthFiles.push({ file, month })
  }

  const allEntries: EditionEntry[] = []
  const seenSlugs = new Set<string>()

  for (const { file, month } of monthFiles) {
    const filePath = path.join(firecrawlDir, file)
    if (!fs.existsSync(filePath)) continue

    const content = fs.readFileSync(filePath, 'utf-8')
    const entries = parseMonthlyFile(content, month)

    for (const e of entries) {
      // Deduplicate by edition slug
      if (!seenSlugs.has(e.editionSlug)) {
        seenSlugs.add(e.editionSlug)
        allEntries.push(e)
      }
    }
    console.log(`Parsed ${file}: ${entries.length} entries`)
  }

  console.log(`\nTotal unique editions to process: ${allEntries.length}`)

  let added = 0
  let skipped = 0
  let noBook = 0
  let noSource = 0
  let failed = 0

  const unmatchedBooks = new Set<string>()
  const unmappedCompanies = new Set<string>()

  for (const entry of allEntries) {
    // Get source ID
    const sourceId = await findOrCreateSource(entry.companySlug)
    if (!sourceId) {
      unmappedCompanies.add(entry.companySlug)
      noSource++
      continue
    }

    // Find or create book
    const bookId = await findOrCreateBook(entry.bookSlug)
    if (!bookId) {
      unmatchedBooks.add(entry.bookSlug)
      noBook++
      continue
    }

    // Check if edition already exists (by source + book combo or edition slug as notes)
    const { data: existing } = await supabase
      .from('edition')
      .select('id')
      .eq('book_id', bookId)
      .eq('source_id', sourceId)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    // Build edition name from month + source name
    const sourceInfo = COMPANY_MAP[entry.companySlug]
    const editionName = `${sourceInfo?.name || entry.companySlug} ${entry.month} Edition`

    const { error } = await supabase
      .from('edition')
      .insert({
        book_id: bookId,
        source_id: sourceId,
        edition_name: editionName,
        edition_type: 'subscription_box',
        release_month: entry.month,
        notes: `bas:${entry.editionSlug}`,
      })

    if (error) {
      console.error(`  Failed: ${entry.bookSlug} (${entry.companySlug}):`, error.message)
      failed++
    } else {
      added++
    }
  }

  console.log('\n=== Results ===')
  console.log(`Added:      ${added}`)
  console.log(`Skipped:    ${skipped} (already exist)`)
  console.log(`No book:    ${noBook} (book not in DB)`)
  console.log(`No source:  ${noSource} (company not in map)`)
  console.log(`Failed:     ${failed}`)

  if (unmappedCompanies.size > 0) {
    console.log('\nUnmapped companies:')
    for (const c of [...unmappedCompanies].sort()) console.log(`  ${c}`)
  }

  if (unmatchedBooks.size > 0) {
    console.log(`\nUnmatched books (${unmatchedBooks.size}) - need manual lookup:`)
    for (const b of [...unmatchedBooks].sort()) {
      console.log(`  ${b}`)
    }
  }
}

main().catch(console.error)
