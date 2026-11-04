// "Now" can be overridden with ?now=2026-11-08T12:00:00Z for previews and tests.
export function getNow() {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('now');
    const t = p && Date.parse(p);
    if (t) return new Date(t);
  }
  return new Date();
}
