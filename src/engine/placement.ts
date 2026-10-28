import { toKeystrokes, unitsOf, WORD_GAP } from '../hangul/text';
import { STAGES, UNLOCK_ORDER } from './curriculum';
import { generateText, practiceWords } from './generator';
import type { Targets } from './keyStats';
import { stats, type Round } from './round';

// The placement test, offered on first launch: one short text per stage, each adding that
// stage's keys. You keep going while you type them at the targets, and stop at the first stage
// you don't pass. About two minutes at target speed.

/** The stages tested: every stage with keys of its own (1–9). */
export const PLACEMENT_STAGES = STAGES.filter((s) => s.units.length > 0);
/** Minimum keystrokes per stage's text: four or five words. */
export const PLACEMENT_KEYSTROKES = 25;

/** Every unit of the stages up to and including `stage`. */
export function unitsThrough(stage: number): string[] {
  return STAGES.filter((s) => s.id <= stage).flatMap((s) => s.units);
}

/**
 * A stage's test text: only keys up to that stage, and every word using at least one of the
 * stage's own. Word gaps live between words and punctuation needs sentences, so those stages'
 * texts come from the usual generator.
 */
export function placementText(stage: number, random: () => number = Math.random): string {
  const unlocked = unitsThrough(stage);
  const own = STAGES.find((s) => s.id === stage)!.units;
  if (own.includes(WORD_GAP) || own.includes('.')) {
    return generateText({ unlocked, focus: own.includes(WORD_GAP) ? WORD_GAP : undefined, keystrokes: PLACEMENT_KEYSTROKES, random });
  }
  const pool = practiceWords(unlocked).filter((w) => own.some((u) => unitsOf(w).has(u)));
  if (pool.length < 4) return generateText({ unlocked, focus: own[0], keystrokes: PLACEMENT_KEYSTROKES, random });

  // Draw without repeats until the text is long enough.
  const left = [...pool];
  const words: string[] = [];
  let keystrokes = 0;
  while (keystrokes < PLACEMENT_KEYSTROKES) {
    if (left.length === 0) left.push(...pool);
    const [word] = left.splice(Math.floor(random() * left.length), 1);
    words.push(word);
    keystrokes += toKeystrokes(word).length + 1;
  }
  return words.join(' ');
}

/** A stage's text passes at the same targets each key needs: speed and accuracy. */
export function stagePassed(round: Round, t: Targets): boolean {
  if (round.finishedAt === null) return false;
  const s = stats(round, round.finishedAt);
  return s.netSpeed >= t.targetSpeed && s.accuracy >= t.accuracyFloor;
}

/**
 * Where passing `passed` stages puts you: every key of those stages, credited as ready, and the
 * next stage's first key, as passing a stage in practice would unlock it. Never fewer keys than
 * you have, and a test that passes nothing changes nothing.
 */
export function placementUnlock(passed: number, current: readonly string[]): { unlocked: string[]; placed: string[] } {
  const placed = unitsThrough(passed);
  if (placed.length === 0) return { unlocked: [...current], placed };
  const count = Math.max(current.length, Math.min(placed.length + 1, UNLOCK_ORDER.length));
  return { unlocked: UNLOCK_ORDER.slice(0, count), placed };
}
