import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { countdownParts } from '../lib/schedule.js';
import { getNow } from '../lib/now.js';
import './Countdown.css';

export default function Countdown({ to, label = 'Lights out in' }) {
  const target = Date.parse(to);
  const [now, setNow] = useState(() => getNow().getTime());
  useEffect(() => {
    const offset = getNow().getTime() - Date.now(); // honour ?now= overrides while ticking
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, []);
  const p = countdownParts(target - now);
  if (target <= now) return <p className="countdown__done">Session under way</p>;
  return (
    <div className="countdown" role="timer" aria-label={`${label} ${p.days} days ${p.hours} hours ${p.minutes} minutes`}>
      <span className="countdown__label">{label}</span>
      <div className="countdown__units">
        {[['days', 'D'], ['hours', 'H'], ['minutes', 'M'], ['seconds', 'S']].map(([k, u]) => (
          <span key={k} className="countdown__unit">
            <b className="countdown__digits">
              {/* Each changing value flips down into place, like a timing board. */}
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={p[k]}
                  initial={{ y: '-100%', opacity: 0, rotateX: 70 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  exit={{ y: '100%', opacity: 0, rotateX: -70 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  {String(p[k]).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </b>
            <small>{u}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
