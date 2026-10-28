import { describe, expect, it } from 'vitest';
import { ALL_JAMO, strokeForJamo } from '../hangul/layout';
import { unitsOf } from '../hangul/text';
import { STAGES, stageOf, UNLOCK_ORDER } from './curriculum';
import { WORDS } from './words';

describe('curriculum', () => {
  it('unlocks every jamo key exactly once, then the patterns, word gaps, punctuation and numbers', () => {
    const keys = UNLOCK_ORDER.filter((u) => ALL_JAMO.includes(u));
    expect(new Set(keys)).toEqual(new Set(ALL_JAMO));
    expect(keys).toHaveLength(33);
    expect(UNLOCK_ORDER).toHaveLength(41);
    expect(new Set(UNLOCK_ORDER).size).toBe(UNLOCK_ORDER.length);
  });
});

describe('words', () => {
  for (const stage of STAGES) {
    it(`stage ${stage.id} words need nothing beyond stage ${stage.id}`, () => {
      for (const { text } of WORDS.filter((w) => w.stage === stage.id)) {
        for (const unit of unitsOf(text)) {
          if (unit.length === 1) expect(strokeForJamo(unit), `${text}: ${unit} has no key`).toBeDefined();
          expect(stageOf(unit), `${text} needs ${unit}`).toBeLessThanOrEqual(stage.id);
        }
      }
    });
  }

  it('every unit up to stage 7 has real words to practise it with', () => {
    for (const unit of UNLOCK_ORDER.filter((u) => stageOf(u) <= 7)) {
      const count = WORDS.filter((w) => unitsOf(w.text).has(unit)).length;
      expect(count, `${unit} appears in ${count} words`).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every word a meaning', () => {
    for (const w of WORDS) expect(w.meaning.trim(), w.text).not.toBe('');
  });

  it('has no duplicates', () => {
    const texts = WORDS.map((w) => w.text);
    expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
  });
});
