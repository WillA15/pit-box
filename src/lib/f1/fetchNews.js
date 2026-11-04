import { FEEDS, parseRSS } from '../news.js';

const UA = 'PitBox/1.0 (unofficial F1 fan site; RSS reader)';

/** Fetch every feed in parallel; a slow or broken feed is skipped, not fatal. */
export async function fetchAllNews({ fetchImpl = fetch, timeoutMs = 7000 } = {}) {
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchImpl(f.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml' }, signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { source: f.source, items: parseRSS(await res.text(), f.source) };
      } catch (err) {
        return { source: f.source, items: [], error: String(err.message ?? err) };
      } finally {
        clearTimeout(t);
      }
    }),
  );
  const seen = new Set();
  const items = results
    .flatMap((r) => r.items)
    .filter((it) => (seen.has(it.link) ? false : seen.add(it.link)))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return {
    generatedAt: new Date().toISOString(),
    feeds: results.map((r) => ({ source: r.source, count: r.items.length, ...(r.error && { error: r.error }) })),
    items,
  };
}
