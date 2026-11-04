import { describe, it, expect } from 'vitest';
import { lapTimeToSeconds, lapRecordFrom, lastWinnerFrom, simplify, buildOutline, fastestLap, CIRCUIT_FACTS } from '../../src/lib/f1/circuits.js';
import { readFileSync } from 'node:fs';

const res = (season, family, time) => ({
  season: String(season),
  Results: [{ Driver: { givenName: 'X', familyName: family }, Constructor: { name: 'T' }, FastestLap: time ? { Time: { time } } : undefined }],
});

describe('circuit helpers', () => {
  it('parses lap times', () => {
    expect(lapTimeToSeconds('1:20.901')).toBeCloseTo(80.901);
    expect(lapTimeToSeconds('59.5')).toBe(59.5);
    expect(lapTimeToSeconds(null)).toBeNull();
  });
  it('lap record is the fastest time, compared numerically', () => {
    const rec = lapRecordFrom([res(2019, 'Old', '1:21.779'), res(2025, 'New', '1:20.901'), res(2010, 'Slow', '1:24.139'), res(2004, 'None')]);
    expect(rec).toMatchObject({ time: '1:20.901', season: 2025, driver: 'X New' });
  });
  it('last winner ignores the current season', () => {
    expect(lastWinnerFrom([res(2016, 'A'), res(2017, 'B'), res(2026, 'C')], 2026)).toMatchObject({ season: 2017, driver: 'X B' });
    expect(lastWinnerFrom([res(2026, 'C')], 2026)).toBeNull();
  });
  it('simplify keeps endpoints and drops collinear points', () => {
    const line = [[0, 0, 0], [1, 0, 0.1], [2, 0, 0.2], [3, 0, 0.3], [3, 5, 1]];
    expect(simplify(line, 0.5)).toEqual([[0, 0, 0], [3, 0, 0.3], [3, 5, 1]]);
  });
  it('outline fits the box, flips y and records lap fraction', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ x: 100 + i * 100, y: i % 2 ? 50 : 0, date: new Date(1e12 + i * 1000).toISOString() }));
    const o = buildOutline(rows, { tolerance: 0 });
    expect(Math.max(...o.points.map((p) => p[0]))).toBeLessThanOrEqual(1000);
    expect(o.points[0][2]).toBe(0);
    expect(o.points.at(-1)[2]).toBe(1);
    // First point had the lowest y, so it is drawn at the bottom. (0,0 rows = no signal, dropped.)
    expect(o.points[0][1]).toBeGreaterThan(o.points[1][1]);
  });
  it('picks the fastest clean lap', () => {
    expect(fastestLap([
      { lap_duration: 80, is_pit_out_lap: true, date_start: 'x' },
      { lap_duration: 82, is_pit_out_lap: false, date_start: 'x', lap_number: 5 },
      { lap_duration: null, date_start: 'x' },
    ]).lap_number).toBe(5);
  });
  it('has hand-entered facts for every 2026 circuit', () => {
    const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
    for (const r of season.races) expect(CIRCUIT_FACTS[r.circuitId], r.circuitId).toBeTruthy();
  });
});

describe('buildOutline no-signal rows', () => {
  it('drops (0, 0) rows that OpenF1 sends when a car has no position', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ x: i === 3 ? 0 : 100 + i, y: i === 3 ? 0 : 100 + i * 2, date: new Date(1e12 + i * 1000).toISOString() }));
    const o = buildOutline(rows, { tolerance: 0 });
    expect(o.points).toHaveLength(11);
  });
});

import { outlineLooksValid } from '../../src/lib/f1/circuits.js';

describe('layout-aware lap records and outline checks', () => {
  it('ignores laps from before the current layout', () => {
    const races = [res(2005, 'OldLayout', '1:15.641'), res(2025, 'New', '1:15.743')];
    expect(lapRecordFrom(races, 2023).driver).toBe('X New');
    expect(lapRecordFrom(races).driver).toBe('X OldLayout');
  });
  it('rejects frozen GPS feeds with too few distinct positions', () => {
    const frozen = Array.from({ length: 300 }, (_, i) => ({ x: Math.floor(i / 12), y: Math.floor(i / 12) * 3, date: new Date(1e12 + i * 270).toISOString() }));
    const outline = buildOutline(frozen.map((r) => ({ ...r, x: r.x + 1 })));
    expect(outlineLooksValid(frozen, outline)).toBe(false);
  });
});

import { findPitLane } from '../../src/lib/f1/circuits.js';

describe('findPitLane', () => {
  // Build a trace: racing at 700 dm/s, then 25s at 200 dm/s (pit limiter) with a 3s stop, then racing.
  const trace = () => {
    const rows = [];
    let x = 1000;
    let t = 1e12;
    const push = (speed, seconds) => {
      for (let s = 0; s < seconds; s += 0.27) { x += speed * 0.27; t += 270; rows.push({ x: Math.round(x), y: 500, date: new Date(t).toISOString() }); }
    };
    push(700, 15); push(200, 11); push(0, 3); push(200, 11); push(700, 15);
    return rows;
  };
  it('returns the slow stretch through the pit lane', () => {
    const lane = findPitLane(trace());
    const secs = (Date.parse(lane.at(-1).date) - Date.parse(lane[0].date)) / 1000;
    expect(secs).toBeGreaterThan(24);
    expect(secs).toBeLessThan(28);
  });
  it('rejects a trace with no pit-speed stretch (just a slow corner)', () => {
    const rows = [];
    let x = 0;
    for (let i = 0; i < 200; i++) { x += i % 50 < 6 ? 60 : 200; rows.push({ x, y: 1, date: new Date(1e12 + i * 270).toISOString() }); }
    expect(findPitLane(rows)).toBeNull();
  });
  it('draws the pit lane in the same frame as the outline', () => {
    const lap = Array.from({ length: 40 }, (_, i) => ({ x: 100 + Math.cos(i / 6.4) * 1000, y: 100 + Math.sin(i / 6.4) * 1000, date: new Date(1e12 + i * 2000).toISOString() }));
    const pit = Array.from({ length: 10 }, (_, i) => ({ x: 1100 + i, y: 100 + i * 30, date: new Date(1e12 + i * 1000).toISOString() }));
    const o = buildOutline(lap, { pitRows: pit, tolerance: 0 });
    expect(o.pitLane.length).toBeGreaterThan(1);
    for (const [px, py] of o.pitLane) {
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(o.width);
      expect(py).toBeLessThanOrEqual(o.height);
    }
  });
});

describe('findPitLane joins the racing line', () => {
  it('extends through the entry and exit roads until the car is back on the lap trace', () => {
    // Lap trace: a straight along y = 0. Pit trace: on the line, then 300 dm off it, then back on.
    const lapRows = Array.from({ length: 200 }, (_, i) => ({ x: i * 100, y: 0, date: new Date(1e12 + i * 140).toISOString() }));
    const rows = [];
    let t = 1e12;
    const add = (x, y) => { t += 270; rows.push({ x: Math.round(x), y: Math.round(y), date: new Date(t).toISOString() }); };
    let x = 0;
    for (let i = 0; i < 20; i++) add((x += 190), 0);            // racing line, fast
    for (let i = 0; i < 8; i++) add((x += 120), (i + 1) * 37);  // entry road, braking, moving off-line
    for (let i = 0; i < 90; i++) add((x += 55), 300);           // pit lane at limiter speed
    for (let i = 0; i < 8; i++) add((x += 120), 300 - (i + 1) * 37); // exit road
    for (let i = 0; i < 20; i++) add((x += 190), 0);            // back on track
    const lane = findPitLane(rows, { lapRows });
    expect(lane[0].y).toBeLessThanOrEqual(70);
    expect(lane.at(-1).y).toBeLessThanOrEqual(70);
    expect(lane.some((r) => r.y === 300)).toBe(true);
  });
});

describe('pit lane sanity checks', () => {
  it('rejects traces that wander far from the circuit', () => {
    const lapRows = Array.from({ length: 100 }, (_, i) => ({ x: i * 100, y: 0, date: new Date(1e12 + i * 140).toISOString() }));
    const rows = Array.from({ length: 120 }, (_, i) => ({ x: 2000 + i * 55, y: 5000, date: new Date(1e12 + i * 270).toISOString() }));
    expect(findPitLane(rows, { lapRows })).toBeNull();
  });
  it('snaps pit lane ends onto the circuit', () => {
    const lap = Array.from({ length: 60 }, (_, i) => ({ x: Math.cos(i / 9.5) * 5000, y: Math.sin(i / 9.5) * 5000, date: new Date(1e12 + i * 1500).toISOString() }));
    const pit = Array.from({ length: 12 }, (_, i) => ({ x: 5300, y: -1500 + i * 250, date: new Date(1e12 + i * 2000).toISOString() }));
    const o = buildOutline(lap, { pitRows: pit, tolerance: 0 });
    const onTrack = (p) => o.points.some((q) => q[0] === p[0] && q[1] === p[1]);
    expect(onTrack(o.pitLane[0])).toBe(true);
    expect(onTrack(o.pitLane.at(-1))).toBe(true);
  });
});
