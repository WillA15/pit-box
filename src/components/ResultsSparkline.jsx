import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import './ResultsSparkline.css';

const CLASSIFIED = /^\d+$/;

/** Finishing position at every Grand Prix: P1 at the top. DNFs drop to the bottom as a red ×. */
export default function ResultsSparkline({ rounds, color = 'var(--accent)', fieldSize = 22 }) {
  const reduce = useReducedMotion();
  const pts = rounds.filter((r) => r.result);
  if (!pts.length) return <p className="muted">No Grand Prix starts yet.</p>;
  const W = 640;
  const H = 180;
  const padX = 26;
  const padY = 16;
  const x = (i) => padX + (pts.length === 1 ? (W - padX * 2) / 2 : (i / (pts.length - 1)) * (W - padX * 2));
  const y = (pos) => padY + ((pos - 1) / (fieldSize - 1)) * (H - padY * 2);
  const nodes = pts.map((r, i) => {
    const ok = CLASSIFIED.test(r.result.positionText ?? '');
    return { ...r, ok, cx: x(i), cy: ok ? y(r.result.pos) : y(fieldSize) };
  });
  const line = nodes.filter((n) => n.ok).map((n, i) => `${i ? 'L' : 'M'}${n.cx} ${n.cy}`).join(' ');
  return (
    <figure className="sparkline">
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={`Finishing positions: ${nodes.map((n) => `round ${n.round} ${n.ok ? `P${n.result.pos}` : 'DNF'}`).join(', ')}`}>
        {[1, 3, 10].map((p) => (
          <g key={p}>
            <line className="sparkline__grid" x1={padX} x2={W - padX} y1={y(p)} y2={y(p)} />
            <text className="sparkline__axis" x={4} y={y(p) + 4}>P{p}</text>
          </g>
        ))}
        <motion.path
          className="sparkline__line"
          d={line}
          style={{ stroke: color }}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        {nodes.map((n, i) => (
          <Link key={n.round} to={`/tracks/${n.round}`} aria-label={`Round ${n.round} ${n.name}: ${n.ok ? `P${n.result.pos}` : n.result.status}`}>
            <title>{`R${n.round} ${n.name}: ${n.ok ? `P${n.result.pos}` : `DNF (${n.result.status})`}`}</title>
            <motion.g initial={reduce ? false : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }} style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}>
              {n.ok ? (
                <circle className={`sparkline__dot${n.result.pos <= 3 ? ' is-podium' : ''}`} cx={n.cx} cy={n.cy} r={n.result.pos === 1 ? 7 : 5} style={{ stroke: color }} />
              ) : (
                <path className="sparkline__dnf" d={`M${n.cx - 5} ${n.cy - 5}L${n.cx + 5} ${n.cy + 5}M${n.cx + 5} ${n.cy - 5}L${n.cx - 5} ${n.cy + 5}`} />
              )}
            </motion.g>
            <text className="sparkline__round" x={n.cx} y={H + 16} textAnchor="middle">{n.round}</text>
          </Link>
        ))}
      </svg>
      <figcaption className="muted">Grand Prix finishes by round. Gold = podium, red × = did not finish. Tap a round for that race.</figcaption>
    </figure>
  );
}
