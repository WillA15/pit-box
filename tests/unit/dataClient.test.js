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
