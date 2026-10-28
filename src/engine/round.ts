import { toKeystrokes } from '../hangul/text';

export interface Press {
  /** Position in the round's keystroke sequence. */
  index: number;
  expected: string;
  typed: string;
  code: string;
  at: number;
  msSincePrev: number | null;
  correct: boolean;
  /** False when this position was already attempted and backspaced. */
  firstTry: boolean;
}

export interface Round {
  readonly target: string;
  readonly expected: readonly string[];
  readonly typed: readonly string[];
  /** Whether the first press at each position was right; undefined until that position is reached. */
  readonly firstTry: readonly (boolean | undefined)[];
  readonly log: readonly Press[];
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
}

export function createRound(target: string): Round {
  const expected = toKeystrokes(target);
  return {
    target,
    expected,
    typed: [],
    firstTry: new Array(expected.length).fill(undefined),
    log: [],
    startedAt: null,
    finishedAt: null,
  };
}

export const isFinished = (r: Round): boolean => r.finishedAt !== null;

/** Ends a round early, e.g. when a timed sprint runs out. No-op if it already ended. */
export function endRound(r: Round, at: number): Round {
  return r.finishedAt !== null ? r : { ...r, finishedAt: at };
}

/** The jamo the learner should press next, or undefined once the round is done. */
export const nextExpected = (r: Round): string | undefined =>
  isFinished(r) ? undefined : r.expected[r.typed.length];

/** Records one jamo press. The timer starts on the first press; the round ends when every position is filled. */
export function press(r: Round, jamo: string, code: string, now: number): Round {
  if (isFinished(r)) return r;
  const pos = r.typed.length;
  const expected = r.expected[pos];
  const correct = jamo === expected;
  const prev = r.log.at(-1);

  const isFirstTry = r.firstTry[pos] === undefined;
  const firstTry = isFirstTry ? replaceAt(r.firstTry, pos, correct) : r.firstTry;
  const typed = [...r.typed, jamo];

  return {
    ...r,
    typed,
    firstTry,
    log: [
      ...r.log,
      { index: pos, expected, typed: jamo, code, at: now, msSincePrev: prev ? now - prev.at : null, correct, firstTry: isFirstTry },
    ],
    startedAt: r.startedAt ?? now,
    finishedAt: typed.length === r.expected.length ? now : null,
  };
}

/** Removes the last typed jamo, like Backspace in a real input method. */
export function backspace(r: Round): Round {
  if (isFinished(r) || r.typed.length === 0) return r;
  return { ...r, typed: r.typed.slice(0, -1) };
}

export interface RoundStats {
  /** Correct jamo keystrokes per minute (타/분). Shift isn't counted. */
  netSpeed: number;
  /** Share of positions typed right on the first try, 0–100. */
  accuracy: number;
  seconds: number;
  correct: number;
  total: number;
  /** Jamo typed wrong on the first try, most-missed first. */
  missed: Array<{ jamo: string; count: number }>;
}

export function stats(r: Round, now: number): RoundStats {
  const end = r.finishedAt ?? now;
  const seconds = r.startedAt === null ? 0 : (end - r.startedAt) / 1000;
  const correct = r.typed.filter((j, i) => j === r.expected[i]).length;

  const tried = r.firstTry.filter((t) => t !== undefined);
  const accuracy = tried.length === 0 ? 100 : (100 * tried.filter(Boolean).length) / tried.length;

  const missCounts = new Map<string, number>();
  r.firstTry.forEach((ok, i) => {
    if (ok === false) missCounts.set(r.expected[i], (missCounts.get(r.expected[i]) ?? 0) + 1);
  });
  const missed = [...missCounts].map(([jamo, count]) => ({ jamo, count })).sort((a, b) => b.count - a.count);

  return {
    // Under a second there isn't enough time to give a meaningful rate.
    netSpeed: seconds < 1 ? 0 : Math.round((correct / seconds) * 60),
    accuracy: Math.round(accuracy * 10) / 10,
    seconds,
    correct,
    total: r.expected.length,
    missed,
  };
}

function replaceAt<T>(arr: readonly T[], i: number, value: T): T[] {
  const copy = [...arr];
  copy[i] = value;
  return copy;
}
