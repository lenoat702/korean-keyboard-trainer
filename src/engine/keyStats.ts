import { keystrokeUnits } from '../hangul/text';
import { nextLocked } from './curriculum';
import type { Round } from './round';

/** Presses remembered per unit. */
export const WINDOW = 50;
/** Presses needed before a unit's numbers count toward unlocking. */
export const MIN_SAMPLES = 20;
/** Gaps longer than this are a pause, not typing, so they don't count toward speed. */
export const PAUSE_MS = 3000;

export interface UnitStat {
  unit: string;
  /** Milliseconds from the previous press, for recent correct first tries. */
  times: number[];
  /** Whether each recent first try was right. */
  results: boolean[];
}

export interface Targets {
  /** 타/분 */
  targetSpeed: number;
  /** percent */
  accuracyFloor: number;
}

export type StatMap = ReadonlyMap<string, UnitStat>;

/**
 * Folds a finished round's first tries into the per-unit stats. Returns only the units that
 * changed. Only unlocked units count: every round has word gaps, but they're measured from stage 8.
 */
export function recordRound(stats: StatMap, round: Round, unlocked: readonly string[]): UnitStat[] {
  const counted = new Set(unlocked);
  const units = keystrokeUnits(round.target).map((list) => list.filter((u) => counted.has(u)));
  const changed = new Map<string, UnitStat>();
  const get = (unit: string) => {
    let s = changed.get(unit);
    if (!s) {
      const old = stats.get(unit);
      s = { unit, times: [...(old?.times ?? [])], results: [...(old?.results ?? [])] };
      changed.set(unit, s);
    }
    return s;
  };

  for (const p of round.log) {
    if (!p.firstTry) continue;
    for (const unit of units[p.index]) {
      const s = get(unit);
      s.results = [...s.results, p.correct].slice(-WINDOW);
      if (p.correct && p.msSincePrev !== null && p.msSincePrev <= PAUSE_MS) {
        s.times = [...s.times, p.msSincePrev].slice(-WINDOW);
      }
    }
  }
  return [...changed.values()];
}

export interface UnitSummary {
  /** 타/분, from the mean time per press. */
  speed: number;
  /** percent */
  accuracy: number;
  samples: number;
  ready: boolean;
  /** Ready on placement-test credit alone: it has fewer than MIN_SAMPLES presses so far. */
  placed: boolean;
  /** 0–5 */
  stars: number;
}

/**
 * A unit against the targets. `placed` is credit from the placement test: the unit counts as
 * ready until it has enough presses to be measured, and from then on its own numbers decide.
 */
export function summarize(stat: UnitStat | undefined, t: Targets, placed = false): UnitSummary {
  const samples = stat?.results.length ?? 0;
  if (!stat || samples === 0) return { speed: 0, accuracy: 0, samples: 0, ready: placed, placed, stars: 0 };

  const meanMs = stat.times.length ? stat.times.reduce((a, b) => a + b, 0) / stat.times.length : Infinity;
  const speed = Math.round(60000 / meanMs);
  const accuracy = (100 * stat.results.filter(Boolean).length) / samples;
  const enough = samples >= MIN_SAMPLES;
  const ready = enough ? speed >= t.targetSpeed && accuracy >= t.accuracyFloor : placed;

  return { speed, accuracy, samples, ready, placed: placed && !enough, stars: enough ? starsFor(speed / t.targetSpeed, accuracy >= t.accuracyFloor) : 0 };
}

// 3 stars = at target; more for going well past it. Below the accuracy floor caps at 2.
function starsFor(ratio: number, accurate: boolean): number {
  const stars = ratio >= 2 ? 5 : ratio >= 1.5 ? 4 : ratio >= 1 ? 3 : ratio >= 0.66 ? 2 : ratio >= 0.33 ? 1 : 0;
  return accurate ? stars : Math.min(stars, 2);
}

/** Whether a unit is at the targets, or still on placement credit. `placed` lists the credited units. */
export function isReady(unit: string, stats: StatMap, t: Targets, placed: readonly string[] = []): boolean {
  return summarize(stats.get(unit), t, placed.includes(unit)).ready;
}

/** The next unit to unlock, if every unlocked unit has reached the targets. */
export function unitToUnlock(
  unlocked: readonly string[],
  stats: StatMap,
  t: Targets,
  placed: readonly string[] = [],
): string | undefined {
  const next = nextLocked(unlocked);
  if (next === undefined) return undefined;
  return unlocked.every((u) => isReady(u, stats, t, placed)) ? next : undefined;
}

/**
 * The unit drills should lean on: the newest one until it's ready, otherwise the
 * unit furthest from the targets. Undefined only when everything is ready.
 */
export function focusUnit(
  unlocked: readonly string[],
  stats: StatMap,
  t: Targets,
  placed: readonly string[] = [],
): string | undefined {
  const newest = unlocked.at(-1);
  if (newest !== undefined && !isReady(newest, stats, t, placed)) return newest;

  let worst: string | undefined;
  let worstScore = Infinity;
  for (const u of unlocked) {
    const s = summarize(stats.get(u), t, placed.includes(u));
    if (s.ready) continue;
    // Too few samples ranks below any measured unit (score < 0), fewest first, so neglected units get practice.
    const score =
      s.samples < MIN_SAMPLES ? s.samples / MIN_SAMPLES - 1 : Math.min(s.speed / t.targetSpeed, s.accuracy / t.accuracyFloor);
    if (score < worstScore) {
      worst = u;
      worstScore = score;
    }
  }
  return worst;
}
