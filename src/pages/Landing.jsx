import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeason } from '../lib/useSeason.js';
import { computeStandingsHistory, titleFight } from '../lib/standingsHistory.js';
import { nextRace } from '../lib/schedule.js';
import { teamColor, teamShortName } from '../lib/teams.js';
import { flag } from '../lib/flags.js';
import { getNow } from '../lib/now.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import Hero from '../components/Hero.jsx';
import GapMeter, { driverName, driverColor } from '../components/GapMeter.jsx';
import Podium from '../components/Podium.jsx';
import Countdown from '../components/Countdown.jsx';
import PitWallPreview from '../components/PitWallPreview.jsx';
import RacingHelmet from '../components/RacingHelmet.jsx';
import './Landing.css';

const LINKS = [
  { to: '/standings', icon: '🏆', title: 'Standings', text: 'Replay the championship round by round.' },
  { to: '/schedule', icon: '📅', title: 'Schedule', text: 'Every session in your time zone.' },
  { to: '/tracks', icon: '🗺️', title: 'Tracks', text: 'Circuit maps and every pit strategy.' },
  { to: '/drivers', icon: <RacingHelmet size={34} />, title: 'Driver Spotlight', text: 'Stats, teammate battles and news.' },
  { to: '/pit-wall', icon: '⭐', title: 'My Pit Wall', text: 'Everything you follow, in one place.' },
];

export default function Landing() {
  const { data: season, error, loading } = useSeason();
  return (
    <section className="page landing">
      <Hero eyebrow="F1 2026 · Unofficial fan site">
        <h1>Pit <span>Box</span></h1>
        <p>Your one-stop strategy for all things F1 2026: standings, schedule, tyre strategies, drivers and the news that matters.</p>
      </Hero>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {season && <LandingBody season={season} />}
    </section>
  );
}

function LandingBody({ season }) {
  const history = useMemo(() => computeStandingsHistory(season.races), [season]);
  const drivers = useMemo(() => titleFight(history, season.races, 'drivers'), [history, season]);
  const teams = useMemo(() => titleFight(history, season.races, 'constructors'), [history, season]);
  const next = nextRace(season.races, getNow());
  const latest = [...season.races].reverse().find((r) => r.results.length);
  const raceName = (round) => season.races.find((r) => r.round === round)?.name ?? `round ${round}`;
  const done = season.races.filter((r) => r.results.length).length;

  return (
    <>
      <div className="landing__fights">
        <GapMeter fight={drivers} title="Drivers' title" nameOf={driverName(season)} colorOf={driverColor(season)} raceName={raceName} />
        <GapMeter fight={teams} title="Constructors' title" nameOf={(id) => teamShortName(id, season.constructors[id]?.name)} colorOf={teamColor} raceName={raceName} />
      </div>

      <div className="landing__row">
        {next ? (
          <motion.section className="panel landing__next" aria-labelledby="next-h" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="tag">Round {next.round} of {season.races.length}</span>
            {next.sprint && <span className="tag tag--sprint">Sprint</span>}
            <h2 id="next-h"><span aria-hidden="true">{flag(next.country)} </span>{next.name}</h2>
            <p className="muted">{next.circuitName} · {next.locality}</p>
            <Countdown to={next.start} label="Lights out in" />
            <div className="landing__actions">
              <Link className="btn btn--primary" to={`/tracks/${next.round}`}>Track guide</Link>
              <Link className="btn" to="/schedule">Full schedule</Link>
            </div>
          </motion.section>
        ) : (
          <section className="panel landing__next"><h2>Season complete</h2><p className="muted">See you in 2027.</p></section>
        )}
        {latest && <Podium season={season} race={latest} />}
      </div>

      <PitWallPreview season={season} />

      <nav className="landing__links" aria-label="Explore Pit Box">
        {LINKS.map((l, i) => (
          <motion.div key={l.to} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
            <Link to={l.to} className="landing__link">
              <span className="landing__icon" aria-hidden="true">{l.icon}</span>
              <b>{l.title}</b>
              <small className="muted">{l.text}</small>
            </Link>
          </motion.div>
        ))}
      </nav>
      <div className="landing__foot">
        <p className="source-note">{done} of {season.races.length} rounds complete.</p>
        <SourceNote data={season} />
      </div>
    </>
  );
}
