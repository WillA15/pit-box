import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { podium } from '../lib/schedule.js';
import { teamColor } from '../lib/teams.js';
import { flag } from '../lib/flags.js';
import './Podium.css';

const ORDER = [2, 1, 3]; // left, centre, right, like a real podium
const HEIGHT = { 1: 128, 2: 96, 3: 72 };

export default function Podium({ season, race }) {
  const reduce = useReducedMotion();
  const top = podium(race);
  if (top.length < 3) return null;
  return (
    <section className="panel podium" aria-labelledby="podium-h">
      <div className="podium__head">
        <h2 id="podium-h">Latest podium</h2>
        <Link to={`/tracks/${race.round}`}><span aria-hidden="true">{flag(race.country)} </span>{race.name} →</Link>
      </div>
      <ol className="podium__steps">
        {ORDER.map((p, i) => {
          const r = top.find((x) => x.pos === p);
          const d = season.drivers[r.driverId];
          return (
            <li key={p} className={`podium__step podium__step--p${p}`} style={{ '--team': teamColor(r.constructorId) }}>
              <motion.div className="podium__driver" initial={reduce ? false : { opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.15 }}>
                <Link to={`/drivers/${r.driverId}`}>{d?.familyName}</Link>
                <small>{season.constructors[r.constructorId]?.name}</small>
              </motion.div>
              <motion.div
                className="podium__block"
                initial={reduce ? false : { height: 0 }}
                animate={{ height: HEIGHT[p] }}
                transition={{ type: 'spring', stiffness: 120, damping: 16, delay: i * 0.12 }}
              >
                <b>{p}</b>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
