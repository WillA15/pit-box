import { describe, it, expect } from 'vitest';
import { pageTitle } from '../../src/lib/pageTitle.js';

const season = {
  races: [{ round: 20, name: 'Brazilian Grand Prix' }],
  drivers: { hamilton: { givenName: 'Lewis', familyName: 'Hamilton' } },
};

describe('pageTitle', () => {
  it('names the main pages', () => {
    expect(pageTitle('/', null)).toBe('Pit Box');
    expect(pageTitle('/standings', null)).toBe('Standings · Pit Box');
    expect(pageTitle('/schedule', null)).toBe('Schedule · Pit Box');
    expect(pageTitle('/tracks', null)).toBe('Tracks · Pit Box');
    expect(pageTitle('/drivers', null)).toBe('Drivers · Pit Box');
    expect(pageTitle('/pit-wall', null)).toBe('My Pit Wall · Pit Box');
  });
  it('uses the race name for a track page', () => {
    expect(pageTitle('/tracks/20', season)).toBe('Brazilian Grand Prix · Pit Box');
    expect(pageTitle('/tracks/20', null)).toBe('Round 20 · Pit Box');
  });
  it('uses the driver name for a driver page', () => {
    expect(pageTitle('/drivers/hamilton', season)).toBe('Lewis Hamilton · Pit Box');
    expect(pageTitle('/drivers/hamilton', null)).toBe('Drivers · Pit Box');
  });
  it('falls back to not found', () => {
    expect(pageTitle('/nope', season)).toBe('Page not found · Pit Box');
  });
});
