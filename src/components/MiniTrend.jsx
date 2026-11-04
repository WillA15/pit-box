/** Tiny cumulative-points line (no axes) for cards. */
export default function MiniTrend({ trend, color = 'var(--accent)', max, label }) {
  if (!trend?.length) return null;
  const W = 160;
  const H = 40;
  const top = Math.max(1, max ?? Math.max(...trend.map((p) => p.points)));
  const x = (i) => (trend.length === 1 ? W / 2 : (i / (trend.length - 1)) * W);
  const y = (v) => H - 3 - (v / top) * (H - 6);
  const d = trend.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.points).toFixed(1)}`).join(' ');
  const last = trend.at(-1);
  return (
    <svg className="mini-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? `Points by round, ${last.points} now`}>
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(trend.length - 1)} cy={y(last.points)} r="3" fill={color} />
    </svg>
  );
}
