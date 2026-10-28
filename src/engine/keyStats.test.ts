import { describe, expect, it } from 'vitest';
import { toKeystrokes } from '../hangul/text';
import { focusUnit, MIN_SAMPLES, recordRound, summarize, unitToUnlock, WINDOW, type UnitStat } from './keyStats';
import { UNLOCK_ORDER } from './curriculum';
import { backspace, createRound, press, type Round } from './round';

const targets = { targetSpeed: 100, accuracyFloor: 95 };
const ALL = UNLOCK_ORDER;

/** Types the whole text correctly, one press every `stepMs`. */
function typed(text: string, stepMs: number): Round {
  return toKeystrokes(text).reduce((r, j, i) => press(r, j, 'test', i * stepMs), createRound(text));
}

const stat = (unit: string, n: number, ms: number, correct = true): UnitStat => ({
  unit,
  times: new Array(n).fill(ms),
  results: new Array(n).fill(correct),
});

describe('recordRound', () => {
  it('records time and result per unit, skipping the first press (no previous)', () => {
    const [n, a] = recordRound(new Map(), typed('나', 300), ALL);
    expect(n).toEqual({ unit: 'ㄴ', times: [], results: [true] });
    expect(a).toEqual({ unit: 'ㅏ', times: [300], results: [true] });
  });

  it('counts only first tries', () => {
    let r = createRound('나');
    r = press(r, 'ㅁ', 'KeyA', 0);
    r = backspace(r);
    r = press(r, 'ㄴ', 'KeyS', 400);
    r = press(r, 'ㅏ', 'KeyK', 700);
    const n = recordRound(new Map(), r, ALL).find((s) => s.unit === 'ㄴ');
    expect(n?.results).toEqual([false]);
  });

  it('ignores pauses when timing', () => {
    const [, a] = recordRound(new Map(), typed('나', 5000), ALL);
    expect(a.times).toEqual([]);
    expect(a.results).toEqual([true]);
  });

  it('keeps only the last WINDOW presses', () => {
    const old = new Map([['ㅏ', stat('ㅏ', WINDOW, 900)]]);
    const a = recordRound(old, typed('나', 300), ALL).find((s) => s.unit === 'ㅏ')!;
    expect(a.times).toHaveLength(WINDOW);
    expect(a.times.at(-1)).toBe(300);
  });

  it('credits compound vowel presses to the pattern too', () => {
    const units = recordRound(new Map(), typed('와', 300), ALL).map((s) => s.unit);
    expect(units).toContain('compound');
  });

  it('measures only unlocked units, so word gaps start counting at stage 8', () => {
    const early = recordRound(new Map(), typed('나 나', 300), ['ㄴ', 'ㅏ']).map((s) => s.unit);
    expect(early).toEqual(['ㄴ', 'ㅏ']);
    const later = recordRound(new Map(), typed('나 나', 300), ALL).find((s) => s.unit === 'word-gap');
    expect(later?.results).toEqual([true, true]);
  });
});

describe('summarize', () => {
  it('is not ready before MIN_SAMPLES presses, however fast', () => {
    expect(summarize(stat('ㅏ', MIN_SAMPLES - 1, 100), targets).ready).toBe(false);
    expect(summarize(stat('ㅏ', MIN_SAMPLES, 100), targets).ready).toBe(true);
  });

  it('converts mean press time to 타/분', () => {
    expect(summarize(stat('ㅏ', 30, 600), targets).speed).toBe(100);
  });

  it('needs the accuracy floor', () => {
    const s: UnitStat = { unit: 'ㅏ', times: new Array(30).fill(300), results: [...new Array(28).fill(true), false, false] };
    const sum = summarize(s, targets);
    expect(sum.accuracy).toBeCloseTo(93.3, 1);
    expect(sum.ready).toBe(false);
    expect(sum.stars).toBe(2);
  });

  it('gives 3 stars at target and 5 at double', () => {
    expect(summarize(stat('ㅏ', 30, 600), targets).stars).toBe(3);
    expect(summarize(stat('ㅏ', 30, 300), targets).stars).toBe(5);
  });
});

describe('unlocking and focus', () => {
  const unlocked = ['ㅇ', 'ㅏ', 'ㄴ'];

  it('unlocks the next unit only when every unlocked unit is ready', () => {
    const fast = new Map(unlocked.map((u) => [u, stat(u, 30, 400)]));
    expect(unitToUnlock(unlocked, fast, targets)).toBe('ㅣ');
    fast.set('ㄴ', stat('ㄴ', 30, 900));
    expect(unitToUnlock(unlocked, fast, targets)).toBeUndefined();
  });

  it('focuses the newest unit until it is ready', () => {
    const s = new Map(unlocked.map((u) => [u, stat(u, 30, 400)]));
    s.set('ㄴ', stat('ㄴ', 5, 400));
    s.set('ㅇ', stat('ㅇ', 30, 2000));
    expect(focusUnit(unlocked, s, targets)).toBe('ㄴ');
  });

  it('among units still collecting presses, focuses the one with fewest', () => {
    const s = new Map(unlocked.map((u) => [u, stat(u, 30, 400)]));
    s.set('ㅇ', stat('ㅇ', 17, 400));
    s.set('ㅏ', stat('ㅏ', 9, 400));
    expect(focusUnit(unlocked, s, targets)).toBe('ㅏ');
  });

  it('then focuses the unit furthest from target', () => {
    const s = new Map(unlocked.map((u) => [u, stat(u, 30, 400)]));
    s.set('ㅏ', stat('ㅏ', 30, 900));
    s.set('ㅇ', stat('ㅇ', 30, 2000));
    expect(focusUnit(unlocked, s, targets)).toBe('ㅇ');
  });
});
