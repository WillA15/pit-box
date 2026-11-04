import { useCallback, useEffect, useRef, useState } from 'react';

const easeOut = (x) => 1 - (1 - x) ** 3;
const linear = (x) => x;
const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const EASES = { out: easeOut, inOut: easeInOut, linear };

/**
 * A number that can be animated with requestAnimationFrame.
 * tweenTo(target, { rate }) moves at `rate` units/second (linear, for playback);
 * tweenTo(target, { duration, ease }) eases over `duration` ms; ease is 'out' (default), 'inOut' or 'linear'.
 */
export function useTween(initial) {
  const [value, setValue] = useState(initial);
  const valueRef = useRef(initial);
  const frame = useRef(0);
  const [running, setRunning] = useState(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setRunning(false);
  }, []);

  const set = useCallback((v) => {
    cancelAnimationFrame(frame.current);
    setRunning(false);
    valueRef.current = v;
    setValue(v);
  }, []);

  const tweenTo = useCallback((target, { rate, duration, ease: easeName, onDone } = {}) => {
    cancelAnimationFrame(frame.current);
    const from = valueRef.current;
    const dist = Math.abs(target - from);
    const ms = rate ? (dist / rate) * 1000 : duration ?? 250;
    const ease = EASES[easeName] ?? (rate ? linear : easeOut);
    if (dist < 1e-6 || ms <= 0) { set(target); onDone?.(); return; }
    const start = performance.now();
    setRunning(true);
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const v = from + (target - from) * ease(p);
      valueRef.current = v;
      setValue(v);
      if (p < 1) frame.current = requestAnimationFrame(step);
      else { setRunning(false); onDone?.(); }
    };
    frame.current = requestAnimationFrame(step);
  }, [set]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { value, set, tweenTo, stop, running, ref: valueRef };
}
