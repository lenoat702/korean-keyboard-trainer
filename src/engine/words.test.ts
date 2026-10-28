import { describe, expect, it } from 'vitest';
import { ALL_JAMO, strokeForJamo } from '../hangul/layout';
import { unitsOf } from '../hangul/text';
import { STAGES, stageOf, UNLOCK_ORDER } from './curriculum';
import { WORDS } from './words';

describe('curriculum', () => {
  it('unlocks every key on the layout exactly once, plus the two patterns', () => {
    const keys = UNLOCK_ORDER.filter((u) => u.length === 1);
    expect(new Set(keys)).toEqual(new Set(ALL_JAMO));
    expect(keys).toHaveLength(33);
    expect(UNLOCK_ORDER).toHaveLength(35);
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

  it('every unit has real words to practise it with', () => {
    for (const unit of UNLOCK_ORDER) {
      const count = WORDS.filter((w) => unitsOf(w.text).has(unit)).length;
      expect(count, `${unit} appears in ${count} words`).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no duplicates', () => {
    const texts = WORDS.map((w) => w.text);
    expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
  });
});
