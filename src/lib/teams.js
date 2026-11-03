// Team accent colors keyed by Jolpica constructorId. Fallback when OpenF1 colors are missing.
export const TEAM_COLORS = {
  mercedes: '#00d7b6',
  ferrari: '#ed1131',
  red_bull: '#4781d7',
  mclaren: '#f47600',
  rb: '#6c98ff',
  alpine: '#00a1e8',
  haas: '#9c9fa2',
  audi: '#ff2d00',
  williams: '#1868db',
  aston_martin: '#229971',
  cadillac: '#c8a85a',
};

export const teamColor = (constructorId) => TEAM_COLORS[constructorId] ?? 'var(--muted)';
