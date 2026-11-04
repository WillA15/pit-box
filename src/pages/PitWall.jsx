import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason, useNews } from '../lib/useSeason.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import { bookmarks } from '../lib/bookmarkStore.js';
import { computeStandingsHistory } from '../lib/standingsHistory.js';
import { driverSummary, teamSummary, pitWallNews } from '../lib/pitWall.js';
import { driverList } from '../lib/driverStats.js';
import { nextRace } from '../lib/schedule.js';
import { teamColor, teamShortName } from '../lib/teams.js';
import { flag } from '../lib/flags.js';
import { getNow } from '../lib/now.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import Countdown from '../components/Countdown.jsx';
import FollowChip from '../components/FollowChip.jsx';
import FollowStar from '../components/FollowStar.jsx';
import MiniTrend from '../components/MiniTrend.jsx';
import PointsChart from '../components/PointsChart.jsx';
import './PitWall.css';

export default function PitWall() {
  const { data: season, error, loading } = useSeason();
  return (
    <section className="page">
      <div className="page-head">
        <h1>My Pit Wall</h1>
        <SourceNote data={season} />
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {season && <PitWallBody season={season} />}
    </section>
  );
}

function PitWallBody({ season }) {
  const bm = useBookmarks();
  const history = useMemo(() => computeStandingsHistory(season.races), [season]);
  const now = getNow();
  const next = nextRace(season.races, now);

  if (bm.count === 0) return <EmptyState season={season} />;

  const drivers = bm.drivers.filter((id) => season.drivers[id]).map((id) => driverSummary(season, history, id));
  const teams = bm.teams.filter((id) => season.constructors[id]).map((id) => teamSummary(season, history, id));
  const maxDriverPts = Math.max(1, ...drivers.map((d) => d.trend.at(-1)?.points ?? 0));
  const maxTeamPts = Math.max(1, ...teams.map((t) => t.trend.at(-1)?.points ?? 0));
  const lastIdx = history.rounds.length - 1;
  const raceName = (r) => season.races.find((x) => x.round === r)?.name;

  return (
    <>
      <Following season={season} />

      {next && (
        <motion.div className="panel pw-next" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <span className="tag">Next up · Round {next.round}</span>
            <h2><span aria-hidden="true">{flag(next.country)} </span>{next.name}</h2>
            <p className="muted">{next.circuitName}</p>
            <Link className="btn" to={`/tracks/${next.round}`}>Track guide</Link>
          </div>
          <Countdown to={next.start} label="Lights out in" />
        </motion.div>
      )}

      {drivers.length > 0 && (
        <section aria-labelledby="pw-drivers">
          <h2 id="pw-drivers">Your drivers</h2>
          <ol className="pw-grid">
            <AnimatePresence>
              {drivers.map((s, i) => <DriverCard key={s.id} s={s} season={season} i={i} max={maxDriverPts} />)}
            </AnimatePresence>
          </ol>
        </section>
      )}

      {teams.length > 0 && (
        <section aria-labelledby="pw-teams">
          <h2 id="pw-teams">Your teams</h2>
          <ol className="pw-grid">
            <AnimatePresence>
              {teams.map((s, i) => <TeamCard key={s.id} s={s} season={season} i={i} max={maxTeamPts} />)}
            </AnimatePresence>
          </ol>
        </section>
      )}

      {drivers.length > 0 && (
        <div className="panel">
          <h2>Points race</h2>
          <PointsChart
            history={history}
            kind="drivers"
            t={lastIdx}
            animate
            raceName={raceName}
            series={drivers.map((d, i) => ({
              id: d.id,
              label: season.drivers[d.id].code,
              color: teamColor(season.drivers[d.id].constructorId),
              dashed: drivers.slice(0, i).some((o) => season.drivers[o.id].constructorId === season.drivers[d.id].constructorId),
            }))}
          />
        </div>
      )}

      <YourNews season={season} follows={{ drivers: bm.drivers, teams: bm.teams }} />
      <p className="source-note">Your follows are saved on this device. Signing in to keep them everywhere is coming later.</p>
    </>
  );
}

function EmptyState({ season }) {
  return (
    <div className="panel pw-empty">
      <h2>Build your pit wall</h2>
      <p className="muted">
        Follow drivers and teams to get their results, points trend and news in one place. Tap ☆ anywhere on the site, or pick some here.
      </p>
      <QuickPick season={season} />
    </div>
  );
}

function QuickPick({ season }) {
  const { current } = driverList(season);
  const teams = season.constructorStandings.map((s) => s.constructorId);
  return (
    <div className="pw-pick">
      <h3>Drivers</h3>
      <div className="chip-row">
        {current.map((d) => (
          <FollowChip key={d.id} kind="drivers" id={d.id} label={d.familyName} color={teamColor(d.constructorId)} />
        ))}
      </div>
      <h3>Teams</h3>
      <div className="chip-row">
        {teams.map((id) => (
          <FollowChip key={id} kind="teams" id={id} label={teamShortName(id, season.constructors[id]?.name)} color={teamColor(id)} />
        ))}
      </div>
    </div>
  );
}

function Following({ season }) {
  const bm = useBookmarks();
  const [confirm, setConfirm] = useState(false);
  const [adding, setAdding] = useState(false);
  return (
    <>
    <div className="pw-following">
      <span className="muted">Following</span>
      <div className="chip-row">
        {bm.drivers.map((id) => season.drivers[id] && (
          <FollowChip key={id} kind="drivers" id={id} label={season.drivers[id].familyName} color={teamColor(season.drivers[id].constructorId)} />
        ))}
        {bm.teams.map((id) => season.constructors[id] && (
          <FollowChip key={id} kind="teams" id={id} label={teamShortName(id, season.constructors[id].name)} color={teamColor(id)} />
        ))}
      </div>
      <button type="button" className="btn" aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
        {adding ? 'Done' : '+ Add more'}
      </button>
      <button
        type="button"
        className="btn pw-clear"
        onClick={() => { if (confirm) { bookmarks.clear(); setConfirm(false); } else { setConfirm(true); setTimeout(() => setConfirm(false), 4000); } }}
      >
        {confirm ? 'Tap again to clear all' : 'Clear all'}
      </button>
    </div>
    <AnimatePresence>
      {adding && (
        <motion.div className="panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
          <QuickPick season={season} />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

function DriverCard({ s, season, i, max }) {
  const d = season.drivers[s.id];
  const color = teamColor(d.constructorId);
  const name = `${d.givenName} ${d.familyName}`;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.06 }}
      className="pw-card"
      style={{ '--team': color }}
      data-testid="pw-driver"
    >
      <header className="pw-card__head">
        <div>
          <Link to={`/drivers/${s.id}`} className="pw-card__name">{name}</Link>
          <small className="muted">{season.constructors[d.constructorId]?.name}</small>
        </div>
        <FollowStar kind="drivers" id={s.id} label={name} />
      </header>
      <div className="pw-card__nums">
        <div><b>{s.standing ? `P${s.standing.pos}` : '–'}</b><small>Championship</small></div>
        <div><b>{s.standing?.points ?? 0}</b><small>Points</small></div>
        <div><b>+{s.lastRoundPoints}</b><small>Last round</small></div>
      </div>
      <MiniTrend trend={s.trend} color={color} max={max} label={`${d.familyName} points by round`} />
      {s.latest && (
        <p className="pw-card__latest">
          <Link to={`/tracks/${s.latest.round}`}>
            <span aria-hidden="true">{flag(s.latest.country)} </span>
            {s.latest.name}
          </Link>
          : <b>{s.latest.label}</b>
          {s.latest.gained ? <span className={s.latest.gained > 0 ? 'up' : 'down'}> {s.latest.gained > 0 ? `▲${s.latest.gained}` : `▼${-s.latest.gained}`} from P{s.latest.grid}</span> : null}
          {s.latest.label === 'DNF' && <span className="muted"> ({s.latest.status})</span>}
        </p>
      )}
      <ol className="pw-form" aria-label="Last five results">
        {s.recent.map((r) => (
          <li key={r.round} className={r.label === 'DNF' ? 'is-dnf' : r.pos <= 3 ? 'is-podium' : ''} title={`R${r.round} ${r.name}`}>{r.label}</li>
        ))}
      </ol>
    </motion.li>
  );
}

function TeamCard({ s, season, i, max }) {
  const color = teamColor(s.id);
  const name = season.constructors[s.id]?.name ?? s.id;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.06 }}
      className="pw-card"
      style={{ '--team': color }}
      data-testid="pw-team"
    >
      <header className="pw-card__head">
        <div>
          <span className="pw-card__name">{name}</span>
          <small className="muted">Constructors' championship</small>
        </div>
        <FollowStar kind="teams" id={s.id} label={name} />
      </header>
      <div className="pw-card__nums">
        <div><b>{s.standing ? `P${s.standing.pos}` : '–'}</b><small>Championship</small></div>
        <div><b>{s.standing?.points ?? 0}</b><small>Points</small></div>
        <div><b>{s.standing?.wins ?? 0}</b><small>Wins</small></div>
      </div>
      <MiniTrend trend={s.trend} color={color} max={max} label={`${name} points by round`} />
      {s.latest && (
        <p className="pw-card__latest">
          <Link to={`/tracks/${s.latest.round}`}>
            <span aria-hidden="true">{flag(s.latest.country)} </span>
            {s.latest.name}
          </Link>
          : {s.latest.cars.map((c, k) => (
            <span key={c.driverId}>
              {k > 0 && ', '}
              <Link to={`/drivers/${c.driverId}`}>{season.drivers[c.driverId]?.code}</Link> <b>{c.label}</b>
            </span>
          ))}
          <span className="muted"> · {s.latest.points} pts</span>
        </p>
      )}
    </motion.li>
  );
}

function YourNews({ season, follows }) {
  const news = useNews();
  const now = getNow();
  const stories = useMemo(() => pitWallNews(news.items, season, follows, { now }), [news.items, season, follows.drivers.join(), follows.teams.join(), now.getTime() / 600000 | 0]);
  return (
    <section aria-labelledby="pw-news">
      <h2 id="pw-news">Your news</h2>
      {news.loading && <p className="muted">Loading news…</p>}
      {!news.loading && !stories.length && <p className="panel muted">No recent stories about the drivers and teams you follow.</p>}
      <ol className="pw-news">
        {stories.map((s, i) => (
          <motion.li key={s.lead.link} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} data-testid="pw-news">
            <span className="pw-news__about">{s.about.join(' · ')}</span>
            <a href={s.lead.link} target="_blank" rel="noopener noreferrer">
              {s.lead.title}
              <span className="sr-only"> (opens {s.lead.source} in a new tab)</span>
            </a>
            <small className="muted">{s.lead.source}{s.outlets > 1 ? ` + ${s.outlets - 1} more` : ''}</small>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
