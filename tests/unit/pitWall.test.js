import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { driverSummary, teamSummary, pitWallNews } from '../../src/lib/pitWall.js';
import { computeStandingsHistory } from '../../src/lib/standingsHistory.js';

const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
const history = computeStandingsHistory(season.races);

describe('driverSummary (real data)', () => {
  const s = driverSummary(season, history, 'max_verstappen');
  it('latest race is the most recent completed round', () => {
    const last = season.races.filter((r) => r.results.length).at(-1);
    expect(s.latest.round).toBe(last.round);
    expect(s.latest.label).toBe('P1'); // won Mexico City
  });
  it('keeps the last five results and a points trend ending at the standings total', () => {
    expect(s.recent).toHaveLength(5);
    expect(s.trend.at(-1).points).toBe(s.standing.points);
    expect(s.lastRoundPoints).toBe(25);
  });
});

describe('teamSummary (real data)', () => {
  it('shows both cars from the latest race and the standings total', () => {
    const t = teamSummary(season, history, 'mercedes');
    expect(t.latest.cars).toHaveLength(2);
    expect(t.trend.at(-1).points).toBe(t.standing.points);
  });
});

describe('pitWallNews', () => {
  const now = new Date('2026-11-04T18:00:00Z');
  const item = (title, source, date = '2026-11-04T10:00:00Z') => ({ title, summary: '', link: `https://x/${encodeURIComponent(title)}`, source, date });
  const items = [
    item('Verstappen and Antonelli clash in Mexico', 'A'),
    item('Verstappen wins Mexico City', 'B'),
    item('Ferrari bring new floor to Brazil', 'C'),
    item('Haas confirm Camara for Brazil', 'D'),
  ];
  it('combines followed drivers and teams, de-duplicating shared stories', () => {
    const out = pitWallNews(items, season, { drivers: ['max_verstappen', 'antonelli'], teams: ['ferrari'] }, { now });
    const clash = out.find((s) => s.lead.title.includes('clash'));
    expect(clash.about.sort()).toEqual(['Antonelli', 'Verstappen']);
    expect(out.some((s) => s.about.includes('Ferrari'))).toBe(true);
    expect(out.some((s) => s.lead.title.includes('Haas'))).toBe(false);
  });
  it('returns nothing when nothing is followed', () => {
    expect(pitWallNews(items, season, { drivers: [], teams: [] }, { now })).toEqual([]);
  });
});
