import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  it('keeps valid saved values', () => {
    const saved = { showHands: false, skin: 0.8, sound: false, soundProfile: 'holypanda', showMeanings: false };
    expect(parseSettings(saved)).toEqual(saved);
  });

  it('falls back field by field for missing or malformed values', () => {
    expect(parseSettings({ showHands: 'no', skin: 3, sound: false, soundProfile: 'synth' })).toEqual({
      ...DEFAULT_SETTINGS,
      sound: false,
    });
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    // Saved before meanings existed: they're on by default.
    expect(parseSettings({ showHands: true }).showMeanings).toBe(true);
    expect(parseSettings('junk')).toEqual(DEFAULT_SETTINGS);
  });
});
