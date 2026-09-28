import { describe, expect, it } from 'vitest';
import { gazeTimeFromPointer, PORTRAIT_CYCLE_SECONDS, portraitTimeDelta, stepPortraitTime } from './gaze-mapping';

describe('portrait footage gaze mapping', () => {
  it('uses the original front frame inside the center dead zone', () => {
    expect(gazeTimeFromPointer(500, 400, 1000, 800)).toBe(0);
    expect(gazeTimeFromPointer(520, 410, 1000, 800)).toBe(0);
  });

  it('matches screen directions to inspected footage landmarks', () => {
    expect(gazeTimeFromPointer(1000, 400, 1000, 800)).toBeCloseTo(1.8);
    expect(gazeTimeFromPointer(500, 0, 1000, 800)).toBeCloseTo(2.8);
    expect(gazeTimeFromPointer(0, 400, 1000, 800)).toBeCloseTo(4.2);
    expect(gazeTimeFromPointer(500, 800, 1000, 800)).toBeCloseTo(6.2);
  });

  it('interpolates adjacent directions and joins the lower-right gap through the matching front poses', () => {
    expect(gazeTimeFromPointer(1000, 0, 1000, 800)).toBeCloseTo(2.3);
    expect(gazeTimeFromPointer(0, 0, 1000, 800)).toBeCloseTo(3.5);
    expect(gazeTimeFromPointer(0, 800, 1000, 800)).toBeCloseTo(5.2);
    expect(gazeTimeFromPointer(1000, 800, 1000, 800)).toBeCloseTo(0);
    const pointAt = (angle: number) => [500 + Math.cos(angle) * 500, 400 - Math.sin(angle) * 400] as const;
    let previous = gazeTimeFromPointer(...pointAt(Math.PI * 1.5), 1000, 800);
    for (let angle = Math.PI * 1.5 + 0.001; angle < Math.PI * 2 + 0.001; angle += 0.001) {
      const current = gazeTimeFromPointer(...pointAt(angle), 1000, 800);
      expect(Math.abs(portraitTimeDelta(previous, current))).toBeLessThan(0.004);
      previous = current;
    }
  });

  it('holds the previous pose between the center thresholds instead of flickering across one edge', () => {
    expect(gazeTimeFromPointer(530, 400, 1000, 800, 2.8)).toBe(0);
    expect(gazeTimeFromPointer(550, 400, 1000, 800, 2.8)).toBe(2.8);
    expect(gazeTimeFromPointer(580, 400, 1000, 800, 0)).toBe(0);
    expect(gazeTimeFromPointer(600, 400, 1000, 800, 2.8)).toBeCloseTo(1.8);
  });

  it('handles missing or non-finite viewport information with the resting frame', () => {
    expect(gazeTimeFromPointer(10, 10, 0, 100)).toBe(0);
    expect(gazeTimeFromPointer(NaN, 10, 100, 100)).toBe(0);
  });
});

describe('portrait circular timeline following', () => {
  it('takes the shortest path across the front seam and treats both front endpoints as equivalent', () => {
    expect(PORTRAIT_CYCLE_SECONDS).toBe(8.4);
    expect(portraitTimeDelta(8.3, 0.1)).toBeCloseTo(0.2);
    expect(portraitTimeDelta(0.1, 8.3)).toBeCloseTo(-0.2);
    expect(portraitTimeDelta(0, 8.4)).toBeCloseTo(0);
    expect(portraitTimeDelta(6.2, 1.8)).toBeCloseTo(4);
  });

  it('does not jump for any direction pair and clamps a stalled animation frame', () => {
    for (const from of [0, 1.8, 2.8, 4.2, 6.2, 8.3]) {
      for (const to of [0, 1.8, 2.8, 4.2, 6.2, 8.3]) {
        const next = stepPortraitTime(from, to, 1 / 60);
        expect(Math.abs(portraitTimeDelta(from, next))).toBeLessThanOrEqual(10 / 60 + 1e-10);
        expect(Math.abs(portraitTimeDelta(next, to))).toBeLessThanOrEqual(Math.abs(portraitTimeDelta(from, to)) + 1e-10);
      }
    }
    expect(stepPortraitTime(1.8, 4.2, 5)).toBe(stepPortraitTime(1.8, 4.2, 0.05));
    expect(stepPortraitTime(1.8, 4.2, 0)).toBe(1.8);
    expect(stepPortraitTime(1.8, 4.2, -1)).toBe(1.8);
    expect(stepPortraitTime(1.8, 1.8, 0.05)).toBe(1.8);
  });

  it('converges on a medium turn within 0.6 seconds without an immediate snap', () => {
    let current = 1.8;
    for (let frame = 0; frame < 15; frame++) current = stepPortraitTime(current, 4.2, 1 / 60);
    expect(Math.abs(portraitTimeDelta(current, 4.2))).toBeGreaterThan(1 / 30);
    for (let frame = 15; frame < 36; frame++) current = stepPortraitTime(current, 4.2, 1 / 60);
    expect(Math.abs(portraitTimeDelta(current, 4.2))).toBeLessThan(1 / 30);
  });
});
