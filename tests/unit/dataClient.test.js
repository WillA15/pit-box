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
