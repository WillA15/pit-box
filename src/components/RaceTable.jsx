import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildRaceRows, sortRows, resultLabel } from '../lib/raceTable.js';
import { teamColor } from '../lib/teams.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import StrategyStrip, { CompoundLegend } from './StrategyStrip.jsx';
import FollowStar from './FollowStar.jsx';
import Trophy from './Trophy.jsx';
import FastestLapIcon from './FastestLapIcon.jsx';
import './RaceTable.css';

const COLUMNS = {
  race: [
    { key: 'pos', label: 'Pos', sortable: true },
    { key: 'driver', label: 'Driver' },
    { key: 'grid', label: 'Started', sortable: true },
    { key: 'gained', label: '+/−', sortable: true },
    { key: 'strategy', label: 'Tyre strategy' },
    { key: 'stops', label: 'Stops', sortable: true },
    { key: 'fastestLap', label: 'Fastest lap' },
    { key: 'points', label: 'Pts', sortable: true },
  ],
  sprint: [
    { key: 'pos', label: 'Pos', sortable: true },
    { key: 'driver', label: 'Driver' },
    { key: 'grid', label: 'Started', sortable: true },
    { key: 'gained', label: '+/−', sortable: true },
    { key: 'strategy', label: 'Tyres' },
    { key: 'fastestLap', label: 'Fastest lap' },
    { key: 'points', label: 'Pts', sortable: true },
  ],
};

/** Results + strategy for one session. `variant` is "race" or "sprint". */
export default function RaceTable({ season, results, detail, variant = 'race', caption }) {
  const [sort, setSort] = useState({ key: 'pos', dir: 'asc' });
  const { followLevel } = useBookmarks();
  const navigate = useNavigate();
  const rows = sortRows(buildRaceRows(results, detail?.strategies), sort.key, sort.dir);
  const totalLaps = detail?.totalLaps ?? Math.max(0, ...results.map((r) => r.laps ?? 0));
  const cols = COLUMNS[variant];
  const session = variant === 'sprint' ? 'Sprint' : 'Race';

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <div className="race-table-wrap">
      <div className="race-table__tools">
        <CompoundLegend />
        {/* Column headers are hidden on phones, so sorting moves into a dropdown there. */}
        <label className="race-table__sort">
          Sort by{' '}
          <select
            value={`${sort.key}:${sort.dir}`}
            onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); }}
          >
            {cols.filter((c) => c.sortable).map((c) => (
              <option key={c.key} value={`${c.key}:asc`}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>
      <table className={`race-table race-table--${variant}`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`rt-${c.key}`}
                aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {c.sortable ? (
                  <button type="button" onClick={() => toggle(c.key)}>
                    {c.label}
                    <span aria-hidden="true">{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                ) : c.label}
              </th>
            ))}
            <th className="rt-follow"><span className="sr-only">Follow</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const d = season.drivers[r.driverId];
            const name = d ? `${d.givenName} ${d.familyName}` : r.driverId;
            const level = followLevel(r.driverId, r.constructorId);
            return (
              <tr
                key={r.driverId}
                className={`rt-row${r.classified ? '' : ' is-out'}`}
                style={{ '--team': teamColor(r.constructorId) }}
                data-testid="race-row"
                // The whole row opens the driver's profile; the name link does the same for keyboards,
                // and the follow button keeps working on its own.
                onClick={(e) => { if (!e.target.closest('a, button')) navigate(`/drivers/${r.driverId}`); }}
              >
                <td className="rt-pos">
                  <b>{resultLabel(r)}</b>
                </td>
                <td className="rt-driver">
                  <span className="rt-driver__name">
                    <Link to={`/drivers/${r.driverId}`}>{name}</Link>
                    {/* Trophy first, so a winner who also set the fastest lap shows 🏆 then ⏱. */}
                    {r.isWinner && <Trophy title={`${session} winner`} size={16} />}
                    {r.isFastest && <FastestLapIcon title={`Fastest lap of the ${session.toLowerCase()}`} size={16} />}
                    {level && (
                      <span
                        className={`rt-fav rt-fav--${level}`}
                        role="img"
                        aria-label={level === 'driver' ? 'You follow this driver' : 'You follow this team'}
                        title={level === 'driver' ? 'You follow this driver' : `You follow ${season.constructors[r.constructorId]?.name}`}
                      >
                        ★
                      </span>
                    )}
                  </span>
                  <small className="muted">{season.constructors[r.constructorId]?.name}{!r.classified && r.status ? ` · ${r.status}` : ''}</small>
                </td>
                <td className="rt-grid" data-label="Started">{r.pitLaneStart ? 'Pit lane' : r.grid ?? '–'}</td>
                <td className={`rt-gained ${r.gained > 0 ? 'up' : r.gained < 0 ? 'down' : ''}`} data-label="+/−">
                  {r.gained == null ? '–' : r.gained > 0 ? `▲${r.gained}` : r.gained < 0 ? `▼${-r.gained}` : '='}
                </td>
                <td className="rt-strategy">
                  <StrategyStrip stints={r.stints} pits={r.pits} totalLaps={totalLaps} delay={Math.min(i * 0.06, 1.2)} label={name} />
                </td>
                {variant === 'race' && <td className="rt-stops" data-label="Stops">{r.stops ?? '–'}</td>}
                {/* Only the driver who set the fastest lap of the session gets a time here. */}
                <td className={`rt-fastestLap${r.isFastest ? ' is-fastest' : ' is-empty'}`} data-label="Fastest lap">
                  {r.isFastest && r.fastestLap && (
                    <>
                      {r.fastestLap.time}
                      {r.fastestLap.lap && <small className="muted"> L{r.fastestLap.lap}</small>}
                    </>
                  )}
                </td>
                <td className="rt-points" data-label="Pts">{r.points || ''}</td>
                <td className="rt-follow"><FollowStar kind="drivers" id={r.driverId} label={name} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!detail && <p className="muted">Tyre and pit data isn't available for this session yet.</p>}
    </div>
  );
}
