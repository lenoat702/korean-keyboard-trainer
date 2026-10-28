import { describe, expect, it } from 'vitest';
import { ALL_JAMO } from '../hangul/layout';
import { earnedBadges, isPersonalBest, type BadgeSession } from './badges';
import { FREE_TEXT_STAGE, stageInProgress, STAGES, UNLOCK_ORDER } from './curriculum';
import type { UnitStat } from './keyStats';
import { rankIndex, requirements, RANKS, sprintScore, stagesPassed, type RankInput, type SprintResult } from './rank';
import { streakInfo } from './streak';
import { fallingXp, xpFor } from './xp';

const TARGETS = { targetSpeed: 100, accuracyFloor: 95 };
const NO_STATS = new Map<string, UnitStat>();

describe('xpFor', () => {
  it('gives a point per correct keystroke', () => {
    expect(xpFor(50, 90)).toBe(50);
  });
  it('adds half again at 97%+', () => {
    expect(xpFor(50, 97)).toBe(75);
  });
  it('gives nothing under 85% accuracy', () => {
    expect(xpFor(50, 84.9)).toBe(0);
  });
});

describe('fallingXp', () => {
  it('pays every cleared keystroke, whatever the clear rate', () => {
    expect(fallingXp(59)).toBe(59);
    expect(fallingXp(0)).toBe(0);
  });
});

describe('streakInfo', () => {
  // Thursday 29 October 2026, midday. That week starts Monday the 26th.
  const now = new Date(2026, 9, 29, 12).getTime();
  const on = (day: number, minutes = 10) => ({ startedAt: new Date(2026, 9, day, 9).getTime(), seconds: minutes * 60 });

  it('counts consecutive goal days up to today', () => {
    const s = streakInfo([on(26), on(27), on(28), on(29)], 10, now);
    expect(s).toMatchObject({ current: 4, best: 4, todayMet: true, todaySeconds: 600 });
  });

  it("doesn't break while today's goal is still open", () => {
    expect(streakInfo([on(27), on(28), on(29, 4)], 10, now)).toMatchObject({ current: 2, todayMet: false, todaySeconds: 240 });
  });

  it('forgives one missed day a week', () => {
    expect(streakInfo([on(26), on(28), on(29)], 10, now).current).toBe(3);
  });

  it('breaks on a second missed day in the same week', () => {
    expect(streakInfo([on(26), on(29)], 10, now).current).toBe(1);
  });

  it('allows a skip in each of two weeks', () => {
    // Sunday 25th (week of the 19th) and Monday 26th (this week) both missed.
    expect(streakInfo([on(24), on(27), on(28), on(29)], 10, now).current).toBe(4);
  });

  it("doesn't count days short of the goal", () => {
    expect(streakInfo([on(28, 9), on(29, 9)], 10, now)).toMatchObject({ current: 0, best: 0 });
  });

  it('remembers the best streak after it ends', () => {
    const s = streakInfo([on(5), on(6), on(7), on(8), on(9), on(29)], 10, now);
    expect(s).toMatchObject({ current: 1, best: 5 });
  });

  it('adds up several sessions in a day', () => {
    expect(streakInfo([on(29, 4), on(29, 6)], 10, now)).toMatchObject({ todayMet: true, current: 1 });
  });
});

describe('stagesPassed', () => {
  it('passes a stage once the next stage starts', () => {
    const stage1 = STAGES[0].units.length;
    expect(stagesPassed(UNLOCK_ORDER.slice(0, stage1), NO_STATS, TARGETS)).toBe(0);
    expect(stagesPassed(UNLOCK_ORDER.slice(0, stage1 + 1), NO_STATS, TARGETS)).toBe(1);
  });

  it('passes the last keyed stage only when its units are at target, and never "passes" free text', () => {
    const sentences = STAGES.find((s) => s.id === 9)!.units;
    expect(stagesPassed(UNLOCK_ORDER, NO_STATS, TARGETS)).toBe(8);
    const ready = new Map(sentences.map((u) => [u, { unit: u, times: Array(20).fill(300), results: Array(20).fill(true) }]));
    expect(stagesPassed(UNLOCK_ORDER, ready, TARGETS)).toBe(9);
    expect(stageInProgress(UNLOCK_ORDER, 9)).toBe(FREE_TEXT_STAGE);
    expect(stageInProgress(UNLOCK_ORDER, 8)).toBe(9);
  });
});

describe('sprintScore', () => {
  const sprint = (i: number, netSpeed: number, accuracy = 96): SprintResult => ({ startedAt: i, netSpeed, accuracy });

  it('needs three qualifying sprints', () => {
    expect(sprintScore([sprint(1, 120), sprint(2, 130)], 95)).toBeNull();
  });

  it('averages the best three', () => {
    expect(sprintScore([sprint(1, 90), sprint(2, 120), sprint(3, 130), sprint(4, 140)], 95)).toBe(130);
  });

  it('ignores sprints under the accuracy floor', () => {
    expect(sprintScore([sprint(1, 200, 90), sprint(2, 100), sprint(3, 100), sprint(4, 100)], 95)).toBe(100);
  });

  it('only looks at the last ten', () => {
    const old = [sprint(1, 300), sprint(2, 300), sprint(3, 300)];
    const recent = Array.from({ length: 10 }, (_, i) => sprint(10 + i, 100));
    expect(sprintScore([...old, ...recent], 95)).toBe(100);
  });
});

describe('rankIndex', () => {
  const allKeys = UNLOCK_ORDER.slice(0, ALL_JAMO.length + 1); // every jamo, into stage 6
  const input = (unlocked: readonly string[], sprints: SprintResult[] = []): RankInput => ({
    unlocked,
    stats: NO_STATS,
    targets: TARGETS,
    sprints,
  });
  const at = (speed: number, n: number) => Array.from({ length: n }, (_, i) => ({ startedAt: i, netSpeed: speed, accuracy: 96 }));

  it('starts unranked, then ranks by stages passed', () => {
    expect(rankIndex(input(UNLOCK_ORDER.slice(0, 5)))).toBe(-1);
    expect(rankIndex(input(UNLOCK_ORDER.slice(0, 8)))).toBe(0); // Sprout
    expect(rankIndex(input(allKeys))).toBe(1); // Leaf
  });

  it('moves up when a sprint completes the best-three score', () => {
    expect(rankIndex(input(allKeys, at(120, 2)))).toBe(1);
    expect(rankIndex(input(allKeys, at(120, 3)))).toBe(2); // Bloom
    expect(rankIndex(input(allKeys, at(160, 3)))).toBe(3); // Tree
  });

  it('needs every key unlocked for sprint ranks', () => {
    expect(rankIndex(input(UNLOCK_ORDER.slice(0, 30), at(500, 3)))).toBe(1);
  });

  it('explains what the next rank needs', () => {
    const reqs = requirements(RANKS[2], input(allKeys, at(120, 2)));
    expect(reqs[0]).toMatchObject({ done: true });
    expect(reqs[1]).toMatchObject({ done: false, status: '2 of 3 sprints at 95%+ (of your last 10)' });
  });
});

describe('badges', () => {
  const s = (over: Partial<BadgeSession>): BadgeSession => ({ mode: 'adaptive', startedAt: 0, netSpeed: 100, accuracy: 90, ...over });

  it('earns the first-round, stage and streak badges', () => {
    const earned = earnedBadges({ sessions: [s({})], stagesPassed: 2, bestStreak: 7 });
    expect([...earned].sort()).toEqual(['first-syllable', 'home-row', 'stage-2', 'streak-7']);
  });

  it('counts a flawless round only when it is long enough', () => {
    expect(earnedBadges({ sessions: [s({ accuracy: 100, correct: 10 })], stagesPassed: 0, bestStreak: 0 }).has('flawless')).toBe(false);
    expect(earnedBadges({ sessions: [s({ accuracy: 100, correct: 40 })], stagesPassed: 0, bestStreak: 0 }).has('flawless')).toBe(true);
  });

  it('only calls a sprint a personal best when it beats an earlier one', () => {
    const first = s({ mode: 'sprint', startedAt: 1, netSpeed: 150 });
    const slower = s({ mode: 'sprint', startedAt: 2, netSpeed: 140 });
    const faster = s({ mode: 'sprint', startedAt: 3, netSpeed: 160 });
    expect(isPersonalBest([first], first)).toBe(false);
    expect(isPersonalBest([first, slower], slower)).toBe(false);
    expect(isPersonalBest([first, slower, faster], faster)).toBe(true);
  });

  it("doesn't count falling-words games as rounds", () => {
    expect(earnedBadges({ sessions: [s({ mode: 'falling' })], stagesPassed: 0, bestStreak: 0 }).size).toBe(0);
  });
});
