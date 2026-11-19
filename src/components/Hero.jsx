import { Link } from 'react-router-dom';
import { flag } from '../lib/flags.js';
import Countdown from './Countdown.jsx';
import './Hero.css';

/** Landing hero: the next race weekend on the left, the Pit Box title on the right. */
export default function Hero({ season, race }) {
  return (
    <header className="hero">
      <div className="hero__speed" aria-hidden="true" />
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
        <div className="hero__title">
          <h1>Pit <span>Box</span></h1>
          <p>The one-stop strategy for all things F1</p>
        </div>
      </div>
      <div className="hero__kerb" aria-hidden="true" />
    </header>
  );
}
