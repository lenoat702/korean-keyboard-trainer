import { ALL_JAMO } from '../hangul/layout';
import { STAGES } from './curriculum';
import { summarize, type StatMap, type Targets } from './keyStats';

// Rank comes only from measured skill: passed stages, then the sprint (rank test).

export interface Rank {
  id: string;
  ko: string;
  en: string;
  /** Stage that must be passed. */
  stage?: number;
  /** Every jamo unlocked, and a sprint score of `speed` 타/분 at `accuracy`% or better. */
  speed?: number;
  accuracy?: number;
}

export const RANKS: readonly Rank[] = [
  { id: 'sprout', ko: '새싹', en: 'Sprout', stage: 1 },
  { id: 'leaf', ko: '잎새', en: 'Leaf', stage: 4 },
  { id: 'bloom', ko: '꽃', en: 'Bloom', speed: 100, accuracy: 95 },
  { id: 'tree', ko: '나무', en: 'Tree', speed: 150, accuracy: 96 },
  { id: 'forest', ko: '숲', en: 'Forest', speed: 200, accuracy: 96 },
  { id: 'mountain', ko: '산', en: 'Mountain', speed: 300, accuracy: 97 },
  { id: 'sky', ko: '하늘', en: 'Sky', speed: 400, accuracy: 97 },
];

/** Sprint score: the mean of the best BEST_OF results among the last SPRINT_WINDOW sprints. */
export const SPRINT_WINDOW = 10;
export const BEST_OF = 3;

export interface SprintResult {
  startedAt: number;
  netSpeed: number;
  accuracy: number;
}

export interface RankInput {
  unlocked: readonly string[];
  stats: StatMap;
  targets: Targets;
  sprints: readonly SprintResult[];
}

/**
 * The highest stage passed. A stage is passed once the next stage's first unit unlocks (the
 * unlock rule only allows that when every unit so far is at target); the last stage, once
 * all its units are at target.
 */
export function stagesPassed(unlocked: readonly string[], stats: StatMap, targets: Targets): number {
  const have = new Set(unlocked);
  let passed = 0;
  for (const [i, stage] of STAGES.entries()) {
    const next = STAGES[i + 1];
    const done = next
      ? have.has(next.units[0])
      : stage.units.every((u) => have.has(u) && summarize(stats.get(u), targets).ready);
    if (!done) break;
    passed = stage.id;
  }
  return passed;
}

export function allJamoUnlocked(unlocked: readonly string[]): boolean {
  const have = new Set(unlocked);
  return ALL_JAMO.every((j) => have.has(j));
}

/** The sprints that count towards an accuracy floor: those at or above it among the last few. */
export function qualifyingSprints(sprints: readonly SprintResult[], accuracyFloor: number): SprintResult[] {
  return [...sprints]
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-SPRINT_WINDOW)
    .filter((s) => s.accuracy >= accuracyFloor);
}

/** Mean of the best three qualifying sprints, or null until there are three. */
export function sprintScore(sprints: readonly SprintResult[], accuracyFloor: number): number | null {
  const best = qualifyingSprints(sprints, accuracyFloor)
    .map((s) => s.netSpeed)
    .sort((a, b) => b - a)
    .slice(0, BEST_OF);
  return best.length < BEST_OF ? null : Math.round(best.reduce((a, b) => a + b, 0) / BEST_OF);
}

function meets(rank: Rank, input: RankInput, passed: number): boolean {
  if (rank.stage !== undefined) return passed >= rank.stage;
  if (!allJamoUnlocked(input.unlocked)) return false;
  const score = sprintScore(input.sprints, rank.accuracy!);
  return score !== null && score >= rank.speed!;
}

/** Index into RANKS of the rank held, or -1 before the first. Ranks are earned in order. */
export function rankIndex(input: RankInput): number {
  const passed = stagesPassed(input.unlocked, input.stats, input.targets);
  let i = -1;
  while (i + 1 < RANKS.length && meets(RANKS[i + 1], input, passed)) i++;
  return i;
}

export interface Requirement {
  label: string;
  done: boolean;
  /** Where you are now, e.g. "2 of 4 stages passed". */
  status: string;
}

/** What the given rank asks for, and how far along each part is. */
export function requirements(rank: Rank, input: RankInput): Requirement[] {
  if (rank.stage !== undefined) {
    const passed = stagesPassed(input.unlocked, input.stats, input.targets);
    return [{ label: `Pass stage ${rank.stage}`, done: passed >= rank.stage, status: `${passed} of ${rank.stage} stages passed` }];
  }
  const unlockedCount = ALL_JAMO.filter((j) => input.unlocked.includes(j)).length;
  const qualifying = qualifyingSprints(input.sprints, rank.accuracy!).length;
  const score = sprintScore(input.sprints, rank.accuracy!);
  return [
    {
      label: `Unlock all ${ALL_JAMO.length} keys`,
      done: unlockedCount === ALL_JAMO.length,
      status: `${unlockedCount} of ${ALL_JAMO.length} unlocked`,
    },
    {
      label: `Sprint score ${rank.speed} 타/분 at ${rank.accuracy}%+ accuracy`,
      done: score !== null && score >= rank.speed!,
      status:
        score === null
          ? `${qualifying} of ${BEST_OF} sprints at ${rank.accuracy}%+ (of your last ${SPRINT_WINDOW})`
          : `Score ${score} 타/분 (best ${BEST_OF} of last ${SPRINT_WINDOW})`,
    },
  ];
}

export function rankName(i: number): string {
  return i < 0 ? 'Unranked' : `${RANKS[i].ko} ${RANKS[i].en}`;
}
