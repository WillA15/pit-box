import { motion, useReducedMotion } from 'framer-motion';
import { teamColor } from '../lib/teams.js';
import './StartingGrid.css';

/** Two-column staggered starting grid, like the painted boxes on the track. */
export default function StartingGrid({ results, season, title = 'Starting grid' }) {
  const reduce = useReducedMotion();
  const slots = results
    .filter((r) => r.grid > 0)
    .sort((a, b) => a.grid - b.grid);
  const pitLane = results.filter((r) => r.grid === 0);
  return (
    <figure className="start-grid">
      <figcaption>{title}</figcaption>
      <ol className="start-grid__boxes">
        {slots.map((r, i) => (
          <motion.li
            key={r.driverId}
            className={`start-grid__box${r.grid % 2 === 0 ? ' is-right' : ''}`}
            style={{ '--team': teamColor(r.constructorId) }}
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 1) }}
          >
            <b>{r.grid}</b>
            <span>{season.drivers[r.driverId]?.code}</span>
          </motion.li>
        ))}
      </ol>
      {pitLane.length > 0 && (
        <p className="muted start-grid__pit">Pit lane: {pitLane.map((r) => season.drivers[r.driverId]?.code).join(', ')}</p>
      )}
    </figure>
  );
}
