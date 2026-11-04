import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './TrackMap.css';

/** Position on the outline at lap fraction t (points are [x, y, t]). */
export function pointAt(points, t) {
  if (!points?.length) return [0, 0];
  if (t <= points[0][2]) return points[0];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1, t1] = points[i];
    if (t <= t1) {
      const [x0, y0, t0] = points[i - 1];
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
    }
  }
  return points.at(-1);
}

/**
 * Circuit outline drawn from real car-position data.
 * - `animated`: the outline draws itself, then a dot laps it at the car's real pace (sped up).
 * - `speedup`: how many times faster than the real lap the dot moves.
 */
export default function TrackMap({ outline, color = 'var(--accent)', animated = true, speedup = 4, label, className = '', legend = false }) {
  const reduce = useReducedMotion();
  const dot = useRef(null);
  const d = useMemo(() => {
    if (!outline?.points?.length) return '';
    return outline.points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z';
  }, [outline]);
  const pitD = useMemo(
    () => (outline?.pitLane?.length ? outline.pitLane.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') : ''),
    [outline],
  );

  const moving = animated && !reduce && outline?.lapSeconds;
  useEffect(() => {
    if (!moving) return undefined;
    const lapMs = (outline.lapSeconds * 1000) / speedup;
    const drawDelay = 1600; // wait for the outline to finish drawing
    let raf = 0;
    const start = performance.now() + drawDelay;
    const tick = (now) => {
      const t = now < start ? 0 : ((now - start) % lapMs) / lapMs;
      const [x, y] = pointAt(outline.points, t);
      dot.current?.setAttribute('transform', `translate(${x} ${y})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moving, outline, speedup]);

  if (!outline) {
    return <div className={`track-map track-map--empty ${className}`}><span className="muted">Map unavailable</span></div>;
  }
  const [sx, sy] = outline.points[0];
  const svg = (
    <svg
      className={`track-map ${className}`}
      viewBox={`0 0 ${outline.width} ${outline.height}`}
      role="img"
      aria-label={label ?? 'Circuit map'}
      style={{ '--map-color': color }}
    >
      <path className="track-map__base" d={d} />
      {/* Pit lane: above the circuit's dark border (so it shows wherever it leaves the track), below the racing line. */}
      {pitD && <path className="track-map__pit-base" d={pitD} />}
      {pitD && (
        <motion.path
          className="track-map__pit"
          d={pitD}
          // Fade in after the circuit has drawn. (pathLength would override the dash pattern.)
          initial={animated && !reduce ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4, ease: 'easeOut' }}
        >
          <title>Pit lane</title>
        </motion.path>
      )}
      <motion.path
        className="track-map__line"
        d={d}
        initial={animated && !reduce ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      {/* Start / finish marker */}
      <rect className="track-map__start" x={sx - 6} y={sy - 18} width="12" height="36" rx="2" transform={`rotate(0 ${sx} ${sy})`} />
      {moving && (
        <g ref={dot} transform={`translate(${sx} ${sy})`}>
          <circle className="track-map__glow" r="26" />
          <circle className="track-map__dot" r="13" />
        </g>
      )}
    </svg>
  );
  if (!legend) return svg;
  return (
    <figure className="track-map__figure" style={{ "--map-color": color }}>
      {svg}
      <figcaption className="track-map__legend">
        <span><i className="track-map__key track-map__key--track" /> Circuit</span>
        {pitD && <span><i className="track-map__key track-map__key--pit" /> Pit lane</span>}
        <span><i className="track-map__key track-map__key--start" /> Start / finish</span>
      </figcaption>
    </figure>
  );
}
