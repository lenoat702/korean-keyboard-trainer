import { dayKey, startOfDay } from './history';

// The daily goal and streak. A day counts when its practice time reaches the goal. A streak
// is consecutive goal days, with one missed day forgiven per calendar week (Monday start).

export const DEFAULT_GOAL_MINUTES = 10;

interface Timed {
  startedAt: number;
  seconds: number;
}

export interface StreakInfo {
  /** Goal days in the streak running up to today (or yesterday, while today is still open). */
  current: number;
  /** The longest streak ever. */
  best: number;
  todaySeconds: number;
  todayMet: boolean;
}

export function secondsByDay(sessions: readonly Timed[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.startedAt), (byDay.get(dayKey(s.startedAt)) ?? 0) + s.seconds);
  return byDay;
}

/** The Monday that starts the week containing `d`, as a day key. */
function weekOf(d: Date): string {
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
}

export function streakInfo(sessions: readonly Timed[], goalMinutes: number, now: number): StreakInfo {
  const byDay = secondsByDay(sessions);
  const goal = goalMinutes * 60;
  const met = new Set([...byDay].filter(([, sec]) => sec >= goal).map(([day]) => day));
  const todaySeconds = byDay.get(dayKey(now)) ?? 0;
  const todayMet = met.has(dayKey(now));
  if (met.size === 0) return { current: 0, best: 0, todaySeconds, todayMet };

  const first = Math.min(...sessions.map((s) => s.startedAt));
  const firstOffset = Math.round((startOfDay(first).getTime() - startOfDay(now).getTime()) / 86_400_000);

  // Goal days in the streak ending on the day `offset` days from today, walking backwards.
  const countBack = (offset: number): number => {
    let count = 0;
    const skipped = new Set<string>();
    for (let off = offset; off >= firstOffset; off--) {
      const date = startOfDay(now, off);
      if (met.has(dayKey(date))) {
        count++;
        continue;
      }
      const week = weekOf(date);
      if (skipped.has(week)) break;
      skipped.add(week);
    }
    return count;
  };

  let best = 0;
  for (let off = 0; off >= firstOffset; off--) {
    if (met.has(dayKey(startOfDay(now, off)))) best = Math.max(best, countBack(off));
  }
  // Today isn't over, so not meeting the goal yet doesn't break the streak.
  return { current: countBack(todayMet ? 0 : -1), best, todaySeconds, todayMet };
}
