import { PASSAGES } from './passages';
import { WORDS } from './words';

// English meanings for practice text: under each word, or one line per sentence.

export interface Gloss {
  /** Character range in the text, end exclusive. */
  start: number;
  end: number;
  meaning: string;
  kind: 'word' | 'sentence';
}

const WORD_MEANINGS = new Map(WORDS.map((w) => [w.text, w.meaning]));
// Longest first, so a short sentence never claims part of a paragraph that contains it.
const PASSAGE_MEANINGS = PASSAGES.map((p) => [p.text, p.meaning] as const).sort((a, b) => b[0].length - a[0].length);

/**
 * Finds the known sentences and words in a practice text. Sentences are matched whole; the
 * words between them are looked up one by one. Text you paste in has no meanings.
 * Practice text is Hangul, digits and ASCII, so string indices are character indices.
 */
export function glossText(text: string): Gloss[] {
  const glosses: Gloss[] = [];
  const covered = new Array<boolean>(text.length).fill(false);

  for (const [passage, meaning] of PASSAGE_MEANINGS) {
    for (let at = text.indexOf(passage); at !== -1; at = text.indexOf(passage, at + passage.length)) {
      // Only whole passages, not one that happens to end inside a longer word.
      if (!isBoundary(text, at - 1) || !isBoundary(text, at + passage.length) || covered[at]) continue;
      glosses.push({ start: at, end: at + passage.length, meaning, kind: 'sentence' });
      covered.fill(true, at, at + passage.length);
    }
  }

  const word = /[^ ]+/g;
  for (let m = word.exec(text); m !== null; m = word.exec(text)) {
    if (covered[m.index]) continue;
    const meaning = WORD_MEANINGS.get(m[0]);
    if (meaning) glosses.push({ start: m.index, end: m.index + m[0].length, meaning, kind: 'word' });
  }
  return glosses.sort((a, b) => a.start - b.start);
}

function isBoundary(text: string, i: number): boolean {
  return i < 0 || i >= text.length || text[i] === ' ';
}

/** The sentence gloss for where you are: the one containing `charIndex`, or the next one. */
export function sentenceAt(glosses: readonly Gloss[], charIndex: number): Gloss | undefined {
  return glosses.find((g) => g.kind === 'sentence' && charIndex < g.end);
}
