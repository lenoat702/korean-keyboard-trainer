import type { KeystrokeRow, SessionRow } from '../storage/db';
import { PAUSE_MS } from './keyStats';

/** Local calendar day, YYYY-MM-DD, so "today" matches the learner's clock. */
export function dayKey(t: number | Date): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Midnight at the start of the day `offset` days from `t`'s day (negative = earlier). */
export function startOfDay(t: number, offset = 0): Date {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}

export interface DayPoint {
  day: string;
  date: Date;
  minutes: number;
  rounds: number;
  /** Typing-time-weighted mean net speed that day (타/분); null with no practice. */
  speed: number | null;
  accuracy: number | null;
  /** Same, over the trailing 7 days ending this day. */
  avgSpeed: number | null;
  avgAccuracy: number | null;
}

interface Acc {
  /** All practice time, games included. */
  seconds: number;
  /** Time in jamo-checked rounds, which weights the speed and accuracy means. */
  scoredSec: number;
  speedSec: number;
  accSec: number;
  rounds: number;
}

/**
 * One point per calendar day for the `days` days ending today. Sessions from the 6 days
 * before the range should be included so the first points' 7-day averages are complete.
 */
export function dailySeries(
  sessions: readonly Pick<SessionRow, 'mode' | 'startedAt' | 'seconds' | 'netSpeed' | 'accuracy'>[],
  now: number,
  days: number,
): DayPoint[] {
  const byDay = new Map<string, Acc>();
  for (const s of sessions) {
    const key = dayKey(s.startedAt);
    const a = byDay.get(key) ?? { seconds: 0, scoredSec: 0, speedSec: 0, accSec: 0, rounds: 0 };
    byDay.set(key, a);
    a.seconds += s.seconds;
    a.rounds += 1;
    // Falling words scores words, not jamo, so it counts as practice time but not towards the trends.
    if (s.mode === 'falling') continue;
    a.scoredSec += s.seconds;
    a.speedSec += s.netSpeed * s.seconds;
    a.accSec += s.accuracy * s.seconds;
  }

  const mean = (a: Acc | undefined, field: 'speedSec' | 'accSec') =>
    a && a.scoredSec > 0 ? Math.round((a[field] / a.scoredSec) * 10) / 10 : null;

  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(now, -i);
    const day = dayKey(date);
    const today = byDay.get(day);

    const week: Acc = { seconds: 0, scoredSec: 0, speedSec: 0, accSec: 0, rounds: 0 };
    for (let j = 0; j < 7; j++) {
      const a = byDay.get(dayKey(startOfDay(date.getTime(), -j)));
      if (!a) continue;
      week.seconds += a.seconds;
      week.scoredSec += a.scoredSec;
      week.speedSec += a.speedSec;
      week.accSec += a.accSec;
      week.rounds += a.rounds;
    }

    points.push({
      day,
      date,
      minutes: Math.round(((today?.seconds ?? 0) / 60) * 10) / 10,
      rounds: today?.rounds ?? 0,
      speed: mean(today, 'speedSec'),
      accuracy: mean(today, 'accSec'),
      avgSpeed: mean(week.rounds ? week : undefined, 'speedSec'),
      avgAccuracy: mean(week.rounds ? week : undefined, 'accSec'),
    });
  }
  return points;
}

export interface PairStat {
  from: string;
  to: string;
  /** Median milliseconds from `from` to `to`. */
  median: number;
  count: number;
}

/**
 * Key-to-key transitions, slowest first. A pair counts only when both presses were
 * correct first tries typed back to back, so corrections and pauses don't pollute it.
 */
export function slowestPairs(keystrokes: readonly KeystrokeRow[], minCount = 5, limit = 10): PairStat[] {
  const times = new Map<string, number[]>();
  let prev: KeystrokeRow | undefined;
  for (const k of keystrokes) {
    if (
      prev &&
      prev.sessionId === k.sessionId &&
      prev.index === k.index - 1 &&
      prev.firstTry &&
      prev.correct &&
      k.firstTry &&
      k.correct &&
      prev.expected !== ' ' &&
      k.expected !== ' ' &&
      k.msSincePrev !== null &&
      k.msSincePrev <= PAUSE_MS
    ) {
      const key = prev.expected + k.expected;
      const list = times.get(key) ?? [];
      list.push(k.msSincePrev);
      times.set(key, list);
    }
    prev = k;
  }

  return [...times]
    .filter(([, list]) => list.length >= minCount)
    .map(([key, list]) => ({ from: [...key][0], to: [...key][1], median: median(list), count: list.length }))
    .sort((a, b) => b.median - a.median)
    .slice(0, limit);
}

function median(list: number[]): number {
  const s = [...list].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}
