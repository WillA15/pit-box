import { useRef } from 'react';
import './RoundTrack.css';

/**
 * Round picker: one large, clickable stop per round on a rail. Drag anywhere along it and
 * it snaps to the nearest round. `t` is the (possibly fractional) round index, so the fill
 * and thumb glide smoothly during playback.
 *
 * Keyboard: ← → (or ↑ ↓) step one round, Home / End jump to first / last.
 */
export default function RoundTrack({ rounds, races, t, onSelect, label = 'Choose round' }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const n = rounds.length;
  const current = Math.round(t);
  const pct = n > 1 ? t / (n - 1) : 0;
  const nameOf = (round) => races.find((r) => r.round === round)?.name ?? `Round ${round}`;

  const indexFromX = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    const col = rect.width / n;
    return Math.min(n - 1, Math.max(0, Math.floor((clientX - rect.left) / col)));
  };
  const focusStop = (i) => ref.current?.querySelectorAll('.round-track__stop')[i]?.focus();
  const choose = (i, { focus = false } = {}) => {
    const clamped = Math.min(n - 1, Math.max(0, i));
    onSelect(clamped);
    if (focus) focusStop(clamped);
  };

  return (
    <div
      ref={ref}
      className="round-track"
      role="group"
      aria-label={label}
      style={{ '--n': n, '--pct': pct }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        choose(indexFromX(e.clientX));
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const i = indexFromX(e.clientX);
        if (i !== current) choose(i);
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={(e) => {
        const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (e.key === 'Home') { e.preventDefault(); choose(0, { focus: true }); }
        else if (e.key === 'End') { e.preventDefault(); choose(n - 1, { focus: true }); }
        else if (delta) { e.preventDefault(); choose(current + delta, { focus: true }); }
      }}
    >
      <div className="round-track__rail" aria-hidden="true">
        <div className="round-track__fill" />
        <div className="round-track__thumb" />
      </div>
      <div className="round-track__stops">
        {rounds.map((r, i) => {
          const race = races.find((x) => x.round === r);
          return (
            <button
              key={r}
              type="button"
              className={`round-track__stop${i === current ? ' is-on' : ''}${i < t ? ' is-past' : ''}${race?.sprint ? ' is-sprint' : ''}`}
              aria-pressed={i === current}
              aria-label={`Round ${r}: ${nameOf(r)}`}
              title={`R${r} · ${nameOf(r)}`}
              tabIndex={i === current ? 0 : -1}
              // Pointerdown on the group already selects (so dragging works); click covers
              // keyboard Enter/Space, assistive tech and synthetic clicks. Re-selecting is harmless.
              onClick={() => choose(i)}
            >
              <span className="round-track__dot" aria-hidden="true" />
              <span className="round-track__num">{r}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
