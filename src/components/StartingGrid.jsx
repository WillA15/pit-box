import { motion, useReducedMotion } from 'framer-motion';
import { teamColor } from '../lib/teams.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import './StartingGrid.css';

/** Two-column staggered starting grid, like the painted boxes on the track. */
// W / F in positionText means the driver did not start.
const dns = (r) => r.positionText === 'W' || r.positionText === 'F';

export default function StartingGrid({ results, season, title = 'Starting grid' }) {
  const reduce = useReducedMotion();
  const { followLevel } = useBookmarks();
  const slots = results
    .filter((r) => r.grid > 0)
    .sort((a, b) => a.grid - b.grid);
  const pitLane = results.filter((r) => r.grid === 0);
  return (
    <figure className="start-grid">
      <figcaption><h2 className="start-grid__title">{title}</h2></figcaption>
      <ol className="start-grid__boxes">
        {slots.map((r, i) => (
          <motion.li
            key={r.driverId}
            className={`start-grid__box${r.grid % 2 === 0 ? ' is-right' : ''}${followLevel(r.driverId, r.constructorId) ? ` is-followed--${followLevel(r.driverId, r.constructorId)}` : ''}`}
            style={{ '--team': teamColor(r.constructorId) }}
            title={dns(r) ? 'Did not start' : undefined}
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: dns(r) ? 0.45 : 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 1) }}
          >
            <b>{r.grid}</b>
            <span>{season.drivers[r.driverId]?.code}</span>
            {dns(r) && <span className="sr-only">Did not start</span>}
          </motion.li>
        ))}
      </ol>
      {pitLane.length > 0 && (
        <p className="muted start-grid__pit">Pit lane: {pitLane.map((r) => season.drivers[r.driverId]?.code).join(', ')}</p>
      )}
    </figure>
  );
}
