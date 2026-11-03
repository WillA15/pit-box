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
