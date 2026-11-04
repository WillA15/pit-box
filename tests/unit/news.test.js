import { describe, it, expect } from 'vitest';
import { parseRSS, cleanLink, relevance, similarity, clusterStories, rankNewsForDriver, decodeEntities, mergeArchive } from '../../src/lib/news.js';

const rss = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Antonelli seals the title in Mexico]]></title>
<link>https://example.com/a?utm_source=RSS&amp;utm_medium=referral&amp;id=7</link>
<description><![CDATA[<p>The Mercedes driver clinched it with four races left.</p><a class='more' href='x'>Read more</a>]]></description>
<pubDate>Wed, 04 Nov 2026 16:00:00 +0000</pubDate><category><![CDATA[Andrea Kimi Antonelli]]></category></item>
<item><title>No link here</title><pubDate>Wed, 04 Nov 2026 16:00:00 +0000</pubDate></item>
<item><title>Bad scheme</title><link>javascript:alert(1)</link><pubDate>Wed, 04 Nov 2026 16:00:00 +0000</pubDate></item>
</channel></rss>`;

describe('parseRSS', () => {
  const items = parseRSS(rss, 'Example');
  it('reads CDATA, strips HTML and drops "Read more"', () => {
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Antonelli seals the title in Mexico');
    expect(items[0].summary).toBe('The Mercedes driver clinched it with four races left.');
    expect(items[0].categories).toEqual(['Andrea Kimi Antonelli']);
  });
  it('removes tracking parameters and rejects non-http links', () => {
    expect(items[0].link).toBe('https://example.com/a?id=7');
    expect(cleanLink('javascript:alert(1)')).toBeNull();
  });
  it('decodes entities', () => {
    expect(decodeEntities('Ferrari&#8217;s &amp; McLaren&rsquo;s')).toBe('Ferrari’s & McLaren’s');
  });
});

const item = (title, summary = '', extra = {}) => ({ title, summary, link: `https://x/${title}`, source: 'A', date: '2026-11-04T12:00:00Z', ...extra });
const hulk = { givenName: 'Nico', familyName: 'Hülkenberg' };

describe('relevance', () => {
  it('requires the surname, and weights headline mentions higher', () => {
    expect(relevance(item('Mercedes look strong'), { givenName: 'George', familyName: 'Russell' })).toBe(0);
    const t = relevance(item('Russell happy with pace'), { givenName: 'George', familyName: 'Russell' });
    const s = relevance(item('Mercedes happy', 'Russell said the car felt good'), { givenName: 'George', familyName: 'Russell' });
    expect(t).toBeGreaterThan(s);
  });
  it('ignores accents and matches whole words only', () => {
    expect(relevance(item('Hulkenberg scores for Audi'), hulk)).toBeGreaterThan(0);
    expect(relevance(item('Albondigas recipe'), { givenName: 'Alex', familyName: 'Albon' })).toBe(0);
  });
});

describe('clustering and ranking', () => {
  it('groups the same story from different outlets', () => {
    expect(similarity('Antonelli wins Mexico City GP to seal title', 'Antonelli seals world title with Mexico City win')).toBeGreaterThanOrEqual(0.3);
    const c = clusterStories([
      item('Antonelli wins Mexico City GP to seal title', '', { source: 'A' }),
      item('Antonelli seals world title with Mexico City win', '', { source: 'B' }),
      item('Antonelli to test new floor in Brazil', '', { source: 'A' }),
    ]);
    expect(c.map((x) => x.items.length).sort()).toEqual([1, 2]);
  });
  it('ranks widely covered recent stories first and returns at most three', () => {
    const now = new Date('2026-11-04T18:00:00Z');
    const items = [
      item('Antonelli wins Mexico City GP to seal title', '', { source: 'A', date: '2026-11-02T00:00:00Z' }),
      item('Antonelli seals world title with Mexico City win', '', { source: 'B', date: '2026-11-02T01:00:00Z' }),
      item('Antonelli seals title, Mexico City reaction', '', { source: 'C', date: '2026-11-02T02:00:00Z' }),
      item('Antonelli on his new helmet', '', { source: 'A', date: '2026-11-04T17:00:00Z' }),
      item('Antonelli joins charity event', '', { source: 'D', date: '2026-10-20T00:00:00Z' }),
      item('Antonelli quick in simulator', '', { source: 'B', date: '2026-11-03T00:00:00Z' }),
    ];
    const top = rankNewsForDriver(items, { givenName: 'Andrea Kimi', familyName: 'Antonelli' }, { now });
    expect(top).toHaveLength(3);
    expect(top[0].outlets).toBe(3);
    expect(top[0].alsoIn.length).toBe(2);
    expect(top.some((s) => s.lead.title.includes('charity'))).toBe(false);
  });
});

describe('archive and headline clean-up', () => {
  it('strips a trailing "| Formula 1" from headlines', () => {
    const x = parseRSS('<item><title>Cracked sump almost put Antonelli out | Formula 1</title><link>https://r/x</link><pubDate>Wed, 04 Nov 2026 16:00:00 +0000</pubDate></item>', 'R');
    expect(x[0].title).toBe('Cracked sump almost put Antonelli out');
  });
  it('merges, de-duplicates and expires old items', () => {
    const now = new Date('2026-11-04T00:00:00Z');
    const old = [{ link: 'a', date: '2026-11-01T00:00:00Z' }, { link: 'z', date: '2026-09-01T00:00:00Z' }];
    const fresh = [{ link: 'a', date: '2026-11-01T00:00:00Z', title: 'new copy' }, { link: 'b', date: '2026-11-03T00:00:00Z' }];
    const m = mergeArchive(old, fresh, { now });
    expect(m.map((x) => x.link)).toEqual(['b', 'a']);
    expect(m[1].title).toBe('new copy');
  });
});
