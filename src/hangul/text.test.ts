import { describe, expect, it } from 'vitest';
import { assembleTyped, charRanges, COMPOUND, DOUBLE_FINAL, keystrokeUnits, toKeystrokes } from './text';

describe('toKeystrokes', () => {
  it('splits syllables in reading order', () => {
    expect(toKeystrokes('한')).toEqual(['ㅎ', 'ㅏ', 'ㄴ']);
  });

  it('splits compound vowels into two presses', () => {
    expect(toKeystrokes('과')).toEqual(['ㄱ', 'ㅗ', 'ㅏ']);
    expect(toKeystrokes('의')).toEqual(['ㅇ', 'ㅡ', 'ㅣ']);
  });

  it('splits double finals into two presses', () => {
    expect(toKeystrokes('닭')).toEqual(['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ']);
  });

  it('keeps spaces as their own press', () => {
    expect(toKeystrokes('아 이')).toEqual(['ㅇ', 'ㅏ', ' ', 'ㅇ', 'ㅣ']);
  });
});

describe('assembleTyped', () => {
  it('is empty for no input', () => {
    expect(assembleTyped([])).toBe('');
  });

  it('shows a final while it could still be one', () => {
    expect(assembleTyped(['ㄱ', 'ㅏ', 'ㄴ'])).toBe('간');
  });

  it('moves the final to the next syllable when a vowel follows (jumping final)', () => {
    expect(assembleTyped(['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ'])).toBe('가나');
  });

  it('splits a double final when a vowel follows', () => {
    expect(assembleTyped(['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ'])).toBe('닭');
    expect(assembleTyped(['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ', 'ㅏ'])).toBe('달가');
  });

  it('builds ㅢ from two vowels', () => {
    expect(assembleTyped(['ㄱ', 'ㅡ', 'ㅣ'])).toBe('긔');
  });

  it('leaves impossible sequences as loose jamo instead of failing', () => {
    expect(assembleTyped(['ㅏ', 'ㅏ'])).toBe('ㅏㅏ');
  });

  it('round-trips the drill-style text', () => {
    const text = '할머니 호랑이';
    expect(assembleTyped(toKeystrokes(text))).toBe(text);
  });
});

describe('charRanges', () => {
  it('maps each character to its keystrokes', () => {
    expect(charRanges('과 닭')).toEqual([
      [0, 3],
      [3, 4],
      [4, 8],
    ]);
  });
});

describe('keystrokeUnits', () => {
  it('credits each press to its jamo and spaces to nothing', () => {
    expect(keystrokeUnits('나 아')).toEqual([['ㄴ'], ['ㅏ'], [], ['ㅇ'], ['ㅏ']]);
  });

  it('tags both presses of a compound vowel', () => {
    expect(keystrokeUnits('과')).toEqual([['ㄱ'], ['ㅗ', COMPOUND], ['ㅏ', COMPOUND]]);
  });

  it('tags both presses of a double final, not the single final', () => {
    expect(keystrokeUnits('닭')).toEqual([['ㄷ'], ['ㅏ'], ['ㄹ', DOUBLE_FINAL], ['ㄱ', DOUBLE_FINAL]]);
    expect(keystrokeUnits('달')).toEqual([['ㄷ'], ['ㅏ'], ['ㄹ']]);
  });

  it('lines up with toKeystrokes', () => {
    const text = '괜찮아요 닭 의자';
    expect(keystrokeUnits(text).map((u) => u[0] ?? ' ')).toEqual(toKeystrokes(text));
  });
});
