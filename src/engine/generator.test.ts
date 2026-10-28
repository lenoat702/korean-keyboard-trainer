import { describe, expect, it } from 'vitest';
import { toKeystrokes, unitsOf } from '../hangul/text';
import { STARTING_UNITS, UNLOCK_ORDER } from './curriculum';
import { generateText, hasPair, practiceWords, seededRandom } from './generator';

// Small deterministic PRNG so failures are reproducible.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe('generateText', () => {
  // Every prefix of the unlock order is a state a learner can be in.
  for (let n = STARTING_UNITS.length; n <= UNLOCK_ORDER.length; n++) {
    const unlocked = UNLOCK_ORDER.slice(0, n);
    const focus = unlocked.at(-1);

    it(`with ${n} units unlocked, uses only those and features ${focus}`, () => {
      const random = seeded(n);
      for (let round = 0; round < 5; round++) {
        const text = generateText({ unlocked, focus, random });
        for (const unit of unitsOf(text)) expect(unlocked, `"${text}" uses ${unit}`).toContain(unit);

        const words = text.split(' ');
        const withFocus = words.filter((w) => unitsOf(w).has(focus!)).length;
        expect(withFocus / words.length, `"${text}"`).toBeGreaterThan(0.25);
      }
    });
  }

  it('makes rounds of roughly 50 keystrokes', () => {
    const text = generateText({ unlocked: UNLOCK_ORDER.slice(0, 20), random: seeded(1) });
    expect(toKeystrokes(text).length).toBeGreaterThanOrEqual(45);
    expect(toKeystrokes(text).length).toBeLessThan(80);
  });

  it('features a key pair when drilling one', () => {
    const unlocked = UNLOCK_ORDER.slice(0, 12);
    for (const pair of [['ㄹ', 'ㅣ'], ['ㅏ', 'ㄴ'], ['ㄴ', 'ㅁ'], ['ㅎ', 'ㅏ']] as const) {
      const text = generateText({ unlocked, pair, random: seeded(3) });
      for (const unit of unitsOf(text)) expect(unlocked, `"${text}" uses ${unit}`).toContain(unit);
      const words = text.split(' ');
      expect(words.filter((w) => hasPair(w, pair)).length / words.length, `"${text}"`).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('never repeats a word back to back', () => {
    const words = generateText({ unlocked: STARTING_UNITS, focus: 'ㄹ', random: seeded(7) }).split(' ');
    words.slice(1).forEach((w, i) => expect(w).not.toBe(words[i]));
  });
});

describe('seeded and long text', () => {
  const unlocked = UNLOCK_ORDER.slice(0, 20);

  it('gives the same text for the same seed', () => {
    const a = generateText({ unlocked, random: seededRandom('2026-10-29') });
    const b = generateText({ unlocked, random: seededRandom('2026-10-29') });
    const c = generateText({ unlocked, random: seededRandom('2026-10-30') });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('makes text at least as long as asked', () => {
    expect(toKeystrokes(generateText({ unlocked, keystrokes: 800 })).length).toBeGreaterThanOrEqual(790);
  });

  it('lists only real words that fit the unlocked keys', () => {
    const words = practiceWords(UNLOCK_ORDER.slice(0, 5));
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) for (const u of unitsOf(w)) expect(UNLOCK_ORDER.slice(0, 5)).toContain(u);
  });
});
