import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { driverList, nationalityFlag } from '../lib/driverStats.js';
import { teamColor } from '../lib/teams.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import { SourceNote } from '../components/Status.jsx';
import FollowStar from '../components/FollowStar.jsx';
import './Drivers.css';

export default function DriverPicker({ season }) {
  const { current, others } = driverList(season);
  return (
    <section className="page">
      <div className="page-head">
        <h1>Driver Spotlight</h1>
        <SourceNote data={season} />
      </div>
      <p className="muted">Pick a driver for their 2026 season, teammate battle, career numbers and the stories everyone's writing about them.</p>
      <ol className="driver-grid" aria-label="2026 drivers">
        {current.map((d, i) => <DriverCard key={d.id} d={d} season={season} i={i} />)}
      </ol>
      {others.length > 0 && (
        <>
          <h2>Also raced in 2026</h2>
          <ol className="driver-grid driver-grid--small">
            {others.map((d, i) => <DriverCard key={d.id} d={d} season={season} i={i} />)}
          </ol>
        </>
      )}
    </section>
  );
}

function DriverCard({ d, season, i }) {
  const { has } = useBookmarks();
  const name = `${d.givenName} ${d.familyName}`;
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.6) }}>
      <Link
        to={`/drivers/${d.id}`}
        className={`driver-card${has('drivers', d.id) ? ' is-followed' : ''}`}
        style={{ '--team': teamColor(d.constructorId) }}
        data-testid="driver-card"
      >
        <span className="driver-card__number" aria-hidden="true">{d.number ?? ''}</span>
        <span className="driver-card__pos">{d.standing ? `P${d.standing.pos}` : '–'}</span>
        <span className="driver-card__name">
          <small>{d.givenName}</small>
          <b>{d.familyName}</b>
        </span>
        <span className="driver-card__team muted">
          <span aria-hidden="true">{nationalityFlag(d.nationality)} </span>
          {season.constructors[d.constructorId]?.name}
        </span>
        <span className="driver-card__pts">{d.standing?.points ?? 0} pts</span>
        <span className="driver-card__star"><FollowStar kind="drivers" id={d.id} label={name} /></span>
      </Link>
    </motion.li>
  );
}
