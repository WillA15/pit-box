import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { seasonStats, teammateHeadToHead, driverList, ageOn, nationalityFlag } from '../lib/driverStats.js';
import { computeStandingsHistory, championClinch } from '../lib/standingsHistory.js';
import { rankNewsForDriver } from '../lib/news.js';
import { teamColor, teamShortName } from '../lib/teams.js';
import { useCareers, useNews } from '../lib/useSeason.js';
import { getNow } from '../lib/now.js';
import { SourceNote } from '../components/Status.jsx';
import FollowChip from '../components/FollowChip.jsx';
import Trophy from '../components/Trophy.jsx';
import ResultsSparkline from '../components/ResultsSparkline.jsx';
import './Drivers.css';

const fmt1 = (n) => (n == null ? '–' : n.toFixed(1));
const ordinal = (n) => (n == null ? '–' : `P${n}`);

export default function DriverProfile({ season, driverId }) {
  const navigate = useNavigate();
  const driver = season.drivers[driverId];
  const champion = useMemo(() => championClinch(computeStandingsHistory(season.races), season.races, 'drivers'), [season]);
  if (!driver) {
    return (
      <section className="page">
        <h1>Driver not found</h1>
        <p className="muted">No 2026 driver matches “{driverId}”. <Link to="/drivers">See all drivers</Link>.</p>
      </section>
    );
  }
  const name = `${driver.givenName} ${driver.familyName}`;
  const team = season.constructors[driver.constructorId];
  const color = teamColor(driver.constructorId);
  const stats = seasonStats(season, driverId);
  const h2h = teammateHeadToHead(season, driverId);
  const { current, others } = driverList(season);

  return (
    <section className="page driver" style={{ '--team': color }}>
      <nav className="driver__nav" aria-label="Drivers">
        <Link to="/drivers">← All drivers</Link>
        <label>
          <span className="sr-only">Switch driver</span>
          <select value={driverId} onChange={(e) => navigate(`/drivers/${e.target.value}`)} aria-label="Switch driver">
            {[...current, ...others].map((d) => (
              <option key={d.id} value={d.id}>{d.givenName} {d.familyName}</option>
            ))}
          </select>
        </label>
      </nav>

      <motion.header className="driver__hero" key={driverId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <span className="driver__number" aria-hidden="true">{driver.number}</span>
        <div className="driver__id">
          <span className="tag">{team?.name}</span>
          <h1>
            <small>{driver.givenName}</small> {driver.familyName}
            {champion?.id === driverId && <Trophy title={`2026 World Champion, clinched at round ${champion.round}`} size={30} />}
          </h1>
          <p className="muted">
            <span aria-hidden="true">{nationalityFlag(driver.nationality)} </span>
            {driver.nationality} · #{driver.number ?? '–'} · Age {ageOn(driver.dob, getNow()) ?? '–'}
          </p>
        </div>
        <div className="driver__follow">
          <FollowChip kind="drivers" id={driverId} name={name} color={color} />
          <FollowChip kind="teams" id={driver.constructorId} name={teamShortName(driver.constructorId, team?.name)} color={color} />
          <SourceNote data={season} />
        </div>
      </motion.header>

      <section aria-labelledby="season-h">
        <h2 id="season-h">2026 season</h2>
        <dl className="stat-tiles driver__stats">
          {[
            ['Championship', ordinal(stats.position), `${stats.points} points`],
            ['Wins', stats.wins, `${stats.starts} starts`],
            ['Podiums', stats.podiums],
            ['Poles', stats.poles],
            ['Fastest laps', stats.fastestLaps],
            ['DNFs', stats.dnfs],
            ['Avg finish', fmt1(stats.avgFinish), stats.bestFinish ? `Best P${stats.bestFinish}` : null],
            ['Avg grid', fmt1(stats.avgGrid)],
            ['Sprint points', stats.sprintPoints, stats.sprintWins ? `${stats.sprintWins} sprint win${stats.sprintWins > 1 ? 's' : ''}` : null],
          ].map(([label, value, sub], i) => (
            <motion.div className="stat-tile" key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <dt className="stat-tile__label">{label}</dt>
              <dd className="stat-tile__value">
                {value}
                {sub && <span className="stat-tile__sub">{sub}</span>}
              </dd>
            </motion.div>
          ))}
        </dl>
      </section>

      <div className="driver__split">
        <section className="panel" aria-labelledby="h2h-h">
          <h2 id="h2h-h">Teammate head-to-head</h2>
          {h2h.length === 0 && <p className="muted">No teammate data yet.</p>}
          {h2h.map((h) => <HeadToHead key={h.teammateId} h={h} season={season} driver={driver} color={color} />)}
        </section>
        <section className="panel" aria-labelledby="form-h">
          <h2 id="form-h">Results</h2>
          <ResultsSparkline rounds={stats.rounds} color={color} />
        </section>
      </div>

      <Career driverId={driverId} />
      <News driver={driver} teamName={team?.name} />
    </section>
  );
}

function HeadToHead({ h, season, driver, color }) {
  const mate = season.drivers[h.teammateId];
  const rows = [
    ['Qualifying', h.quali],
    ['Race', h.race],
    ['Points', h.points],
  ];
  return (
    <div className="h2h" data-testid="h2h">
      <div className="h2h__names">
        <b>{driver.familyName}</b>
        <span className="muted">{h.rounds} round{h.rounds === 1 ? '' : 's'} together</span>
        <Link to={`/drivers/${h.teammateId}`}>{mate?.familyName}</Link>
      </div>
      {rows.map(([label, [a, b]]) => {
        const total = a + b || 1;
        return (
          <div className="h2h__row" key={label} aria-label={`${label}: ${driver.familyName} ${a}, ${mate?.familyName} ${b}`}>
            <span className={`h2h__val${a > b ? ' is-ahead' : ''}`}>{a}</span>
            <div className="h2h__bar" aria-hidden="true">
              <motion.span className="h2h__a" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(a / total) * 100}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
              <motion.span className="h2h__b" initial={{ width: 0 }} animate={{ width: `${(b / total) * 100}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
              <span className="h2h__label">{label}</span>
            </div>
            <span className={`h2h__val${b > a ? ' is-ahead' : ''}`}>{b}</span>
          </div>
        );
      })}
    </div>
  );
}

function Career({ driverId }) {
  const { data } = useCareers();
  const c = data?.careers[driverId];
  if (!c) return null;
  const items = [
    ['Titles', c.titles, c.titleYears.length ? c.titleYears.join(', ') : null],
    ['Race starts', c.starts],
    ['Wins', c.wins],
    ['Podiums', c.podiums],
    ['Poles', c.poles],
    ['First F1 season', c.firstSeason, `${c.seasons} season${c.seasons === 1 ? '' : 's'}`],
  ];
  return (
    <section aria-labelledby="career-h">
      <h2 id="career-h">Career</h2>
      <dl className="career-strip">
        {items.map(([label, value, sub]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value}
              {sub && <small>{sub}</small>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="source-note">Career totals include 2026 so far. Updated {new Date(data.generatedAt).toLocaleDateString()}.</p>
    </section>
  );
}

const ago = (iso, now) => {
  const h = Math.round((now - Date.parse(iso)) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

function News({ driver, teamName }) {
  const news = useNews();
  const now = getNow();
  const stories = useMemo(() => rankNewsForDriver(news.items, driver, { teamName, now }), [news.items, driver, teamName, now.getTime() / 600000 | 0]);
  return (
    <section aria-labelledby="news-h">
      <h2 id="news-h">Trending stories</h2>
      {news.loading && <p className="muted">Loading news…</p>}
      {!news.loading && stories.length === 0 && (
        <p className="panel muted">No recent stories mention {driver.familyName}. Check back after the next session.</p>
      )}
      <ol className="news-grid">
        {stories.map((s, i) => (
          <motion.li key={s.lead.link} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <article className="news-card" data-testid="news-card">
              <p className="news-card__meta">
                <b>{s.lead.source}</b> · <time dateTime={s.lead.date}>{ago(s.lead.date, now)}</time>
                {s.outlets > 1 && <span className="news-card__trend" title="Covered by several outlets">🔥 {s.outlets} outlets</span>}
              </p>
              <h3>
                <a href={s.lead.link} target="_blank" rel="noopener noreferrer">
                  {s.lead.title}
                  <span className="sr-only"> (opens {s.lead.source} in a new tab)</span>
                </a>
              </h3>
              {s.lead.summary && <p className="news-card__summary">{s.lead.summary}</p>}
              {s.alsoIn.length > 0 && <p className="news-card__also muted">Also covered by {s.alsoIn.join(', ')}</p>}
            </article>
          </motion.li>
        ))}
      </ol>
      <p className="source-note">
        Headlines link to the original articles. Sources: Autosport, Motorsport.com, BBC Sport, RaceFans and The Race.
        {news.source === 'snapshot' ? ' Showing saved stories (live feeds unavailable).' : ''}
      </p>
    </section>
  );
}
