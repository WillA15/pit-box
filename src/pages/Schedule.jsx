import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeason } from '../lib/useSeason.js';
import { nextRace, raceState, FILTERS, podium, weekendRange } from '../lib/schedule.js';
import { buildICS, downloadICS } from '../lib/ics.js';
import { flag } from '../lib/flags.js';
import { teamColor } from '../lib/teams.js';
import { getNow } from '../lib/now.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import Segmented from '../components/Segmented.jsx';
import Icon from '../components/Icon.jsx';
import Countdown from '../components/Countdown.jsx';
import './Schedule.css';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'sprint', label: 'Sprint weekends' },
];

// A readable zone name ("Eastern Standard Time"), falling back to the id ("America/New_York").
const tzId = Intl.DateTimeFormat().resolvedOptions().timeZone;
const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value ?? tzId;
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
  // Completed and Sprint weekends read latest round first (as does the All view's Completed section).
  const races = useMemo(() => {
    const list = season.races.filter(FILTERS[filter]);
    return filter === 'completed' || filter === 'sprint' ? list.reverse() : list;
  }, [season, filter]);

  return (
    <>
      {next && <NextUp race={next} now={now} />}

      <div className="toolbar">
        <Segmented label="Filter races" options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => downloadICS('f1-2026-pit-box.ics', buildICS(season.races.filter((r) => r.status !== 'completed')))}
        >
          <Icon name="calendar" size={16} /> Add remaining races to calendar
        </button>
      </div>
      <p className="muted schedule__tz">Times shown in your time zone ({tz}).</p>

      {filter === 'all' ? (
        <>
          <ScheduleSection id="upcoming" title="Upcoming" races={races.filter(FILTERS.upcoming)} season={season} now={now} next={next} />
          <ScheduleSection
            id="completed"
            title="Completed"
            races={races.filter(FILTERS.completed).reverse()}
            season={season}
            now={now}
            next={next}
          />
        </>
      ) : (
        <RaceList races={races} season={season} now={now} next={next} label="2026 race calendar" />
      )}
      {!races.length && <p className="panel muted">No races match this filter.</p>}
    </>
  );
}

// How many races each section of the "All" view shows before its View More button.
const PREVIEW = 3;

/** One titled part of the "All" view: the first few races, and a View More button for the rest. */
function ScheduleSection({ id, title, races, season, now, next }) {
  const [open, setOpen] = useState(false);
  if (!races.length) return null;
  const extra = races.length > PREVIEW;
  const shown = open || !extra ? races : races.slice(0, PREVIEW);
  const headingId = `schedule-${id}`;
  const listId = `schedule-${id}-list`;
  return (
    <section className="schedule-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="schedule-section__title">{title}</h2>
      <RaceList id={listId} races={shown} season={season} now={now} next={next} label={`${title} races`} />
      {extra && (
        <div className="schedule-section__more">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            aria-expanded={open}
            aria-controls={listId}
            aria-describedby={headingId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'View Less' : 'View More'}
          </button>
        </div>
      )}
    </section>
  );
}

function RaceList({ id, races, season, now, next, label }) {
  return (
    <ol className="schedule" id={id} aria-label={label}>
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
          <button type="button" className="btn btn--primary" onClick={() => downloadICS(`f1-2026-round-${race.round}.ics`, buildICS([race], { sessions: 'all' }))}>
            <Icon name="calendar" size={16} /> Add weekend
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Podium({ race, season }) {
  const { followLevel } = useBookmarks();
  const p = podium(race);
  if (!p.length) return <span className="schedule__podium" />;
  return (
    <span className="schedule__podium" aria-label={`Podium: ${p.map((r) => season.drivers[r.driverId]?.familyName).join(', ')}`}>
      {p.map((r) => (
        <span key={r.driverId} className={`podium-chip${followLevel(r.driverId, r.constructorId) ? ` is-followed is-followed--${followLevel(r.driverId, r.constructorId)}` : ''}`} style={{ '--team': teamColor(r.constructorId) }}>
          <b>P{r.pos}</b> {season.drivers[r.driverId]?.code}
        </span>
      ))}
    </span>
  );
}
