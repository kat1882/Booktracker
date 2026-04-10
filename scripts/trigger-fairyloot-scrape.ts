/**
 * Scrapes FairyLoot past box pages via Apify Playwright to extract
 * book editions. FairyLoot uses WooCommerce (no public products API),
 * so we scrape the archive pages and follow links to individual box pages.
 *
 * Usage:
 *   npx tsx scripts/trigger-fairyloot-scrape.ts
 *
 * After run completes, process results with:
 *   npx tsx scripts/process-fairyloot-scrape.ts --runs=RUN_ID
 */

const APIFY_TOKEN = process.env.APIFY_API_KEY ?? ''
if (!APIFY_TOKEN) { console.error('APIFY_API_KEY env var required'); process.exit(1) }

// FairyLoot past-box archive pages — one per subscription type
const CATEGORY_URLS = [
  { url: 'https://www.fairyloot.com/past-box/ya-book-items-subscription/', userData: { category: 'YA Book + Items' } },
  { url: 'https://www.fairyloot.com/past-box/ya-book-only-subscription/', userData: { category: 'YA Book Only' } },
  { url: 'https://www.fairyloot.com/past-box/adult-book-only-subscription/', userData: { category: 'Adult Book Only' } },
  { url: 'https://www.fairyloot.com/past-box/romantasy-book-only-subscription/', userData: { category: 'Romantasy Book Only' } },
  { url: 'https://www.fairyloot.com/past-box/past-boxes-epic-book-only-subscription/', userData: { category: 'Epic Book Only' } },
  { url: 'https://www.fairyloot.com/past-box/past-boxes-cosy-fantasy-book-only-subscription/', userData: { category: 'Cosy Fantasy Book Only' } },
]

// Page function: runs in the Apify browser context.
// For each category page, extracts all product links then visits each
// individual box page to scrape: book title, author, month, cover, features.
const PAGE_FUNCTION = `async function pageFunction(context) {
  const { page, request, log } = context;

  const categoryName = request.userData.category || 'Unknown';
  log.info('Scraping category: ' + categoryName + ' — ' + request.url);

  // Scroll to trigger lazy loading
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);

  // Extract all product links from this archive/category page
  // WooCommerce uses various selectors depending on theme
  const productLinks = await page.evaluate(() => {
    const seen = new Set();
    const links = [];

    // Try common WooCommerce product link selectors
    const selectors = [
      'a.woocommerce-LoopProduct-link',
      '.products .product a[href*="/product/"]',
      '.woocommerce-loop-product__link',
      'ul.products li a:first-child',
      '.product-grid-item a',
      '.product_item a',
      '.product a[href*="/product/"]',
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        const href = el.getAttribute('href');
        if (href && href.includes('/product/') && !seen.has(href)) {
          seen.add(href);
          links.push(href);
        }
      });
    }

    // Fallback: find all links with /product/ in URL
    if (links.length === 0) {
      document.querySelectorAll('a[href*="/product/"]').forEach(el => {
        const href = el.getAttribute('href');
        if (href && !seen.has(href) && !href.includes('?') && !href.includes('#')) {
          seen.add(href);
          links.push(href);
        }
      });
    }

    return links;
  });

  log.info('Found ' + productLinks.length + ' product links on ' + categoryName);

  if (productLinks.length === 0) {
    log.warning('No product links found — dumping visible text for debugging');
    const text = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    log.warning(text);
    return { category: categoryName, categoryUrl: request.url, boxes: [], error: 'no_links_found' };
  }

  // Visit each individual box/product page and extract data
  const boxes = [];

  for (const link of productLinks) {
    try {
      log.info('Visiting: ' + link);
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // Scroll to load lazy images
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(1000);

      const boxData = await page.evaluate(() => {
        // --- Box/Edition name ---
        const titleEl = document.querySelector(
          '.product_title, h1.entry-title, h1.product-title, h1[itemprop="name"], .product-name h1'
        );
        const editionName = titleEl ? titleEl.textContent.trim() : '';

        // --- Cover image ---
        const imgEl = document.querySelector(
          '.woocommerce-product-gallery__image img, .product-images img, .wp-post-image, figure.woocommerce-product-gallery__image img'
        );
        const coverImage = imgEl
          ? (imgEl.getAttribute('data-large_image') || imgEl.getAttribute('src') || '')
          : '';

        // --- Strip all HTML tags from page body for text parsing ---
        const bodyText = document.body.innerText;

        // --- Month/Year: look for patterns like "January 2025", "Jan 2024" ---
        const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[,\\s]+20\\d{2}/gi;
        const monthMatches = bodyText.match(monthPattern) || [];
        const releaseMonth = monthMatches[0] || null;

        // --- Price ---
        const priceEl = document.querySelector('.price .amount, .woocommerce-Price-amount, .price bdi');
        const priceText = priceEl ? priceEl.textContent.replace(/[^\\d.]/g, '') : '';
        const price = priceText ? parseFloat(priceText) : null;

        // --- Author: look for "by AuthorName" patterns ---
        const authorMatch = bodyText.match(/(?:^|\\n)\\s*[Bb]y\\s+([A-Z][a-zA-Z.\\-' ]{2,50}?)(?:\\n|$|,)/m);
        const author = authorMatch ? authorMatch[1].trim() : null;

        // --- Book title: the product title on FairyLoot past boxes is usually the
        //     box theme name, but the actual book title is mentioned in the description.
        //     Try to find it near "Book:" or in a heading within the description. ---
        const descEl = document.querySelector('.woocommerce-product-details__short-description, .product-description, .entry-content, [itemprop="description"]');
        const descText = descEl ? descEl.innerText : bodyText;

        // Try to find "Book: TITLE by AUTHOR" pattern
        let bookTitle = null;
        const bookLineMatch = descText.match(/[Bb]ook[:\\-]?\\s+([^\\n]{3,80}?)(?:\\n|$|\\sby\\s)/);
        if (bookLineMatch) bookTitle = bookLineMatch[1].trim();

        // Try h2/h3 headings in description (often contain the book title)
        if (!bookTitle && descEl) {
          const headings = descEl.querySelectorAll('h2, h3, strong');
          for (const h of headings) {
            const t = h.textContent.trim();
            if (t.length > 3 && t.length < 100 && !/^(what|this|the box|include|feature|about|month|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(t)) {
              bookTitle = t;
              break;
            }
          }
        }

        // --- Edition features (sprayed edges, foiling, etc.) ---
        const featureKeywords = ['sprayed edges', 'foil', 'foiling', 'signed', 'illustrated', 'exclusive', 'dust jacket', 'special edition', 'reversible', 'embossed', 'debossed', 'ribbon marker', 'endpapers', 'annotated'];
        const features = featureKeywords.filter(kw => bodyText.toLowerCase().includes(kw));

        return {
          editionName,
          bookTitle,
          author,
          coverImage: coverImage.replace('http://', 'https://'),
          releaseMonth,
          price,
          features,
          descriptionSnippet: descText.slice(0, 600).trim(),
        };
      });

      boxes.push({ ...boxData, productUrl: link });
      log.info('  Extracted: ' + (boxData.bookTitle || boxData.editionName) + ' — ' + (boxData.author || 'author unknown'));

      // Be polite to their server
      await page.waitForTimeout(1500);

    } catch (err) {
      log.warning('Failed to scrape product: ' + link + ' — ' + err.message);
    }
  }

  return {
    category: categoryName,
    categoryUrl: request.url,
    boxes,
  };
}`

async function triggerApifyRun(): Promise<string> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~playwright-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: CATEGORY_URLS,
        pageFunction: PAGE_FUNCTION,
        proxyConfiguration: { useApifyProxy: true },
        waitUntil: 'domcontentloaded',
        maxConcurrency: 1,          // sequential — polite + avoids IP blocks
        navigationTimeoutSecs: 60,
        maxRequestRetries: 2,
        memoryMbytes: 2048,
      }),
    }
  )
  if (!res.ok) throw new Error(`Apify error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.data.id as string
}

async function run() {
  console.log('Triggering FairyLoot scrape on Apify…')
  console.log(`Scraping ${CATEGORY_URLS.length} category pages\n`)

  const runId = await triggerApifyRun()
  console.log(`✅ Apify run triggered: ${runId}`)
  console.log('\nMonitor at: https://console.apify.com/actors/runs')
  console.log(`\nWhen complete, process with:`)
  console.log(`  APIFY_API_KEY=your_key npx tsx scripts/process-fairyloot-scrape.ts --runs=${runId}`)
}

run().catch(console.error)
