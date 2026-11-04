import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeason } from '../lib/useSeason.js';
import { nextRace, raceState, FILTERS, podium, weekendRange } from '../lib/schedule.js';
import { buildICS, downloadICS } from '../lib/ics.js';
import { flag } from '../lib/flags.js';
import { teamColor } from '../lib/teams.js';
import { getNow } from '../lib/now.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import Segmented from '../components/Segmented.jsx';
import Countdown from '../components/Countdown.jsx';
import './Schedule.css';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'sprint', label: 'Sprint weekends' },
];

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmtSession = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Schedule() {
  const { data, error, loading } = useSeason();
  return (
    <section className="page">
      <div className="page-head">
        <h1>Schedule</h1>
        <SourceNote data={data} />
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && <ScheduleBody season={data} />}
    </section>
  );
}

function ScheduleBody({ season }) {
  const [filter, setFilter] = useState('all');
  const now = getNow();
  const next = nextRace(season.races, now);
  const races = useMemo(() => season.races.filter(FILTERS[filter]), [season, filter]);

  return (
    <>
      {next && <NextUp race={next} now={now} />}

      <div className="toolbar">
        <Segmented label="Filter races" options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        <button
          type="button"
          className="btn"
          onClick={() => downloadICS('f1-2026-pit-box.ics', buildICS(season.races.filter((r) => r.status !== 'completed')))}
        >
          📅 Add remaining races to calendar
        </button>
      </div>
      <p className="muted schedule__tz">Times shown in your time zone ({tz}).</p>

      <ol className="schedule" aria-label="2026 race calendar">
        {races.map((race, i) => (
          <motion.li
            key={race.round}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4) }}
            className={`schedule__row schedule__row--${raceState(race, now)}${race.round === next?.round ? ' schedule__row--next' : ''}`}
            data-testid="schedule-row"
          >
            <Link to={`/tracks/${race.round}`} className="schedule__link">
              <span className="schedule__round">R{race.round}</span>
              <span className="schedule__flag" aria-hidden="true">{flag(race.country)}</span>
              <span className="schedule__name">
                <strong>{race.name}</strong>
                <small className="muted">{race.circuitName} · {race.locality}</small>
              </span>
              <span className="schedule__date">{weekendRange(race)}</span>
              <span className="schedule__meta">
                {race.sprint && <span className="tag tag--sprint">Sprint</span>}
                {race.round === next?.round && <span className="tag tag--next">Next up</span>}
              </span>
              <Podium race={race} season={season} />
            </Link>
          </motion.li>
        ))}
      </ol>
      {!races.length && <p className="panel muted">No races match this filter.</p>}
    </>
  );
}

function NextUp({ race, now }) {
  const nextSession = race.sessions.find((s) => Date.parse(s.start) > now.getTime()) ?? race.sessions.at(-1);
  return (
    <motion.div className="panel next-up" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="next-up__info">
        <span className="tag">Next race · Round {race.round}</span>
        {race.sprint && <span className="tag tag--sprint">Sprint weekend</span>}
        <h2>
          <span aria-hidden="true">{flag(race.country)} </span>
          {race.name}
        </h2>
        <p className="muted">{race.circuitName} · {race.locality}, {race.country}</p>
        <ul className="sessions">
          {race.sessions.map((s) => (
            <li key={s.name} className={`sessions__row${s.name === 'Race' ? ' is-race' : ''}${s.name.startsWith('Sprint') ? ' is-sprint' : ''}${Date.parse(s.start) < now.getTime() ? ' is-past' : ''}`}>
              <span>{s.name}</span>
              <time dateTime={s.start}>{fmtSession.format(new Date(s.start))}</time>
            </li>
          ))}
        </ul>
      </div>
      <div className="next-up__side">
        <Countdown to={nextSession.start} label={`${nextSession.name} in`} />
        <div className="next-up__actions">
          <Link className="btn btn--primary" to={`/tracks/${race.round}`}>Track guide</Link>
          <button type="button" className="btn" onClick={() => downloadICS(`f1-2026-round-${race.round}.ics`, buildICS([race], { sessions: 'all' }))}>
            📅 Add weekend
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Podium({ race, season }) {
  const p = podium(race);
  if (!p.length) return <span className="schedule__podium" />;
  return (
    <span className="schedule__podium" aria-label={`Podium: ${p.map((r) => season.drivers[r.driverId]?.familyName).join(', ')}`}>
      {p.map((r) => (
        <span key={r.driverId} className="podium-chip" style={{ '--team': teamColor(r.constructorId) }}>
          <b>P{r.pos}</b> {season.drivers[r.driverId]?.code}
        </span>
      ))}
    </span>
  );
}
