import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { flag } from '../lib/flags.js';
import Countdown from './Countdown.jsx';
import './Hero.css';

// The race scene only appears on screens at least this wide; below it the hero stacks into one
// column and there's no room beside the text. Not rendered at all there, so phones don't download the car images.
const SCENE_QUERY = '(min-width: 761px)';
const subscribeScene = (cb) => {
  const mq = window.matchMedia(SCENE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useShowScene = () => useSyncExternalStore(subscribeScene, () => window.matchMedia(SCENE_QUERY).matches, () => false);

/** Landing hero: the Pit Box title and next race weekend on the left, a photo finish on a diagonal track to the right. */
export default function Hero({ season, race }) {
  const heroRef = useRef(null);
  const gridRef = useRef(null);
  const showScene = useShowScene();
  useTrackGeometry(heroRef, gridRef, showScene);

  return (
    <header className="hero" ref={heroRef}>
      <div className="hero__speed" aria-hidden="true" />
      {showScene && <RaceScene />}
      <div className="hero__grid" ref={gridRef}>
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
                <Link className="btn btn--primary" to="/schedule">Full schedule</Link>
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
    </header>
  );
}

/**
 * A still photo finish: a strip of track laid out horizontally (kerbs, two lanes, a chequered
 * finish line, the cars nose to nose), then rotated so it runs from the top edge, just right of
 * the race details, down to the bottom-right corner.
 */
function RaceScene() {
  return (
    <div className="hero__scene" aria-hidden="true">
      <div className="hero__road">
        <div className="hero__kerb hero__kerb--top" />
        <div className="hero__lanes">
          <div className="hero__finish" />
          <div className="hero__car hero__car--red"><img src="/images/car-top-red.png" alt="" width="240" height="98" /></div>
          <div className="hero__car hero__car--grey"><img src="/images/car-top.png" alt="" width="240" height="97" /></div>
        </div>
        <div className="hero__kerb hero__kerb--bottom" />
      </div>
    </div>
  );
}

/**
 * The track's angle depends on the hero's shape, so measure it: where the race details end
 * (the scene starts just right of them) and the size of the area left over. Sets CSS variables
 * on the hero: --scene-left (px), --road-angle (deg) and --road-length (px).
 */
function useTrackGeometry(heroRef, gridRef, enabled) {
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const grid = gridRef.current;
    if (!enabled || !hero || !grid || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const h = hero.getBoundingClientRect();
      // Right edge of the widest piece of text (the title, or a line of race detail). The column
      // itself stretches wider than its content, so measure what's inside it.
      const pieces = [...grid.querySelectorAll('.hero__title > *, .hero__main > *')];
      const contentRight = Math.max(...pieces.map((c) => c.getBoundingClientRect().right));
      const left = Math.round(contentRight - h.left + 24);
      const w = h.width - left;
      const ht = h.height;
      // The road starts at (20, -100) in the scene (see .hero__road) and ends past the bottom-right corner.
      const dx = w + 60;
      const dy = ht + 160;
      hero.style.setProperty('--scene-left', `${left}px`);
      hero.style.setProperty('--road-angle', `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`);
      hero.style.setProperty('--road-length', `${Math.hypot(dx, dy)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(hero);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [heroRef, gridRef, enabled]);
}
