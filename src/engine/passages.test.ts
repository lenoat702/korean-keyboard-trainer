import { describe, expect, it } from 'vitest';
import { strokeForJamo } from '../hangul/layout';
import { toKeystrokes, unitsOf } from '../hangul/text';
import { stageOf, STAGES, UNLOCK_ORDER } from './curriculum';
import { PASSAGES } from './passages';

describe('passages', () => {
  it('can all be typed on the layout', () => {
    for (const { text } of PASSAGES) {
      for (const k of toKeystrokes(text)) expect(strokeForJamo(k), `${text}: no key types "${k}"`).toBeDefined();
    }
  });

  it('need only units the curriculum teaches by stage 9', () => {
    for (const { text } of PASSAGES) {
      for (const unit of unitsOf(text)) expect(stageOf(unit), `${text} needs ${unit}`).toBeLessThanOrEqual(9);
    }
  });

  it('have a translation and no duplicates', () => {
    for (const p of PASSAGES) expect(p.meaning.trim(), p.text).not.toBe('');
    const texts = PASSAGES.map((p) => p.text);
    expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
  });

  // As each stage-9 unit unlocks, there are sentences that practise it and need nothing later.
  for (const unit of STAGES.find((s) => s.id === 9)!.units) {
    it(`has at least 3 sentences for ${unit} when it unlocks`, () => {
      const allowed = new Set(UNLOCK_ORDER.slice(0, UNLOCK_ORDER.indexOf(unit) + 1));
      const usable = PASSAGES.filter(
        (p) => p.stage === 9 && unitsOf(p.text).has(unit) && [...unitsOf(p.text)].every((u) => allowed.has(u)),
      );
      expect(usable.length).toBeGreaterThanOrEqual(3);
    });
  }
});
