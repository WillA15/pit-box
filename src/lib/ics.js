// Build an iCalendar (.ics) file for race weekends. RFC 5545: CRLF line endings, 75-octet folding.
const DURATION_MIN = { Race: 120, Sprint: 60, Qualifying: 60, 'Sprint Qualifying': 45 };

const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

function fold(line) {
  const out = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

/**
 * @param {Array} races  season races
 * @param {object} opts  { sessions: 'all' | 'main', now: Date }
 *   'main' = Qualifying, Sprint, Race only.
 */
export function buildICS(races, { sessions = 'main', now = new Date() } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pit Box//F1 2026//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:F1 2026 (Pit Box)'];
  for (const race of races) {
    for (const s of race.sessions) {
      if (sessions === 'main' && !(s.name in DURATION_MIN)) continue;
      const start = Date.parse(s.start);
      const end = start + (DURATION_MIN[s.name] ?? 60) * 60000;
      lines.push(
        'BEGIN:VEVENT',
        `UID:pitbox-2026-r${race.round}-${s.name.toLowerCase().replace(/\s+/g, '-')}@pitbox`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${escape(`${race.name}: ${s.name}`)}`,
        `LOCATION:${escape(`${race.circuitName}, ${race.locality}, ${race.country}`)}`,
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadICS(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
