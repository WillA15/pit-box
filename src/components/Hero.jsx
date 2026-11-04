import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './Hero.css';

const SEEN_KEY = 'pitbox.lightsSeen';
const STEP_MS = 420; // one light column every 0.42s, like a real start
const HOLD_MS = 700;

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}

/**
 * Landing hero: a five-light start sequence ("lights out and away we go"), then the headline
 * launches in over moving speed lines. The sequence plays once per visit; with reduced motion
 * (or on later visits) everything is shown immediately.
 */
export default function Hero({ eyebrow, children }) {
  const reduce = useReducedMotion();
  const [skip] = useState(() => reduce || alreadySeen());
  const [lit, setLit] = useState(skip ? 0 : 0);
  const [out, setOut] = useState(skip);

  useEffect(() => {
    if (skip) return undefined;
    const timers = [];
    for (let i = 1; i <= 5; i++) timers.push(setTimeout(() => setLit(i), i * STEP_MS));
    timers.push(setTimeout(() => {
      setOut(true);
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    }, 5 * STEP_MS + HOLD_MS));
    return () => timers.forEach(clearTimeout);
  }, [skip]);

  return (
    <header className={`hero${out ? ' hero--go' : ''}`}>
      <div className="hero__speed" aria-hidden="true" />
      <div className="hero__lights" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="hero__pod">
            <i className={!out && lit >= n ? 'on' : ''} />
            <i className={!out && lit >= n ? 'on' : ''} />
          </span>
        ))}
      </div>
      <p className="hero__status" aria-hidden="true">{out ? 'Lights out and away we go' : lit ? `${lit} / 5` : 'Formation lap'}</p>
      <motion.div
        className="hero__text"
        initial={skip ? false : { opacity: 0, x: -60, skewX: -8 }}
        animate={out ? { opacity: 1, x: 0, skewX: 0 } : { opacity: 0, x: -60, skewX: -8 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
      >
        <span className="tag">{eyebrow}</span>
        {children}
      </motion.div>
      <div className="hero__kerb" aria-hidden="true" />
    </header>
  );
}
