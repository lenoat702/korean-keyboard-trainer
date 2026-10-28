import { describe, expect, it } from 'vitest';
import { toKeystrokes, unitsOf, WORD_GAP } from '../hangul/text';
import { STAGES, STARTING_UNITS, UNLOCK_ORDER } from './curriculum';
import { seededRandom } from './generator';
import { isReady, MIN_SAMPLES, unitToUnlock, focusUnit, type UnitStat } from './keyStats';
import { PLACEMENT_KEYSTROKES, PLACEMENT_STAGES, placementText, placementUnlock, stagePassed, unitsThrough } from './placement';
import { stagesPassed } from './rank';
import { createRound, press, type Round } from './round';

const targets = { targetSpeed: 100, accuracyFloor: 95 };

/** Types the whole text, one press every `stepMs`, getting the presses at `wrong` positions wrong first. */
function typed(text: string, stepMs: number, wrong: number[] = []): Round {
  let r = createRound(text);
  let t = 0;
  for (const [i, j] of toKeystrokes(text).entries()) {
    if (wrong.includes(i)) {
      r = press(r, 'ㅋ', 'test', (t += stepMs));
      r = { ...r, typed: r.typed.slice(0, -1) };
    }
    r = press(r, j, 'test', (t += stepMs));
  }
  return r;
}

describe('placementText', () => {
  it('tests stages 1 to 9, the ones with keys', () => {
    expect(PLACEMENT_STAGES.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  for (const stage of PLACEMENT_STAGES) {
    it(`stage ${stage.id}: only keys up to it, and long enough`, () => {
      for (let seed = 0; seed < 5; seed++) {
        const text = placementText(stage.id, seededRandom(`placement-${stage.id}-${seed}`));
        const allowed = new Set([...unitsThrough(stage.id), WORD_GAP]);
        expect([...unitsOf(text)].filter((u) => !allowed.has(u))).toEqual([]);
        // Counted like the generator: a space after every word, the last one included.
        expect(toKeystrokes(text).length + 1).toBeGreaterThanOrEqual(PLACEMENT_KEYSTROKES);
      }
    });
  }

  it("uses the stage's own keys in every word, for the key stages", () => {
    for (const stage of PLACEMENT_STAGES.filter((s) => s.id <= 7)) {
      const text = placementText(stage.id, seededRandom(`own-${stage.id}`));
      for (const word of text.split(' ')) {
        expect(stage.units.some((u) => unitsOf(word).has(u)), `${word} in stage ${stage.id}`).toBe(true);
      }
    }
  });

  it('gives stage 9 sentences with punctuation', () => {
    expect(placementText(9, seededRandom('s9'))).toMatch(/[.,?!]/);
  });
});

describe('stagePassed', () => {
  it('needs both the speed and the accuracy targets', () => {
    const text = '나라 아이 나이 이리 리나 아니';
    expect(stagePassed(typed(text, 400), targets)).toBe(true); // 150 타/분, no mistakes
    expect(stagePassed(typed(text, 700), targets)).toBe(false); // under 100 타/분
    expect(stagePassed(typed(text, 400, [2, 9]), targets)).toBe(false); // two first-try misses in ~20
  });

  it('fails a stage that was never finished', () => {
    expect(stagePassed(createRound('나라'), targets)).toBe(false);
  });
});

describe('placementUnlock', () => {
  it('changes nothing when no stage passed', () => {
    expect(placementUnlock(0, STARTING_UNITS)).toEqual({ unlocked: STARTING_UNITS, placed: [] });
  });

  it("unlocks the passed stages' keys and the next stage's first key", () => {
    const { unlocked, placed } = placementUnlock(2, STARTING_UNITS);
    expect(placed).toEqual([...STAGES[0].units, ...STAGES[1].units]);
    expect(unlocked).toEqual([...placed, 'ㄱ']);
  });

  it('unlocks everything after passing every stage', () => {
    expect(placementUnlock(9, STARTING_UNITS).unlocked).toEqual(UNLOCK_ORDER);
  });

  it('never takes keys away', () => {
    const far = UNLOCK_ORDER.slice(0, 20);
    expect(placementUnlock(1, far).unlocked).toEqual(far);
  });
});

describe('placement credit', () => {
  const stats = new Map<string, UnitStat>();
  const fast = (unit: string, n: number): UnitStat => ({ unit, times: new Array(n).fill(300), results: new Array(n).fill(true) });
  const slow = (unit: string, n: number): UnitStat => ({ unit, times: new Array(n).fill(1200), results: new Array(n).fill(true) });

  it('counts a placed key as ready until it has enough presses, then its numbers decide', () => {
    expect(isReady('ㅎ', new Map(), targets, ['ㅎ'])).toBe(true);
    expect(isReady('ㅎ', new Map([['ㅎ', slow('ㅎ', MIN_SAMPLES - 1)]]), targets, ['ㅎ'])).toBe(true);
    expect(isReady('ㅎ', new Map([['ㅎ', slow('ㅎ', MIN_SAMPLES)]]), targets, ['ㅎ'])).toBe(false);
    expect(isReady('ㅎ', new Map(), targets)).toBe(false);
  });

  it("lets the next key unlock once only the new stage's key is at target", () => {
    const { unlocked, placed } = placementUnlock(2, STARTING_UNITS);
    expect(stagesPassed(unlocked, stats, targets, placed)).toBe(2);
    expect(focusUnit(unlocked, stats, targets, placed)).toBe('ㄱ');
    expect(unitToUnlock(unlocked, stats, targets, placed)).toBeUndefined();
    expect(unitToUnlock(unlocked, new Map([['ㄱ', fast('ㄱ', MIN_SAMPLES)]]), targets, placed)).toBe('ㅅ');
  });

  it('reaches free text straight away after passing every stage', () => {
    const { unlocked, placed } = placementUnlock(9, STARTING_UNITS);
    expect(stagesPassed(unlocked, stats, targets, placed)).toBe(9);
  });
});
