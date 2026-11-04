import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBookmarks } from '../lib/useBookmarks.js';
import { computeStandingsHistory } from '../lib/standingsHistory.js';
import { driverSummary, teamSummary } from '../lib/pitWall.js';
import { teamColor, teamShortName } from '../lib/teams.js';
import './PitWallPreview.css';

/** Compact strip of what the visitor follows, for the landing page. */
export default function PitWallPreview({ season }) {
  const bm = useBookmarks();
  const history = useMemo(() => computeStandingsHistory(season.races), [season]);
  if (!bm.count) {
    return (
      <div className="panel pwp pwp--empty">
        <div>
          <h2>Your pit wall</h2>
          <p className="muted">Follow drivers and teams to see their results and news here.</p>
        </div>
        <Link className="btn btn--primary" to="/pit-wall">Build my pit wall</Link>
      </div>
    );
  }
  const items = [
    ...bm.drivers.filter((id) => season.drivers[id]).map((id) => {
      const s = driverSummary(season, history, id);
      const d = season.drivers[id];
      return { key: `d-${id}`, to: `/drivers/${id}`, name: d.familyName, color: teamColor(d.constructorId), pos: s.standing?.pos, pts: s.standing?.points ?? 0, last: s.latest?.label };
    }),
    ...bm.teams.filter((id) => season.constructors[id]).map((id) => {
      const s = teamSummary(season, history, id);
      return { key: `t-${id}`, to: '/pit-wall', name: teamShortName(id, season.constructors[id].name), color: teamColor(id), pos: s.standing?.pos, pts: s.standing?.points ?? 0, last: s.latest ? `${s.latest.points} pts` : null };
    }),
  ].slice(0, 6);
  return (
    <div className="panel pwp" data-testid="pit-wall-preview">
      <div className="pwp__head">
        <h2>Your pit wall</h2>
        <Link to="/pit-wall">Open my pit wall →</Link>
      </div>
      <ol className="pwp__list">
        {items.map((it, i) => (
          <motion.li key={it.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link to={it.to} className="pwp__item" style={{ '--team': it.color }}>
              <b>{it.name}</b>
              <span>{it.pos ? `P${it.pos}` : '–'} · {it.pts} pts</span>
              {it.last && <small className="muted">Last race: {it.last}</small>}
            </Link>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
