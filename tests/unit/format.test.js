import { describe, it, expect } from 'vitest';
import { ordinal } from '../../src/lib/format.js';

describe('ordinal', () => {
  it('uses st / nd / rd / th', () => {
    expect([1, 2, 3, 4, 12, 21, 22, 23, 101].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '12th', '21st', '22nd', '23rd', '101st']);
  });
  it('uses th for the teens', () => {
    expect([11, 12, 13, 111].map(ordinal)).toEqual(['11th', '12th', '13th', '111th']);
  });
});
