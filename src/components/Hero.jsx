import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { flag } from '../lib/flags.js';
import { getNow } from '../lib/now.js';
import { raceLights } from '../lib/raceLights.js';
import Countdown from './Countdown.jsx';
import './Hero.css';

const SEEN_KEY = 'pitbox.lightsSeen';
const STEP_MS = 420; // one light column every 0.42s, like a real start

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}

/** Keep "now" fresh enough for the lights (they only change every few hours). */
function useNow(everyMs) {
  const [now, setNow] = useState(() => getNow().getTime());
  useEffect(() => {
    const offset = getNow().getTime() - Date.now(); // honour ?now= overrides
    const id = setInterval(() => setNow(Date.now() + offset), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/**
 * Landing hero, built around the next race weekend. The five start lights fill up as race day
 * gets closer (all five lit on race day) and go out when the race starts. On the first visit
 * of a session the lights step on one by one up to the current count; later visits and reduced
 * motion show the count straight away.
 */
export default function Hero({ season, race }) {
  const reduce = useReducedMotion();
  const [animate] = useState(() => !reduce && !alreadySeen());
  const now = useNow(60_000);
  const { lit, phase } = raceLights(season.races, race, now);
  const [shown, setShown] = useState(animate ? 0 : 5);

  useEffect(() => {
    if (!animate) return undefined;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    const timers = [];
    for (let i = 1; i <= 5; i++) timers.push(setTimeout(() => setShown(i), i * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const on = Math.min(lit, shown);
  const status = phase === 'out' ? 'Lights out and away we go'
    : phase === 'done' ? 'Season complete'
    : lit === 5 ? 'Race day · all lights on'
    : `${lit} / 5 · Lights fill as race day nears`;

  return (
    <header className="hero" aria-labelledby="hero-race">
      <div className={`hero__speed${phase === 'out' ? ' is-running' : ''}`} aria-hidden="true" />
      <div className="hero__grid">
        <div className="hero__main">
          <span className="tag hero__brand">F1 2026 · Unofficial fan site</span>
          {race ? (
            <>
              <p className="hero__round">
                Next race · Round {race.round} of {season.races.length}
                {race.sprint && <span className="tag tag--sprint">Sprint</span>}
              </p>
              <h2 id="hero-race" className="hero__race"><span aria-hidden="true">{flag(race.country)} </span>{race.name}</h2>
              <p className="hero__venue">{race.circuitName} · {race.locality}</p>
              <Countdown to={race.start} label="Lights out in" />
              <div className="hero__actions">
                <Link className="btn btn--primary" to={`/tracks/${race.round}`}>Track guide</Link>
                <Link className="btn" to="/schedule">Full schedule</Link>
              </div>
            </>
          ) : (
            <>
              <h2 id="hero-race" className="hero__race">Season complete</h2>
              <p className="hero__venue">See you in 2027.</p>
            </>
          )}
        </div>
        <div className="hero__gantry" aria-hidden="true">
          <div className="hero__lights">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="hero__pod">
                <i className={on >= n ? 'on' : ''} />
                <i className={on >= n ? 'on' : ''} />
              </span>
            ))}
          </div>
          <p className="hero__status">{status}</p>
        </div>
      </div>
      <div className="hero__kerb" aria-hidden="true" />
    </header>
  );
}
