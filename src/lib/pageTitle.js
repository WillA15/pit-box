// Browser tab title for each route, e.g. "Standings · Pit Box".
const SITE = 'Pit Box';
const STATIC = {
  '/standings': 'Standings',
  '/schedule': 'Schedule',
  '/tracks': 'Tracks',
  '/drivers': 'Driver Spotlight',
  '/pit-wall': 'My Pit Wall',
};

export function pageTitle(pathname, season) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return SITE;
  if (STATIC[path]) return `${STATIC[path]} · ${SITE}`;

  const track = path.match(/^\/tracks\/(\d+)$/);
  if (track) {
    const round = Number(track[1]);
    const race = season?.races?.find((r) => r.round === round);
    return `${race?.name ?? `Round ${round}`} · ${SITE}`;
  }

  const driver = path.match(/^\/drivers\/([^/]+)$/);
  if (driver) {
    const d = season?.drivers?.[driver[1]];
    return d ? `${d.givenName} ${d.familyName} · ${SITE}` : `Driver Spotlight · ${SITE}`;
  }

  return `Page not found · ${SITE}`;
}
