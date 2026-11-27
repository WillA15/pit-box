// Shared pieces for the search bars (Drivers, Tracks): text normalizing and ranked filtering.

/** Lower case, accents stripped ("Hülkenberg" -> "hulkenberg"), runs of spaces squashed. */
export const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** The words in a normalized string ("spa-francorchamps" -> ["spa", "francorchamps"]). */
export const words = (s) => s.split(/[\s\-'.]+/).filter(Boolean);

/** True if any word of any of the strings starts with q. */
export const wordStarts = (strings, q) => strings.some((s) => words(s).some((w) => w.startsWith(q)));

/**
 * Score the whole query; if that finds nothing and it has several words, every word must match
 * something ("max red", "vegas verstappen") and the weakest one sets the score.
 */
export function scoreQuery(query, scoreToken) {
  const q = normalize(query);
  if (!q) return 1;
  const whole = scoreToken(q);
  if (whole) return whole;
  const parts = q.split(' ');
  if (parts.length < 2) return 0;
  const scores = parts.map(scoreToken);
  return scores.every(Boolean) ? Math.min(...scores) - 5 : 0;
}

/** Items that match, best first; equal matches keep their order. An empty query returns the list as is. */
export function rankBy(list, query, score) {
  if (!normalize(query)) return list;
  return list
    .map((item, i) => ({ item, i, s: score(item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
