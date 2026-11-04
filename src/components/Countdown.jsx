import { useEffect, useState } from 'react';
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
            <b>{String(p[k]).padStart(2, '0')}</b>
            <small>{u}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
