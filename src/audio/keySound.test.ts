import { describe, expect, it } from 'vitest';
import { sampleName } from './keySound';

describe('sampleName', () => {
  it('gives the long keys their own recordings, pressed and released', () => {
    for (const action of ['down', 'up'] as const) {
      expect(sampleName('Space', action)).toBe('space');
      expect(sampleName('Enter', action)).toBe('enter');
      expect(sampleName('Backspace', action)).toBe('backspace');
    }
  });

  it('picks the press recording by keyboard row', () => {
    expect(sampleName('KeyQ', 'down')).toBe('generic_r1');
    expect(sampleName('KeyP', 'down')).toBe('generic_r1');
    expect(sampleName('KeyA', 'down')).toBe('generic_r2');
    expect(sampleName('Semicolon', 'down')).toBe('generic_r2');
    expect(sampleName('KeyM', 'down')).toBe('generic_r3');
    expect(sampleName('ShiftLeft', 'down')).toBe('generic_r3');
  });

  it('falls back to the row sounds for switches without big-key recordings', () => {
    expect(sampleName('Space', 'down', false)).toBe('generic_r3');
    expect(sampleName('Enter', 'up', false)).toBe('generic');
  });

  it('uses one release recording for ordinary keys', () => {
    expect(sampleName('KeyQ', 'up')).toBe('generic');
    expect(sampleName('ShiftRight', 'up')).toBe('generic');
  });
});
