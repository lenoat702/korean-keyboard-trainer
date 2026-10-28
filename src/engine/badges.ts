import type { SessionMode } from '../storage/db';
import { STAGES } from './curriculum';

/** Stages with a 'cleared' badge: from stage 2 up to the last one with keys to pass. */
const KEYED_STAGES = STAGES.slice(1).filter((s) => s.units.length > 0);

// Badges are worked out from saved history each time, so they can never get out of step with
// it. Storage only remembers when each was first earned.

export interface Badge {
  id: string;
  name: string;
  description: string;
}

/** A zero-error round must be at least this long to count. */
export const FLAWLESS_MIN_KEYSTROKES = 20;

export const BADGES: readonly Badge[] = [
  { id: 'first-syllable', name: '첫 글자 First syllable', description: 'Finish your first round' },
  { id: 'home-row', name: 'Home row', description: 'Pass stage 1, the home row' },
  ...KEYED_STAGES.map((s) => ({ id: `stage-${s.id}`, name: `Stage ${s.id} cleared`, description: `Pass stage ${s.id}: ${s.name.toLowerCase()}` })),
  { id: 'streak-7', name: '7-day streak', description: 'Meet your daily goal 7 days running' },
  { id: 'streak-30', name: '30-day streak', description: 'Meet your daily goal 30 days running' },
  { id: 'flawless', name: 'Flawless', description: `Finish a round of ${FLAWLESS_MIN_KEYSTROKES}+ keystrokes with no mistakes` },
  { id: 'personal-best', name: 'Personal best', description: 'Beat your best sprint speed' },
];

export interface BadgeSession {
  mode: SessionMode;
  startedAt: number;
  netSpeed: number;
  accuracy: number;
  correct?: number;
}

export interface BadgeContext {
  sessions: readonly BadgeSession[];
  stagesPassed: number;
  bestStreak: number;
}

/** True if the latest sprint beat every earlier one (there must be an earlier one). */
export function isPersonalBest(sessions: readonly BadgeSession[], latest: BadgeSession): boolean {
  const earlier = sessions.filter((s) => s.mode === 'sprint' && s !== latest && s.startedAt < latest.startedAt);
  return latest.mode === 'sprint' && earlier.length > 0 && latest.netSpeed > Math.max(...earlier.map((s) => s.netSpeed));
}

export function earnedBadges({ sessions, stagesPassed, bestStreak }: BadgeContext): Set<string> {
  const earned = new Set<string>();
  // Falling-words games aren't jamo-checked rounds, so they don't count as rounds here.
  const rounds = sessions.filter((s) => s.mode !== 'falling');
  if (rounds.length > 0) earned.add('first-syllable');
  if (stagesPassed >= 1) earned.add('home-row');
  for (const s of KEYED_STAGES) if (stagesPassed >= s.id) earned.add(`stage-${s.id}`);
  if (bestStreak >= 7) earned.add('streak-7');
  if (bestStreak >= 30) earned.add('streak-30');
  if (rounds.some((s) => s.accuracy === 100 && (s.correct ?? 0) >= FLAWLESS_MIN_KEYSTROKES)) earned.add('flawless');
  if (sessions.some((s) => isPersonalBest(sessions, s))) earned.add('personal-best');
  return earned;
}

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
