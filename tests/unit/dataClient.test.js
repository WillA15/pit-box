import { describe, it, expect } from 'vitest';
import { loadWithFallback } from '../../src/lib/dataClient.js';

describe('loadWithFallback', () => {
  it('uses live data when the API works', async () => {
    const out = await loadWithFallback('/live', '/snap', { fetcher: async (u) => ({ from: u }) });
    expect(out).toEqual({ from: '/live', source: 'live' });
  });
  it('falls back to the snapshot when the API fails', async () => {
    const fetcher = async (u) => { if (u === '/live') throw new Error('down'); return { from: u }; };
    expect(await loadWithFallback('/live', '/snap', { fetcher })).toEqual({ from: '/snap', source: 'snapshot' });
  });
});

import { createResource } from '../../src/lib/dataClient.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const deferred = () => { let resolve, reject; const p = new Promise((a, b) => { resolve = a; reject = b; }); return { p, resolve, reject }; };

describe('createResource', () => {
  it('shows the snapshot first, then upgrades to live', async () => {
    const live = deferred();
    const r = createResource('/live', '/snap', { fetcher: (u) => (u === '/live' ? live.p : Promise.resolve({ v: 'snap' })) });
    await tick();
    expect(r.get().data).toEqual({ v: 'snap', source: 'snapshot' });
    live.resolve({ v: 'live' });
    await tick();
    expect(r.get().data).toEqual({ v: 'live', source: 'live' });
  });
  it('never downgrades live to snapshot', async () => {
    const snap = deferred();
    const r = createResource('/live', '/snap', { fetcher: (u) => (u === '/live' ? Promise.resolve({ v: 'live' }) : snap.p) });
    await tick();
    snap.resolve({ v: 'snap' });
    await tick();
    expect(r.get().data.source).toBe('live');
  });
  it('errors only when both sources fail', async () => {
    const r = createResource('/live', '/snap', { fetcher: () => Promise.reject(new Error('x')) });
    await tick(); await tick();
    expect(r.get().error).toBeTruthy();
    expect(r.get().loading).toBe(false);
  });
});

describe('createResource without a live URL', () => {
  it('uses the snapshot only, and errors if it fails', async () => {
    const ok = createResource(null, '/snap', { fetcher: async () => ({ v: 1 }) });
    await tick();
    expect(ok.get().data).toEqual({ v: 1, source: 'snapshot' });
    const bad = createResource(null, '/snap', { fetcher: () => Promise.reject(new Error('x')) });
    await tick(); await tick();
    expect(bad.get().error).toBeTruthy();
  });
});

describe('liveLoading', () => {
  it('is true while live is pending, false after it succeeds', async () => {
    const live = deferred();
    const r = createResource('/live', '/snap', { fetcher: (u) => (u === '/live' ? live.p : Promise.resolve({ v: 'snap' })) });
    expect(r.get().liveLoading).toBe(true);
    live.resolve({ v: 'live' });
    await tick();
    expect(r.get().liveLoading).toBe(false);
  });
  it('is false after live fails (snapshot stays)', async () => {
    const r = createResource('/live', '/snap', { fetcher: (u) => (u === '/live' ? Promise.reject(new Error('x')) : Promise.resolve({ v: 1 })) });
    await tick(); await tick();
    expect(r.get().liveLoading).toBe(false);
    expect(r.get().data.source).toBe('snapshot');
  });
  it('is false from the start with no live URL', () => {
    const r = createResource(null, '/snap', { fetcher: async () => ({}) });
    expect(r.get().liveLoading).toBe(false);
  });
});

describe('newer of live and snapshot', () => {
  const run = async (snapRound, liveRound) => {
    const live = deferred();
    const r = createResource('/live', '/snap', {
      fetcher: (u) => (u === '/live' ? live.p : Promise.resolve({ standingsRound: snapRound })),
    });
    await tick();
    live.resolve(liveRound === undefined ? {} : { standingsRound: liveRound });
    await tick();
    return r.get().data;
  };
  it('keeps the snapshot when it has a higher standingsRound', async () => {
    expect((await run(20, 19)).source).toBe('snapshot');
  });
  it('prefers live on a tie or a higher round', async () => {
    expect((await run(19, 19)).source).toBe('live');
    expect((await run(19, 20)).source).toBe('live');
  });
  it('prefers live when the field is missing', async () => {
    expect((await run(20, undefined)).source).toBe('live');
  });
});

describe('retry', () => {
  it('re-runs both fetches and clears the error', async () => {
    let fail = true;
    const r = createResource('/live', '/snap', { fetcher: () => (fail ? Promise.reject(new Error('x')) : Promise.resolve({ v: 1 })) });
    await tick(); await tick();
    expect(r.get().error).toBeTruthy();
    fail = false;
    r.retry();
    await tick(); await tick();
    expect(r.get().error).toBeNull();
    expect(r.get().data.v).toBe(1);
  });
});
