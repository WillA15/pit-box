import { describe, it, expect } from 'vitest';
import { buildStrategies, summarizeRaceControl, formatLapTime } from '../../src/lib/f1/stints.js';

describe('formatLapTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatLapTime(84.123)).toBe('1:24.123');
    expect(formatLapTime(59.5)).toBe('59.500');
    expect(formatLapTime(null)).toBeNull();
  });
});

describe('buildStrategies', () => {
  const drivers = [{ driver_number: 1 }, { driver_number: 12 }];
  const stints = [
    { driver_number: 1, stint_number: 2, compound: 'HARD', lap_start: 21, lap_end: null, tyre_age_at_start: 0 },
    { driver_number: 1, stint_number: 1, compound: 'MEDIUM', lap_start: 1, lap_end: 20, tyre_age_at_start: 0 },
    { driver_number: 12, stint_number: 1, compound: 'soft', lap_start: 1, lap_end: 50, tyre_age_at_start: 3 },
  ];
  const pits = [
    { driver_number: 1, lap_number: 20, stop_duration: 2.4, lane_duration: 21.9 },
    { driver_number: 12, lap_number: 1, stop_duration: null, pit_duration: null },
  ];
  const laps = [
    { driver_number: 1, lap_number: 1, lap_duration: 95.0, is_pit_out_lap: false },
    { driver_number: 1, lap_number: 21, lap_duration: 80.0, is_pit_out_lap: true },
    { driver_number: 1, lap_number: 50, lap_duration: 82.5, is_pit_out_lap: false },
    { driver_number: 12, lap_number: 50, lap_duration: 83.0, is_pit_out_lap: false },
  ];
  const out = buildStrategies({ stints, pits, laps, drivers });
  const one = out.find((d) => d.number === 1);
  const ant = out.find((d) => d.number === 12);

  it('orders stints and fills an open final stint to laps completed', () => {
    expect(one.stints.map((s) => s.compound)).toEqual(['MEDIUM', 'HARD']);
    expect(one.stints[1].lapEnd).toBe(50);
  });
  it('counts laps per compound', () => {
    expect(one.lapsByCompound).toEqual({ MEDIUM: 20, HARD: 30 });
    expect(ant.lapsByCompound).toEqual({ SOFT: 50 });
  });
  it('ignores untimed lap-1 pit rows and counts real stops', () => {
    expect(one.stopCount).toBe(1);
    expect(ant.stopCount).toBe(0);
  });
  it('excludes pit-out laps from fastest lap', () => {
    expect(one.fastestLap.lap).toBe(50);
    expect(one.fastestLap.time).toBe('1:22.500');
  });
});

describe('summarizeRaceControl', () => {
  it('counts red flags given only as a message', () => {
    expect(summarizeRaceControl([{ message: 'RED FLAG - RACE SUSPENDED', flag: null }]).redFlags).toBe(1);
  });
  it('separates SC, VSC and red flags', () => {
    expect(
      summarizeRaceControl([
        { message: 'SAFETY CAR DEPLOYED' },
        { message: 'VIRTUAL SAFETY CAR DEPLOYED' },
        { message: 'SAFETY CAR IN THIS LAP' },
        { flag: 'RED', message: 'RED FLAG' },
      ]),
    ).toEqual({ safetyCars: 1, virtualSafetyCars: 1, redFlags: 1 });
  });
});

describe('red-flag tyre changes', () => {
  it('are kept as markers but not counted as pit stops', () => {
    const [d] = buildStrategies({
      drivers: [{ driver_number: 44 }],
      stints: [
        { driver_number: 44, stint_number: 1, compound: 'SOFT', lap_start: 1, lap_end: 27 },
        { driver_number: 44, stint_number: 2, compound: 'MEDIUM', lap_start: 28, lap_end: 45 },
        { driver_number: 44, stint_number: 3, compound: 'SOFT', lap_start: 46, lap_end: 71 },
      ],
      pits: [
        { driver_number: 44, lap_number: 27, lane_duration: 22.7, stop_duration: null },
        { driver_number: 44, lap_number: 45, lane_duration: 2309.6, stop_duration: null },
      ],
      laps: [{ driver_number: 44, lap_number: 71, lap_duration: 80 }],
    });
    expect(d.stopCount).toBe(1);
    expect(d.pits.map((p) => p.suspended)).toEqual([false, true]);
  });
});

describe('pit-lane drive-throughs on the same tyres', () => {
  // Singapore 2026 sprint: safety car led the field through the pit lane on laps 2-4.
  const [d] = buildStrategies({
    drivers: [{ driver_number: 1 }],
    stints: [
      { driver_number: 1, stint_number: 1, compound: 'INTERMEDIATE', lap_start: 1, lap_end: 2, tyre_age_at_start: 0 },
      { driver_number: 1, stint_number: 2, compound: 'INTERMEDIATE', lap_start: 3, lap_end: 3, tyre_age_at_start: 2 },
      { driver_number: 1, stint_number: 3, compound: 'INTERMEDIATE', lap_start: 4, lap_end: 4, tyre_age_at_start: 3 },
      { driver_number: 1, stint_number: 4, compound: 'INTERMEDIATE', lap_start: 5, lap_end: 20, tyre_age_at_start: 4 },
    ],
    pits: [2, 3, 4].map((lap) => ({ driver_number: 1, lap_number: lap, lane_duration: 19, stop_duration: null })),
    laps: [{ driver_number: 1, lap_number: 20, lap_duration: 100 }],
  });
  it('merges into one stint and counts no stops', () => {
    expect(d.stints).toEqual([{ n: 1, compound: 'INTERMEDIATE', lapStart: 1, lapEnd: 20, tyreAge: 0 }]);
    expect(d.stopCount).toBe(0);
    expect(d.pits.every((p) => p.driveThrough)).toBe(true);
  });
  it('keeps a real change to a fresh set of the same compound', () => {
    const [e] = buildStrategies({
      drivers: [{ driver_number: 2 }],
      stints: [
        { driver_number: 2, stint_number: 1, compound: 'HARD', lap_start: 1, lap_end: 30, tyre_age_at_start: 0 },
        { driver_number: 2, stint_number: 2, compound: 'HARD', lap_start: 31, lap_end: 60, tyre_age_at_start: 0 },
      ],
      pits: [{ driver_number: 2, lap_number: 30, lane_duration: 22, stop_duration: 2.4 }],
      laps: [],
    });
    expect(e.stints).toHaveLength(2);
    expect(e.stopCount).toBe(1);
  });
});
