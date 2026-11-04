import { fetchAllNews } from '../src/lib/f1/fetchNews.js';
import { sendJSON } from './_respond.js';

// All feed items in one cached response; the page ranks them per driver.
export default async function handler(req, res) {
  try {
    const news = await fetchAllNews();
    if (!news.items.length) return sendJSON(res, 502, { error: 'no_feeds' });
    sendJSON(res, 200, news, { cacheSeconds: 1800 });
  } catch (err) {
    sendJSON(res, 502, { error: 'upstream_failed', message: String(err.message ?? err) });
  }
}
