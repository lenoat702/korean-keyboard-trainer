import { combineCharacter } from 'es-hangul';
import { toKeystrokes, unitsOf } from '../hangul/text';
import { currentStage } from './curriculum';
import { WORDS } from './words';

/** Share of words that should contain the focus, when enough such words exist. */
const FOCUS_SHARE = 0.6;
/** Keep adding words until the round has at least this many keystrokes. */
const ROUND_KEYSTROKES = 50;
/** Below this many real words, made-up syllables top up the pool. */
const MIN_POOL = 8;

const VOWELS = new Set('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ');
// ㄸ ㅃ ㅉ never end a syllable.
const NO_FINAL = new Set('ㄸㅃㅉ');

/** Two jamo typed back to back, e.g. ['ㄹ', 'ㅣ']. */
export type Pair = readonly [from: string, to: string];

export interface GenerateOptions {
  unlocked: readonly string[];
  /** A unit to feature: a jamo or a pattern. */
  focus?: string;
  /** A key-to-key transition to feature instead of a unit. */
  pair?: Pair;
  random?: () => number;
}

export function hasPair(word: string, [from, to]: Pair): boolean {
  const ks = toKeystrokes(word);
  return ks.some((k, i) => k === from && ks[i + 1] === to);
}

/** A round of practice text using only unlocked units, leaning on the focus unit or pair. */
export function generateText({ unlocked, focus, pair, random = Math.random }: GenerateOptions): string {
  const allowed = new Set(unlocked);
  const stage = currentStage(unlocked);
  const fits = (text: string) => [...unitsOf(text)].every((u) => allowed.has(u));
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

  const pool = WORDS.filter((w) => w.stage <= stage && fits(w.text)).map((w) => w.text);
  const make = madeUp(unlocked, stage >= 2, random);

  // What counts as "featuring" the target, and how to make up a word that does.
  const features = pair ? (w: string) => hasPair(w, pair) : focus ? (w: string) => unitsOf(w).has(focus) : undefined;
  const madeUpFeature = pair ? () => make.withPair(pair) : focus?.length === 1 ? () => make.withUnit(focus) : undefined;
  const featurePool = features ? pool.filter(features) : [];

  const words: string[] = [];
  let keystrokes = 0;
  let featured = 0;
  while (keystrokes < ROUND_KEYSTROKES) {
    // Deterministic share rather than a coin flip, so short rounds don't drift far from it.
    const wantFeature = features !== undefined && featured < FOCUS_SHARE * (words.length + 1);
    let word: string | undefined;
    if (wantFeature) {
      // Real words when there are enough; otherwise made-up ones, which can't carry a pattern unit.
      const real = featurePool.length >= 3 || (featurePool.length > 0 && !madeUpFeature);
      word = real ? pick(featurePool) : madeUpFeature?.();
    }
    word ??= pool.length >= MIN_POOL || random() < pool.length / MIN_POOL ? pick(pool) : make.plain();

    if (word === words.at(-1)) continue;
    if (features?.(word)) featured++;
    words.push(word);
    keystrokes += toKeystrokes(word).length + 1;
  }
  return words.join(' ');
}

/**
 * Builds one- or two-syllable made-up words from unlocked keys, for when real words run short.
 * Finals appear from stage 2.
 */
function madeUp(unlocked: readonly string[], finals: boolean, random: () => number) {
  const vowels = unlocked.filter((u) => VOWELS.has(u));
  const consonants = unlocked.filter((u) => u.length === 1 && !VOWELS.has(u));
  const enders = consonants.filter((c) => !NO_FINAL.has(c));
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

  const syllable = (initial = pick(consonants), vowel = pick(vowels), final?: string) =>
    combineCharacter(initial, vowel, final ?? (finals && random() < 0.35 ? pick(enders) : ''));
  const open = (initial = pick(consonants), vowel = pick(vowels)) => combineCharacter(initial, vowel, '');
  const maybeMore = (word: string) => (random() < 0.5 ? word : word + syllable());

  return {
    plain: () => maybeMore(syllable()),

    withUnit(unit: string): string {
      if (VOWELS.has(unit)) return maybeMore(syllable(undefined, unit));
      if (finals && !NO_FINAL.has(unit) && random() < 0.3) return maybeMore(syllable(undefined, undefined, unit));
      return maybeMore(syllable(unit));
    },

    /** A made-up word containing the pair, or undefined if the pair can't be built that way. */
    withPair([from, to]: Pair): string | undefined {
      const fromVowel = VOWELS.has(from);
      const toVowel = VOWELS.has(to);
      // Consonant then vowel: the start of a syllable (나).
      if (!fromVowel && toVowel) return maybeMore(syllable(from, to));
      // Vowel then consonant: a final (안), or the next syllable's start (아나).
      if (fromVowel && !toVowel) {
        return finals && !NO_FINAL.has(to) && random() < 0.5 ? syllable(undefined, from, to) : open(undefined, from) + syllable(to);
      }
      // Consonant then consonant: a final followed by the next syllable's start (안나).
      if (!fromVowel && !toVowel && finals && !NO_FINAL.has(from)) return syllable(undefined, undefined, from) + open(to);
      // Vowel then vowel is a compound vowel; leave those to real words.
      return undefined;
    },
  };
}
