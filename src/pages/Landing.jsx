import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeason } from '../lib/useSeason.js';
import { computeStandingsHistory, titleFight } from '../lib/standingsHistory.js';
import { nextRace } from '../lib/schedule.js';
import { teamColor, teamShortName } from '../lib/teams.js';
import { getNow } from '../lib/now.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import Hero from '../components/Hero.jsx';
import GapMeter, { driverName, driverColor } from '../components/GapMeter.jsx';
import Podium from '../components/Podium.jsx';
import PitWallPreview from '../components/PitWallPreview.jsx';
import Icon from '../components/Icon.jsx';
import './Landing.css';

const LINKS = [
  { to: '/standings', icon: <Icon name="trophy" size={28} />, title: 'Standings', text: 'Replay the championship round by round.' },
  { to: '/schedule', icon: <Icon name="calendar" size={28} />, title: 'Schedule', text: 'Every session in your time zone.' },
  { to: '/tracks', icon: <Icon name="route" size={28} />, title: 'Tracks', text: 'Circuit maps and every pit strategy.' },
  { to: '/drivers', icon: <Icon name="helmet" size={28} />, title: 'Drivers', text: 'Stats, teammate battles and news.' },
  { to: '/pit-wall', icon: <Icon name="star" size={28} />, title: 'My Pit Wall', text: 'Everything you follow, in one place.' },
];

export default function Landing() {
  const { data: season, error, loading } = useSeason();
  return (
    <section className="page landing">
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
  const champions = { drivers: drivers?.championId ?? null, constructors: teams?.championId ?? null };
  const done = season.races.filter((r) => r.results.length).length;

  return (
    <>
      <Hero season={season} race={next} />

      <div className="landing__fights">
        <GapMeter fight={drivers} title="Drivers' title" nameOf={driverName(season)} colorOf={driverColor(season)} raceName={raceName} />
        <GapMeter fight={teams} title="Constructors' title" nameOf={(id) => teamShortName(id, season.constructors[id]?.name)} colorOf={teamColor} raceName={raceName} />
        {latest && <Podium season={season} race={latest} championId={champions.drivers} />}
      </div>

      <PitWallPreview season={season} champions={champions} />

      <nav className="landing__links" aria-label="Explore Pit Box">
        {LINKS.map((l, i) => (
          <motion.div key={l.to} initial={{ opacity: 0.6, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
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
