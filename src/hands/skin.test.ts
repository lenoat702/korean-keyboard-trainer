import { describe, expect, it } from 'vitest';
import { LEGACY_TONES, SKIN_GRADIENT, skinAt } from './skin';

describe('skinAt', () => {
  it('hits the end stops exactly', () => {
    expect(skinAt(0).base).toBe('#f3cfb3');
    expect(skinAt(1).base).toBe('#6a432b');
  });

  it('lands on the old fixed tones at their legacy positions', () => {
    expect(skinAt(LEGACY_TONES.mediumLight).base).toBe('#e2b08a');
    expect(skinAt(LEGACY_TONES.medium).nail).toBe('#e2b496');
  });

  it('blends halfway between two stops', () => {
    // Halfway between #f3cfb3 and #e2b08a.
    expect(skinAt(0.125).base).toBe('#ebc09f');
  });

  it('clamps out-of-range and junk input', () => {
    expect(skinAt(-1)).toEqual(skinAt(0));
    expect(skinAt(7)).toEqual(skinAt(1));
    expect(skinAt(Number.NaN)).toEqual(skinAt(0));
  });

  it('gets darker along the scale', () => {
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    for (let i = 0; i < 10; i++) expect(lum(skinAt((i + 1) / 10).base)).toBeLessThan(lum(skinAt(i / 10).base));
  });

  it('builds the slider track from the same stops', () => {
    expect(SKIN_GRADIENT).toMatch(/^linear-gradient\(to right, #f3cfb3, .*#6a432b\)$/);
  });
});
