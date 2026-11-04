import { useId } from 'react';
import { motion } from 'framer-motion';
import { teamColor } from '../lib/teams.js';
import Trophy from './Trophy.jsx';
import './GapMeter.css';

/**
 * Championship gap meter: every contender's points as a bar, plus a dashed "still possible"
 * extension showing the most they could finish on. If the extension can't reach the leader's
 * marker, they're out of the fight.
 */
export default function GapMeter({ fight, nameOf, colorOf, title, raceName }) {
  const headingId = useId();
  if (!fight) return null;
  const scaleMax = Math.max(fight.leader.points, ...fight.rivals.map((r) => r.maxPossible)) * 1.04;
  const pct = (v) => `${(v / scaleMax) * 100}%`;
  const rows = [{ ...fight.leader, gap: 0, maxPossible: fight.leader.points + fight.remaining, alive: true, isLeader: true }, ...fight.rivals];
  const stillIn = fight.rivals.filter((r) => r.alive).length;
  return (
    <section className="panel gap-meter" aria-labelledby={headingId}>
      <div className="gap-meter__head">
        <h2 id={headingId}>{title}</h2>
        {fight.decided ? (
          <span className="gap-meter__status is-decided">
            <Trophy title="Champion decided" size={18} /> Decided at {raceName(fight.clinchRound)}
          </span>
        ) : (
          <span className="gap-meter__status">
            {fight.remaining} pts left · {fight.racesLeft} race{fight.racesLeft === 1 ? '' : 's'} · {stillIn} rival{stillIn === 1 ? '' : 's'} still in it
          </span>
        )}
      </div>
      <ol className="gap-meter__rows">
        {rows.map((r, i) => (
          <li key={r.id} className={`gap-meter__row${r.alive ? '' : ' is-out'}`} style={{ '--team': colorOf(r.id) }} data-testid="gap-row">
            <span className="gap-meter__name">{nameOf(r.id)}</span>
            <div className="gap-meter__track" role="img" aria-label={r.isLeader ? `${nameOf(r.id)} leads on ${r.points} points` : `${nameOf(r.id)}: ${r.points} points, ${r.gap} behind; can reach ${r.maxPossible}${r.alive ? '' : ', out of contention'}`}>
              {!fight.decided && (
                <motion.span
                  className="gap-meter__possible"
                  initial={{ width: 0 }}
                  animate={{ width: pct(r.maxPossible) }}
                  transition={{ duration: 1.2, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                />
              )}
              <motion.span
                className="gap-meter__bar"
                initial={{ width: 0 }}
                animate={{ width: pct(r.points) }}
                transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
              />
              <span className="gap-meter__line" style={{ left: pct(fight.leader.points) }} aria-hidden="true" />
            </div>
            <span className="gap-meter__pts">
              <b>{r.points}</b>
              <small>{r.isLeader ? 'Leader' : `−${r.gap}`}</small>
            </span>
          </li>
        ))}
      </ol>
      {!fight.decided && <p className="gap-meter__legend muted"><i /> Points now <i className="is-possible" /> Most they could still score <i className="is-line" /> Leader's total</p>}
    </section>
  );
}

export const driverName = (season) => (id) => season.drivers[id]?.familyName ?? id;
export const driverColor = (season) => (id) => teamColor(season.drivers[id]?.constructorId);
