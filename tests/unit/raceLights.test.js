import { describe, it, expect } from 'vitest';
import { raceLights } from '../../src/lib/raceLights.js';

const DAY = 24 * 60 * 60 * 1000;
const prev = { round: 20, start: '2026-11-08T17:00:00Z' };
const next = { round: 21, start: '2026-11-22T04:00:00Z' };
const races = [prev, next];
const at = (iso) => Date.parse(iso);

describe('raceLights', () => {
  it('shows one light just after the previous race', () => {
    expect(raceLights(races, next, at(prev.start) + 60_000)).toEqual({ lit: 1, phase: 'waiting' });
  });
  it('fills to five lights by race day', () => {
    expect(raceLights(races, next, at(next.start) - DAY / 2).lit).toBe(5);
  });
  it('keeps the fifth light for the last 24 hours', () => {
    expect(raceLights(races, next, at(next.start) - 2 * DAY).lit).toBe(4);
  });
  it('is part-way through mid-gap', () => {
    const mid = (at(prev.start) + at(next.start)) / 2;
    expect(raceLights(races, next, mid).lit).toBe(3);
  });
  it('goes out once the race starts', () => {
    expect(raceLights(races, next, at(next.start) + 60_000)).toEqual({ lit: 0, phase: 'out' });
  });
  it('uses a two-week run-up for the opening round', () => {
    const r1 = { round: 1, start: '2026-03-08T04:00:00Z' };
    expect(raceLights([r1], r1, at(r1.start) - 13 * DAY).lit).toBe(1);
  });
  it('reports a finished season', () => {
    expect(raceLights(races, null, Date.now())).toEqual({ lit: 0, phase: 'done' });
  });
});
