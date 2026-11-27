import { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { driverList, nationalityFlag } from '../lib/driverStats.js';
import { searchDrivers } from '../lib/driverSearch.js';
import { teamColor, teamShortName } from '../lib/teams.js';
import { pts } from '../lib/format.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import { SourceNote } from '../components/Status.jsx';
import FollowStar from '../components/FollowStar.jsx';
import './Drivers.css';

export default function DriverPicker({ season }) {
  const { current: onGrid, others: earlier } = useMemo(() => driverList(season), [season]);
  // The search lives in the address (?q=), so Back from a profile returns to the same results.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const setQuery = (q) => setParams(q ? { q } : {}, { replace: true });
  const current = useMemo(() => searchDrivers(onGrid, season, query), [onGrid, season, query]);
  const others = useMemo(() => searchDrivers(earlier, season, query), [earlier, season, query]);
  const input = useRef(null);
  const searching = query.trim() !== '';
  const found = current.length + others.length;

  return (
    <section className="page">
      <div className="page-head">
        <h1>Drivers</h1>
        <SourceNote data={season} />
      </div>
      <p className="muted">Pick a driver for their 2026 season, teammate battle, career numbers and the stories everyone's writing about them.</p>
      <div className="driver-search" role="search">
        <label htmlFor="driver-search" className="driver-search__label">Search drivers</label>
        <div className="driver-search__field">
          <input
            ref={input}
            id="driver-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Name, team, number or code"
            autoComplete="off"
            spellCheck="false"
            aria-describedby="driver-search-status"
          />
          {searching && (
            <button type="button" className="btn btn--primary btn--sm driver-search__clear" onClick={() => { setQuery(''); input.current?.focus(); }}>Clear</button>
          )}
        </div>
        <p id="driver-search-status" className="muted driver-search__status" aria-live="polite">
          {searching ? (found ? `${found} driver${found === 1 ? '' : 's'} found` : '') : ''}
        </p>
      </div>
      {searching && !found && <p className="panel muted">No drivers match “{query.trim()}”.</p>}
      {current.length > 0 && (
        <ol className="driver-grid" aria-label="2026 drivers">
          {current.map((d, i) => <DriverCard key={d.id} d={d} season={season} i={i} />)}
        </ol>
      )}
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
          {teamShortName(d.constructorId, season.constructors[d.constructorId]?.name)}
        </span>
        <span className="driver-card__pts">{pts(d.standing?.points ?? 0)}</span>
        <span className="driver-card__star"><FollowStar kind="drivers" id={d.id} label={name} /></span>
      </Link>
    </motion.li>
  );
}
