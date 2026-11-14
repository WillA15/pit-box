import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCareers } from '../../src/lib/f1/careers.js';

const readData = (name) => JSON.parse(readFileSync(new URL(`../../public/data/${name}`, import.meta.url), 'utf8'));

/** Fake Jolpica: answers each route with a canned total and records every URL asked for. */
function fakeJolpica(totals) {
  const urls = [];
  const getJSONImpl = async (url) => {
    urls.push(url);
    if (url.includes('/seasons/')) return { MRData: { SeasonTable: { Seasons: [{ season: '2026' }] } } };
    const hit = Object.entries(totals).find(([route]) => url.includes(route));
    return { MRData: { total: String(hit ? hit[1] : 0) } };
  };
  return { urls, getJSONImpl };
}

describe('buildCareers', () => {
  const season = { season: 2026, drivers: { hamilton: {} } };

  it('counts poles from grid slot 1, not the qualifying/1 filter', async () => {
    const { urls, getJSONImpl } = fakeJolpica({
      '/drivers/hamilton/grid/1/results/': 105,
      // Jolpica's qualifying/1 matches a driver who topped any Q session, so it over-counts.
      '/drivers/hamilton/qualifying/1/': 120,
    });
    const { careers } = await buildCareers(season, { getJSONImpl });
    expect(careers.hamilton.poles).toBe(105);
    expect(urls.some((u) => u.includes('/drivers/hamilton/grid/1/results/'))).toBe(true);
    expect(urls.some((u) => u.includes('/qualifying'))).toBe(false);
  });

  it('adds wins, seconds and thirds into podiums', async () => {
    const { getJSONImpl } = fakeJolpica({
      '/drivers/hamilton/results/1/': 106,
      '/drivers/hamilton/results/2/': 50,
      '/drivers/hamilton/results/3/': 47,
      '/drivers/hamilton/results/?': 400,
    });
    const { careers } = await buildCareers(season, { getJSONImpl });
    expect(careers.hamilton).toMatchObject({ starts: 400, wins: 106, podiums: 203 });
  });
});

describe('saved career data', () => {
  it('Hamilton has 104 poles before 2026 (official figure)', () => {
    const { careers } = readData('careers.json');
    const { races } = readData('season.json');
    const poles2026 = races.filter((r) => r.qualifying?.find((q) => q.pos === 1)?.driverId === 'hamilton').length;
    expect(careers.hamilton.poles - poles2026).toBe(104);
  });
});
