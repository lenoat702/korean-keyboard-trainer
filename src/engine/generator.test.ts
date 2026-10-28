import { describe, expect, it } from 'vitest';
import { NUMBER, toKeystrokes, unitsOf, WORD_GAP } from '../hangul/text';
import { STARTING_UNITS, UNLOCK_ORDER } from './curriculum';
import { generateText, hasPair, practicePassages, practiceWords, seededRandom } from './generator';
import { PASSAGES } from './passages';
import { COMMON_WORDS } from './words';

// Small deterministic PRNG so failures are reproducible.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

/** Units a text needs, besides the word gap: spaces are in every round, measured once it unlocks. */
const needs = (text: string) => [...unitsOf(text)].filter((u) => u !== WORD_GAP);
const WORD_GAP_AT = UNLOCK_ORDER.indexOf(WORD_GAP) + 1;
const FIRST_SENTENCE_AT = UNLOCK_ORDER.indexOf('.') + 1;

describe('generateText', () => {
  // Every prefix of the unlock order up to stage 7 is a state a learner can be in.
  for (let n = STARTING_UNITS.length; n < WORD_GAP_AT; n++) {
    const unlocked = UNLOCK_ORDER.slice(0, n);
    const focus = unlocked.at(-1);

    it(`with ${n} units unlocked, uses only those and features ${focus}`, () => {
      const random = seeded(n);
      for (let round = 0; round < 5; round++) {
        const text = generateText({ unlocked, focus, random });
        for (const unit of needs(text)) expect(unlocked, `"${text}" uses ${unit}`).toContain(unit);

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
      for (const unit of needs(text)) expect(unlocked, `"${text}" uses ${unit}`).toContain(unit);
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

describe('stages 8 to 10', () => {
  it('leans word-gap drills on the everyday words', () => {
    const unlocked = UNLOCK_ORDER.slice(0, WORD_GAP_AT);
    const words = generateText({ unlocked, focus: WORD_GAP, random: seeded(8) }).split(' ');
    expect(words.filter((w) => COMMON_WORDS.has(w)).length / words.length).toBeGreaterThan(0.5);
  });

  it('switches to whole sentences once the full stop unlocks', () => {
    const unlocked = UNLOCK_ORDER.slice(0, FIRST_SENTENCE_AT);
    const sentences = new Set(practicePassages(unlocked));
    expect(sentences.size).toBeGreaterThanOrEqual(10);
    for (let seed = 0; seed < 5; seed++) {
      const text = generateText({ unlocked, focus: '.', random: seeded(seed) });
      expect(text).not.toMatch(/[,?!0-9]/);
      for (const unit of needs(text)) expect(unlocked).toContain(unit);
    }
  });

  // Each stage-9 unit, as it unlocks, has sentences to drill it.
  for (let n = FIRST_SENTENCE_AT; n <= UNLOCK_ORDER.length; n++) {
    const unlocked = UNLOCK_ORDER.slice(0, n);
    const focus = unlocked.at(-1)!;
    it(`with ${focus} just unlocked, drills it in sentences that need nothing locked`, () => {
      const text = generateText({ unlocked, focus, random: seeded(n) });
      for (const unit of needs(text)) expect(unlocked, `"${text}" uses ${unit}`).toContain(unit);
      expect(unitsOf(text).has(focus), text).toBe(true);
    });
  }

  it('adds proverbs and paragraphs in free text', () => {
    const sentencesOnly = practicePassages(UNLOCK_ORDER);
    const free = practicePassages(UNLOCK_ORDER, true);
    expect(free.length).toBe(PASSAGES.length);
    expect(sentencesOnly.length).toBeLessThan(free.length);
  });

  it('keeps pair drills on words, even with sentences unlocked', () => {
    const text = generateText({ unlocked: UNLOCK_ORDER, pair: ['ㄴ', 'ㅏ'], random: seeded(3) });
    expect(text).not.toMatch(/[.,?!]/);
  });

  it('can feature numbers', () => {
    const text = generateText({ unlocked: UNLOCK_ORDER, focus: NUMBER, random: seeded(4) });
    expect(text).toMatch(/[0-9]/);
  });
});
