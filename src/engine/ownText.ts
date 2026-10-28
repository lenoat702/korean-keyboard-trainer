import { toKeystrokes } from '../hangul/text';

// Text you paste in (stage 10): cleaned down to what the trainer can check, then split into
// round-sized parts you type through in order.

/** Longest paste kept, in characters. */
export const MAX_OWN_TEXT = 5000;
/** A part ends at the first sentence break after this many keystrokes. */
const PART_KEYSTROKES = 120;

// Full-width and typographic marks that have a plain equivalent on the keyboard.
const EQUIVALENTS: Record<string, string> = { '。': '.', '．': '.', '，': ',', '、': ',', '？': '?', '！': '!', '…': '...' };

export interface Cleaned {
  text: string;
  /** Characters dropped because the trainer can't check them (letters, quotes, emoji…). */
  removed: number;
}

/**
 * Keeps Hangul, digits, spaces and . , ? ! so every character can be typed and checked.
 * Line breaks become spaces. Mac text is often decomposed (NFD), so it's recomposed first.
 */
export function cleanText(raw: string): Cleaned {
  let removed = 0;
  let out = '';
  for (const ch of raw.normalize('NFC')) {
    const mapped = EQUIVALENTS[ch] ?? ch;
    if (/^\s$/.test(mapped)) out += ' ';
    else if (/^[가-힣ㄱ-ㅣ0-9.,?!]+$/.test(mapped)) out += mapped;
    else removed++;
  }
  // Punctuation left with nothing before it (from "Hello! 안녕") has no word to end.
  const tidy = out.replace(/ +/g, ' ').replace(/ ([.,?!])/g, '$1').trim();
  const orphan = tidy.match(/^[.,?!]+ ?/)?.[0] ?? '';
  const text = tidy.slice(orphan.length).slice(0, MAX_OWN_TEXT).trimEnd();
  return { text, removed: removed + orphan.trim().length };
}

/**
 * Splits text into parts of roughly PART_KEYSTROKES, breaking after a sentence end where
 * there is one, otherwise at a space, so a part never stops mid-word.
 */
export function splitParts(text: string): string[] {
  const words = text.split(' ').filter(Boolean);
  const parts: string[] = [];
  let current: string[] = [];
  let keystrokes = 0;
  for (const word of words) {
    current.push(word);
    keystrokes += toKeystrokes(word).length + 1;
    const sentenceEnd = /[.?!]$/.test(word);
    if ((keystrokes >= PART_KEYSTROKES && sentenceEnd) || keystrokes >= PART_KEYSTROKES * 1.5) {
      parts.push(current.join(' '));
      current = [];
      keystrokes = 0;
    }
  }
  if (current.length > 0) parts.push(current.join(' '));
  return parts;
}
