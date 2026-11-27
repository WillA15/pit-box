import { describe, it, expect } from 'vitest';
import { pointAt, headingAt } from '../../src/components/TrackMap.jsx';

// A square lap, clockwise on screen: right, down, left, up.
const square = [[0, 0, 0], [100, 0, 0.25], [100, 100, 0.5], [0, 100, 0.75], [0, 0, 1]];

describe('pointAt', () => {
  it('interpolates along the lap', () => {
    expect(pointAt(square, 0.125)).toEqual([50, 0]);
    expect(pointAt(square, 0.375)).toEqual([100, 50]);
  });
});

describe('headingAt', () => {
  it('points along each straight', () => {
    expect(headingAt(square, 0.125)).toBeCloseTo(0);
    expect(headingAt(square, 0.375)).toBeCloseTo(90);
    expect(Math.abs(headingAt(square, 0.625))).toBeCloseTo(180);
    expect(headingAt(square, 0.875)).toBeCloseTo(-90);
  });
  it('turns halfway through a corner instead of snapping', () => {
    expect(headingAt(square, 0.25)).toBeCloseTo(45);
  });
  it('wraps across the start line', () => {
    expect(headingAt(square, 0)).toBeCloseTo(-45);
  });
});
