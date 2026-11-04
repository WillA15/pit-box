import { motion, useReducedMotion } from 'framer-motion';
import './StrategyStrip.css';

const SHORT = { SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' };
const CSS = { SOFT: 'soft', MEDIUM: 'medium', HARD: 'hard', INTERMEDIATE: 'inter', WET: 'wet' };

/** One driver's race as tyre stints laid out across the race distance. */
export default function StrategyStrip({ stints = [], pits = [], totalLaps, delay = 0, label }) {
  const reduce = useReducedMotion();
  if (!stints.length || !totalLaps) return <span className="strip strip--empty muted">No tyre data</span>;
  const desc = stints.map((s) => `${s.compound.toLowerCase()} laps ${s.lapStart}–${s.lapEnd}`).join(', ');
  return (
    <div className="strip" role="img" aria-label={`${label ? `${label}: ` : ''}${desc}`}>
      {stints.map((s, i) => {
        const left = ((s.lapStart - 1) / totalLaps) * 100;
        const width = (Math.max(1, s.lapEnd - s.lapStart + 1) / totalLaps) * 100;
        const used = s.tyreAge > 0;
        return (
          <motion.span
            key={s.n}
            className={`strip__stint strip__stint--${CSS[s.compound] ?? 'unknown'}${used ? ' strip__stint--used' : ''}`}
            style={{ left: `${left}%`, width: `${width}%`, transformOrigin: 'left center' }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, delay: delay + i * 0.35, ease: 'easeOut' }}
            title={`${s.compound}${used ? ` (used, ${s.tyreAge} laps old)` : ' (new)'} · laps ${s.lapStart}–${s.lapEnd}`}
          >
            {width > 7 && <b>{SHORT[s.compound] ?? '?'}</b>}
          </motion.span>
        );
      })}
      {/* Tyre changes already show each stop, so only red flags get a marker. */}
      {pits.filter((p) => p.suspended || p.laneDuration > 120).map((p) => (
        <span
          key={p.lap}
          className="strip__pit strip__pit--red"
          style={{ left: `${(p.lap / totalLaps) * 100}%` }}
          title={`Red flag on lap ${p.lap} (tyres changed in the pit lane)`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CompoundLegend() {
  return (
    <ul className="compound-legend" aria-label="Tyre compounds">
      {Object.entries(CSS).map(([name, cls]) => (
        <li key={name}><span className={`strip__stint strip__stint--${cls}`} />{name.charAt(0) + name.slice(1).toLowerCase()}</li>
      ))}
      <li><span className="strip__stint strip__stint--medium strip__stint--used" />Used set</li>
      <li><span className="strip__pit strip__pit--legend strip__pit--red" />Red flag</li>
    </ul>
  );
}
