import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Egypt business-news service feed (Strategy edition).
 *
 * A FREE, key-less news service: it proxies Google News RSS server-side (no API
 * key, no paid tier, no account) and returns a small JSON list of recent Egyptian
 * business/economy headlines. The browser can't call Google News directly (CORS +
 * it's XML), so this function fetches, parses and shapes it.
 *
 * Relevance to the acting identity: the client passes the active virtual
 * personality's `industry` (and optionally its company `name`); we fold those into
 * the query so a Finance Director sees finance/banking news and a manufacturing
 * entity sees industry news. With no hints it returns general Egypt business news.
 *
 * Only deployed on Vercel (the static GitHub Pages build has no /api); the client
 * degrades gracefully to an "unavailable in this build" note when the call 404s.
 *
 * No env/config required. Optionally, NEWS_RSS_BASE overrides the upstream feed.
 */

type NewsItem = {
  id: string
  title: string
  link: string
  source: string
  publishedAt: string
  snippet: string
  /** Publisher logo thumbnail (keyless Google favicon service). Google News search
   *  RSS carries no inline article photos, so we show the real source's brand mark. */
  image: string
}

const RSS_BASE = process.env.NEWS_RSS_BASE || 'https://news.google.com/rss/search'

/** Map an IDGate Industry to free-text news keywords (English + a light Arabic hint). */
const INDUSTRY_TERMS: Record<string, string> = {
  Manufacturing: 'manufacturing industry factory',
  Education: 'education universities',
  Energy: 'energy oil gas electricity',
  IT: 'technology startups fintech',
  Sports: 'sports clubs sponsorship',
  Governmental: 'government economy policy',
  Finance: 'finance banking stock exchange EGX',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = String(req.query.lang ?? 'en') === 'ar' ? 'ar' : 'en'
  const industry = str(req.query.industry)
  const company = str(req.query.company).slice(0, 80)
  const scope = String(req.query.scope ?? 'auto') === 'all' ? 'all' : 'auto'

  // Build a relevance CASCADE, most specific → broadest. We fetch each in order and
  // keep the first that returns headlines, so a narrow company+industry match in a
  // quiet week broadens to general Egypt business news instead of an empty feed.
  const base = 'Egypt (business OR economy OR market)'
  const term = scope === 'auto' && industry ? INDUSTRY_TERMS[industry] : ''
  const industryGroup = term ? `(${term.split(' ').join(' OR ')})` : ''
  const companyPhrase = scope === 'auto' && company ? `"${company}"` : ''

  const candidates: string[] = []
  if (companyPhrase && industryGroup) candidates.push(`${companyPhrase} ${base} ${industryGroup}`)
  if (companyPhrase) candidates.push(`${companyPhrase} ${base}`)
  if (industryGroup) candidates.push(`${base} ${industryGroup}`)
  candidates.push(base)
  const queries = [...new Set(candidates)] // de-dup, preserve order

  const hl = lang === 'ar' ? 'ar' : 'en-EG'
  const ceid = lang === 'ar' ? 'EG:ar' : 'EG:en'

  try {
    let items: NewsItem[] = []
    let usedQuery = ''
    for (const q of queries) {
      // Last 7 days keeps the feed fresh without a date cursor.
      const url = `${RSS_BASE}?q=${encodeURIComponent(`${q} when:7d`)}&hl=${hl}&gl=EG&ceid=${ceid}`
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'IDGate-NewsService/1.0 (+https://idgate-ng.vercel.app)' },
      })
      if (!upstream.ok) continue
      const parsed = parseRss(await upstream.text())
      if (parsed.length) {
        items = parsed.slice(0, 5)
        usedQuery = q
        break
      }
    }
    // Cache at the edge: fresh for 10 min, serve-stale for an hour while revalidating.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json({ items, query: usedQuery, scope, industry: industry || null })
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the news service.', items: [] })
  }
}

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

/** Minimal, dependency-free RSS 2.0 item parser (no XML lib). */
function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = []
  const blocks = xml.split(/<item>/i).slice(1)
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i].split(/<\/item>/i)[0]
    const rawTitle = clean(tag(b, 'title'))
    const link = clean(tag(b, 'link'))
    if (!rawTitle || !link) continue
    // Google News titles are "Headline - Source"; split off the trailing source.
    const dash = rawTitle.lastIndexOf(' - ')
    const title = dash > 0 ? rawTitle.slice(0, dash) : rawTitle
    const sourceFromTitle = dash > 0 ? rawTitle.slice(dash + 3) : ''
    const source = clean(tag(b, 'source')) || sourceFromTitle || 'News'
    const pub = clean(tag(b, 'pubDate'))
    const snippet = stripHtml(tag(b, 'description')).slice(0, 180)
    // A single unparseable pubDate must not throw (toISOString on Invalid Date
    // throws RangeError) and take the whole feed down — degrade to no timestamp.
    let publishedAt = ''
    if (pub) {
      const d = new Date(pub)
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString()
    }
    items.push({
      id: `news_${i}_${hashish(link)}`,
      title: title.trim(),
      link,
      source: source.trim(),
      publishedAt,
      snippet: snippet.trim(),
      image: faviconFor(sourceUrlOf(b), link),
    })
  }
  return items
}

function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i')
  const m = re.exec(block)
  return m ? m[1] : ''
}

/** Capture the `url="..."` attribute on an item's <source> element, if present. */
function sourceUrlOf(block: string): string {
  const m = /<source[^>]*\burl="([^"]+)"/i.exec(block)
  return m ? m[1] : ''
}

/** Build a publisher-logo thumbnail from the source (or article) domain. Keyless. */
function faviconFor(sourceUrl: string, link: string): string {
  const domain = hostOf(sourceUrl) || hostOf(link)
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function clean(s: string): string {
  return decodeEntities(stripCdata(s)).trim()
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function stripHtml(s: string): string {
  return decodeEntities(stripCdata(s)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Tiny deterministic string hash → short id suffix (stable per link). */
function hashish(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
