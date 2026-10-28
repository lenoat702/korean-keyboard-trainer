import { COMPOUND, DOUBLE_FINAL, NUMBER, WORD_GAP } from '../hangul/text';

// Units unlock one at a time in this order. Within a stage, keys run roughly
// from most to least frequent in Korean text, so real words appear as early as possible.
// The last stage has no keys of its own: you reach it by passing every stage before it.

export interface Stage {
  id: number;
  name: string;
  units: string[];
}

export const STAGES: Stage[] = [
  { id: 1, name: 'Home row', units: ['ㅇ', 'ㅏ', 'ㄴ', 'ㅣ', 'ㄹ', 'ㅓ', 'ㅁ'] },
  { id: 2, name: 'Index reaches + first finals', units: ['ㅎ', 'ㅗ'] },
  { id: 3, name: 'Top row', units: ['ㄱ', 'ㅅ', 'ㅔ', 'ㄷ', 'ㅈ', 'ㅐ', 'ㅂ', 'ㅕ', 'ㅛ', 'ㅑ'] },
  { id: 4, name: 'Bottom row', units: ['ㅡ', 'ㅜ', 'ㅊ', 'ㅌ', 'ㅍ', 'ㅋ', 'ㅠ'] },
  { id: 5, name: 'Shift doubles', units: ['ㅆ', 'ㄲ', 'ㄸ', 'ㅃ', 'ㅉ', 'ㅖ', 'ㅒ'] },
  { id: 6, name: 'Compound vowels', units: [COMPOUND] },
  { id: 7, name: 'Double finals', units: [DOUBLE_FINAL] },
  { id: 8, name: 'Words in rhythm', units: [WORD_GAP] },
  { id: 9, name: 'Sentences', units: ['.', ',', '?', NUMBER, '!'] },
  { id: 10, name: 'Free text', units: [] },
];

/** Reached once stage 9 is passed. Practice then draws on proverbs, paragraphs and your own text. */
export const FREE_TEXT_STAGE = 10;

/** The stage you're working on, given how many are passed: free text once every keyed stage is. */
export function stageInProgress(unlocked: readonly string[], passed: number): number {
  return passed >= FREE_TEXT_STAGE - 1 ? FREE_TEXT_STAGE : currentStage(unlocked);
}

export const UNLOCK_ORDER: string[] = STAGES.flatMap((s) => s.units);

/** Units unlocked on first launch: enough to make real syllables (아, 나, 이, 리…). */
export const STARTING_UNITS = UNLOCK_ORDER.slice(0, 5);

const stageByUnit = new Map(STAGES.flatMap((s) => s.units.map((u) => [u, s.id] as const)));

export function stageOf(unit: string): number {
  const id = stageByUnit.get(unit);
  if (id === undefined) throw new Error(`Unknown unit ${unit}`);
  return id;
}

/** The stage you're in: the stage of the most recently unlocked unit. */
export function currentStage(unlocked: readonly string[]): number {
  return Math.max(...unlocked.map(stageOf));
}

export function nextLocked(unlocked: readonly string[]): string | undefined {
  return UNLOCK_ORDER[unlocked.length];
}

const LABELS: Record<string, string> = {
  [COMPOUND]: 'Compound vowels',
  [DOUBLE_FINAL]: 'Double finals',
  [WORD_GAP]: 'Word gaps',
  [NUMBER]: 'Numbers 0–9',
  '.': 'Period .',
  ',': 'Comma ,',
  '?': 'Question mark ?',
  '!': 'Exclamation mark !',
};

export function unitLabel(unit: string): string {
  return LABELS[unit] ?? unit;
}
