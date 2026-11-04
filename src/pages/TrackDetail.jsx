import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeason, useRace, useCircuits } from '../lib/useSeason.js';
import { raceState, podium } from '../lib/schedule.js';
import { flag } from '../lib/flags.js';
import { teamColor } from '../lib/teams.js';
import { getNow } from '../lib/now.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import TrackMap from '../components/TrackMap.jsx';
import Countdown from '../components/Countdown.jsx';
import Tabs from '../components/Tabs.jsx';
import RaceTable from '../components/RaceTable.jsx';
import StartingGrid from '../components/StartingGrid.jsx';
import './TrackDetail.css';

const fmtDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

export default function TrackDetail() {
  const { round } = useParams();
  const { data: season, error, loading } = useSeason();
  const race = season?.races.find((r) => r.round === Number(round));

  if (loading) return <section className="page"><Loading /></section>;
  if (error) return <section className="page"><LoadError error={error} /></section>;
  if (!race) {
    return (
      <section className="page">
        <h1>Off track</h1>
        <p className="muted">There's no round {round} in 2026. <Link to="/tracks">See all tracks</Link>.</p>
      </section>
    );
  }
  return <TrackBody season={season} race={race} />;
}

function TrackBody({ season, race }) {
  const { data: circuits } = useCircuits();
  const circuit = circuits?.circuits[race.circuitId];
  const now = getNow();
  const state = raceState(race, now);
  const hasResults = race.status === 'completed' || race.sprintResults.length > 0;
  const prev = season.races.find((r) => r.round === race.round - 1);
  const next = season.races.find((r) => r.round === race.round + 1);
  const winner = podium(race)[0];

  return (
    <section className="page track">
      <nav className="track__crumbs" aria-label="Breadcrumb">
        <Link to="/tracks">Tracks</Link>
        <span aria-hidden="true"> / </span>
        <span>Round {race.round}</span>
      </nav>

      <header className="track__head">
        <div>
          <span className="tag">Round {race.round}</span>
          {race.sprint && <span className="tag tag--sprint">Sprint weekend</span>}
          <h1><span aria-hidden="true">{flag(race.country)} </span>{race.name}</h1>
          <p className="muted">{race.circuitName} · {race.locality}, {race.country} · {fmtDate.format(new Date(race.start))}</p>
        </div>
        <SourceNote data={season} />
      </header>

      <div className="track__top">
        <div className="panel track__map">
          <TrackMap
            outline={circuit?.outline}
            color={winner ? teamColor(winner.constructorId) : 'var(--accent)'}
            label={`${race.circuitName} map`}
            legend
          />
          {circuit?.outline && (
            <p className="muted track__map-note">
              Drawn from real car-position data ({circuit.outline.year} fastest race lap
              {circuit.outline.pitSource && circuit.outline.pitSource.year !== circuit.outline.year
                ? `; pit lane from the ${circuit.outline.pitSource.year} ${circuit.outline.pitSource.session.toLowerCase()}`
                : ''}
              ). The dot laps at 4× real pace.
            </p>
          )}
        </div>
        <CircuitFacts circuit={circuit} race={race} />
      </div>

      {!hasResults && (
        <div className="panel track__upcoming">
          {state === 'upcoming' || state === 'live' ? (
            <Countdown to={race.start} label="Race starts in" />
          ) : (
            <p>The race has finished. Results will appear here shortly.</p>
          )}
          <p className="muted">Results, tyre strategies and pit stops appear here after the race.</p>
        </div>
      )}

      {hasResults && <Results season={season} race={race} />}

      <nav className="track__pager" aria-label="Other rounds">
        {prev ? <Link className="btn" to={`/tracks/${prev.round}`}>← R{prev.round} {prev.name}</Link> : <span />}
        {next && <Link className="btn" to={`/tracks/${next.round}`}>R{next.round} {next.name} →</Link>}
      </nav>
    </section>
  );
}

function CircuitFacts({ circuit, race }) {
  // Completed: laps actually run. Upcoming: scheduled distance, taken from the last race here.
  const raceLaps = race.results[0]?.laps ?? circuit?.lastWinner?.laps;
  const facts = [
    ['Circuit length', circuit?.lengthKm ? `${circuit.lengthKm.toFixed(3)} km` : '–'],
    ['Corners', circuit?.corners ?? '–'],
    ['Race laps', raceLaps ?? '–'],
    ['Race distance', raceLaps && circuit?.lengthKm ? `${(raceLaps * circuit.lengthKm).toFixed(1)} km` : '–'],
    [
      'Lap record',
      circuit?.lapRecord ? circuit.lapRecord.time : '–',
      circuit?.lapRecord && `${circuit.lapRecord.driver}, ${circuit.lapRecord.season}`,
    ],
    [
      circuit?.lastWinner?.season === 2025 ? '2025 winner' : 'Previous winner',
      circuit?.lastWinner ? circuit.lastWinner.driver : 'New for 2026',
      circuit?.lastWinner && `${circuit.lastWinner.team}${circuit.lastWinner.season !== 2025 ? `, ${circuit.lastWinner.season}` : ''}`,
    ],
    ['First Grand Prix', circuit?.firstGrandPrix ?? '–'],
  ];
  return (
    <dl className="stat-tiles track__facts">
      {facts.map(([label, value, sub]) => (
        <div className="stat-tile" key={label}>
          <dt className="stat-tile__label">{label}</dt>
          <dd className="stat-tile__value">
            {value}
            {sub && <span className="stat-tile__sub">{sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Results({ season, race }) {
  const [params, setParams] = useSearchParams();
  const { data: detail, loading } = useRace(race.round);
  const tabs = [
    ...(race.results.length ? [{ value: 'gp', label: 'Grand Prix' }] : []),
    ...(race.sprint && race.sprintResults.length ? [{ value: 'sprint', label: 'Sprint' }] : []),
  ];
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : tabs[0]?.value;
  const setTab = (v) => setParams(v === tabs[0].value ? {} : { tab: v }, { replace: true });

  return (
    <div className="track__results">
      {tabs.length > 1 && <Tabs tabs={tabs} value={tab} onChange={setTab} label="Session" idPrefix="session" />}
      {loading && <p className="muted">Loading strategy data…</p>}
      {tab === 'gp' && (
        <motion.div key="gp" role={tabs.length > 1 ? 'tabpanel' : undefined} id="session-panel-gp" aria-labelledby={tabs.length > 1 ? 'session-tab-gp' : undefined} className="track__panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <QuickStats season={season} race={race} results={race.results} detail={detail?.grandPrix} kind="Grand Prix" />
          <div className="track__session">
            <div className="panel">
              <StartingGrid results={race.results} season={season} title="Starting grid" />
            </div>
            <div className="panel">
              <h2>Results &amp; pit strategy</h2>
              <RaceTable season={season} results={race.results} detail={detail?.grandPrix} variant="race" caption={`${race.name} results and tyre strategies`} />
            </div>
          </div>
        </motion.div>
      )}
      {tab === 'sprint' && (
        <motion.div key="sprint" role="tabpanel" id="session-panel-sprint" aria-labelledby="session-tab-sprint" className="track__panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <QuickStats season={season} race={race} results={race.sprintResults} detail={detail?.sprint} kind="Sprint" />
          <div className="track__session">
            <div className="panel">
              <StartingGrid results={race.sprintResults} season={season} title="Sprint grid" />
            </div>
            <div className="panel">
              <h2>Sprint results &amp; tyres</h2>
              <RaceTable season={season} results={race.sprintResults} detail={detail?.sprint} variant="sprint" caption={`${race.name} sprint results`} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function QuickStats({ season, race, results, detail, kind }) {
  const name = (id) => {
    const d = season.drivers[id];
    return d ? `${d.givenName} ${d.familyName}` : '–';
  };
  const winner = results.find((r) => r.pos === 1);
  // Pole: qualifying P1 for the Grand Prix; grid slot 1 for the sprint.
  const pole = kind === 'Sprint' ? results.find((r) => r.grid === 1) : race.qualifying.find((q) => q.pos === 1) ?? results.find((r) => r.grid === 1);
  const fastestJolpica = results.find((r) => r.fastestLap?.rank === 1);
  const fastest = detail?.fastest
    ? { who: name(detail.fastest.driverId), time: detail.fastest.time, lap: detail.fastest.lap }
    : fastestJolpica && { who: name(fastestJolpica.driverId), time: fastestJolpica.fastestLap.time, lap: fastestJolpica.fastestLap.lap };
  const rc = detail?.raceControl;
  const tiles = [
    ['Winner', winner ? name(winner.driverId) : '–', winner && (winner.time ? `${season.constructors[winner.constructorId]?.name} · ${winner.time}` : season.constructors[winner.constructorId]?.name), winner && teamColor(winner.constructorId)],
    [kind === 'Sprint' ? 'Sprint pole' : 'Pole position', pole ? name(pole.driverId) : '–', pole && season.constructors[pole.constructorId]?.name, pole && teamColor(pole.constructorId)],
    ['Fastest lap', fastest ? fastest.time : '–', fastest && `${fastest.who}, lap ${fastest.lap}`],
    ['Pit stops', detail ? detail.totalStops : '–', detail && `${detail.strategies.filter((s) => s.stopCount === 1).length} drivers one-stopped`],
    ['Safety cars', rc ? rc.safetyCars : '–', rc && `${rc.virtualSafetyCars} VSC · ${rc.redFlags} red flag${rc.redFlags === 1 ? '' : 's'}`],
  ];
  return (
    <dl className="stat-tiles quick-stats" aria-label={`${kind} quick stats`}>
      {tiles.map(([label, value, sub, color], i) => (
        <motion.div
          className="stat-tile"
          key={label}
          style={color ? { borderTop: `3px solid ${color}` } : undefined}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <dt className="stat-tile__label">{label}</dt>
          <dd className="stat-tile__value">
            {value}
            {sub && <span className="stat-tile__sub">{sub}</span>}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}
