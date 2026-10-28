import { assemble, disassemble, disassembleCompleteCharacter } from 'es-hangul';

/** Skills practised by typing a syllable, beyond its individual keys. */
export const COMPOUND = 'compound';
export const DOUBLE_FINAL = 'double-final';

/**
 * Splits target text into the jamo you press, in order.
 * Compound vowels and double finals come out as two presses: 과 → ㄱㅗㅏ, 닭 → ㄷㅏㄹㄱ.
 */
export function toKeystrokes(text: string): string[] {
  return [...disassemble(text)];
}

/**
 * Rebuilds typed jamo into syllables the way an input method would,
 * including the jumping final: ㄱㅏㄴ → 간, then ㄱㅏㄴㅏ → 가나.
 */
export function assembleTyped(typed: readonly string[]): string {
  return typed.length === 0 ? '' : assemble([...typed]);
}

/**
 * What each keystroke of the text practises: its jamo, plus COMPOUND or DOUBLE_FINAL
 * when it is one of the two presses of a compound vowel or double final. Spaces practise nothing.
 */
export function keystrokeUnits(text: string): string[][] {
  const out: string[][] = [];
  for (const ch of text) {
    const parts = disassembleCompleteCharacter(ch);
    if (!parts) {
      for (const j of disassemble(ch)) out.push(j === ' ' ? [] : [j]);
      continue;
    }
    out.push([parts.choseong]);
    const vowel = [...parts.jungseong];
    for (const j of vowel) out.push(vowel.length > 1 ? [j, COMPOUND] : [j]);
    const final = [...parts.jongseong];
    for (const j of final) out.push(final.length > 1 ? [j, DOUBLE_FINAL] : [j]);
  }
  return out;
}

/** Every unit a piece of text needs unlocked. */
export function unitsOf(text: string): Set<string> {
  return new Set(keystrokeUnits(text).flat());
}

/** For each character of the text, the half-open range of keystroke indices that type it. */
export function charRanges(text: string): Array<[start: number, end: number]> {
  const ranges: Array<[number, number]> = [];
  let pos = 0;
  for (const ch of text) {
    const n = disassemble(ch).length;
    ranges.push([pos, pos + n]);
    pos += n;
  }
  return ranges;
}
