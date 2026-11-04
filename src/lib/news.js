// F1 news from public RSS feeds: parsing, matching articles to a driver, and ranking (pure, testable).
// Everything read from a feed is untrusted text: it's only ever shown as plain text and links.

export const FEEDS = [
  { source: 'Autosport', url: 'https://www.autosport.com/rss/f1/news/' },
  { source: 'Motorsport.com', url: 'https://www.motorsport.com/rss/f1/news/' },
  { source: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml' },
  { source: 'RaceFans', url: 'https://www.racefans.net/feed/' },
  { source: 'The Race', url: 'https://www.the-race.com/feed/' },
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
};

const stripHtml = (s) => decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Remove tracking parameters so links are clean. Only http(s) links are kept. */
export function cleanLink(href) {
  try {
    const u = new URL(decodeEntities(href.trim()));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|at_)/i.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return null;
  }
}

function truncate(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return `${cut.slice(0, cut.lastIndexOf(' ') > n * 0.6 ? cut.lastIndexOf(' ') : n).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** Parse an RSS 2.0 document into plain items. */
export function parseRSS(xml, source) {
  const items = [];
  for (const m of String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const block = m[0];
    // Some outlets append their section name to every headline ("… | Formula 1").
    const title = stripHtml(tag(block, 'title')).replace(/\s*\|\s*(Formula 1|Formula One|F1)\s*$/i, '');
    const link = cleanLink(tag(block, 'link'));
    const date = Date.parse(tag(block, 'pubDate'));
    if (!title || !link || !Number.isFinite(date)) continue;
    // Drop "read more" links and the like from summaries, keep it short (this is a teaser, not the article).
    const summary = truncate(stripHtml(tag(block, 'description')).replace(/\s*(Read more|Continue reading).*$/i, ''), 220);
    const categories = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((c) => stripHtml(c[1].replace(/<!\[CDATA\[|\]\]>/g, '')));
    items.push({ title, link, date: new Date(date).toISOString(), summary, source, categories });
  }
  return items;
}

export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const word = (text, w) => w && new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(text);

/**
 * How strongly an article is about a driver. 0 = not about them.
 * Surname is required (in the title or summary); a title mention counts most, and first name,
 * team name or the feed's own category tags add confidence.
 */
export function relevance(item, driver, teamName) {
  const last = fold(driver.familyName);
  const first = fold(driver.givenName).split(' ')[0];
  const title = fold(item.title);
  const summary = fold(item.summary);
  const cats = fold((item.categories ?? []).join(' | '));
  const inTitle = word(title, last);
  const inSummary = word(summary, last);
  const tagged = word(cats, last);
  if (!inTitle && !inSummary && !tagged) return 0;
  let score = inTitle ? 3 : 1;
  if (tagged) score += 1.5;
  if (word(title, first) || word(summary, first)) score += 0.5;
  if (teamName && (title.includes(fold(teamName)) || summary.includes(fold(teamName)))) score += 0.5;
  return score;
}

const STOP = new Set('a an and are as at be by for from has have he his in is it its of on or says that the their this to was with will after over f1 formula 1 one gp grand prix'.split(' '));
const tokens = (s) => new Set(fold(s).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 2 && !STOP.has(w)));

export function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Group articles that are about the same story (similar headlines, within two days). */
export function clusterStories(items, threshold = 0.3) {
  const clusters = [];
  for (const it of [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
    const hit = clusters.find(
      (c) => Math.abs(Date.parse(c.items[0].date) - Date.parse(it.date)) < 2 * 86400000 && c.items.some((x) => similarity(x.title, it.title) >= threshold),
    );
    if (hit) hit.items.push(it);
    else clusters.push({ items: [it] });
  }
  return clusters;
}

const HALF_LIFE_H = 48;

/**
 * Top stories for a driver: recency (48h half-life) × how many outlets covered the story
 * ("significance") and when the driver is the headline subject. Returns up to `limit` stories,
 * each with a lead article and the other outlets that covered it.
 */
export function rankNewsForDriver(items, driver, { teamName, now = new Date(), limit = 3 } = {}) {
  const scored = items
    .map((it) => ({ ...it, relevance: relevance(it, driver, teamName) }))
    .filter((it) => it.relevance > 0);
  const stories = clusterStories(scored).map((c) => {
    const outlets = new Set(c.items.map((x) => x.source));
    const newest = Math.max(...c.items.map((x) => Date.parse(x.date)));
    const ageH = Math.max(0, (now.getTime() - newest) / 3600000);
    const recency = 0.5 ** (ageH / HALF_LIFE_H);
    const rel = Math.max(...c.items.map((x) => x.relevance));
    const lead = [...c.items].sort((a, b) => b.relevance - a.relevance || Date.parse(b.date) - Date.parse(a.date))[0];
    return {
      lead,
      alsoIn: [...outlets].filter((s) => s !== lead.source),
      outlets: outlets.size,
      score: rel * recency * outlets.size,
    };
  });
  return stories.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Merge fresh items into an archive: newest first, de-duplicated by link, keeping `days` of history. */
export function mergeArchive(archive = [], fresh = [], { now = new Date(), days = 30 } = {}) {
  const cutoff = now.getTime() - days * 86400000;
  const byLink = new Map();
  for (const it of [...fresh, ...archive]) if (!byLink.has(it.link) && Date.parse(it.date) >= cutoff) byLink.set(it.link, it);
  return [...byLink.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
