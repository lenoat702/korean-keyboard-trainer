import { currentStage, STARTING_UNITS } from '../engine/curriculum';
import { recordRound, summarize, unitToUnlock, type UnitStat } from '../engine/keyStats';
import { stats as roundStats, type Round } from '../engine/round';
import type { ProgressRow, SessionRow, SettingsRow, TrainerDB } from './db';

export const DEFAULT_SETTINGS: SettingsRow = { id: 'me', targetSpeed: 100, accuracyFloor: 95 };

export interface AppState {
  progress: ProgressRow;
  stats: ReadonlyMap<string, UnitStat>;
  settings: SettingsRow;
}

/** Everything the practice screen needs, with first-launch defaults for anything not saved yet. */
export async function loadState(db: TrainerDB): Promise<AppState> {
  const [progress, settings, rows] = await Promise.all([db.progress.get('me'), db.settings.get('me'), db.keyStats.toArray()]);
  return {
    progress: progress ?? { id: 'me', unlocked: [...STARTING_UNITS], stage: 1 },
    settings: settings ?? DEFAULT_SETTINGS,
    stats: new Map(rows.map((r) => [r.unit, { unit: r.unit, times: r.times, results: r.results }])),
  };
}

export interface SaveResult {
  state: AppState;
  /** The unit this round unlocked, if any. */
  unlocked?: string;
}

/** Stores a finished round, updates per-unit stats, and unlocks the next unit if every unlocked one is ready. */
export async function saveRound(
  db: TrainerDB,
  state: AppState,
  round: Round,
  mode: SessionRow['mode'] = 'adaptive',
): Promise<SaveResult> {
  if (round.startedAt === null || round.finishedAt === null) throw new Error('Round not finished');
  const startedAt = round.startedAt;
  const s = roundStats(round, round.finishedAt);

  const changed = recordRound(state.stats, round);
  const stats = new Map(state.stats);
  for (const c of changed) stats.set(c.unit, c);

  const newUnit = unitToUnlock(state.progress.unlocked, stats, state.settings);
  const unlocked = newUnit ? [...state.progress.unlocked, newUnit] : state.progress.unlocked;
  const progress: ProgressRow = { id: 'me', unlocked, stage: currentStage(unlocked) };

  await db.transaction('rw', [db.sessions, db.keystrokes, db.keyStats, db.progress, db.settings], async () => {
    const sessionId = await db.sessions.add({
      mode,
      stage: state.progress.stage,
      text: round.target,
      startedAt,
      seconds: s.seconds,
      netSpeed: s.netSpeed,
      accuracy: s.accuracy,
      xp: 0,
    });
    await db.keystrokes.bulkAdd(
      round.log.map((p) => ({
        sessionId: sessionId as number,
        index: p.index,
        time: p.at,
        expected: p.expected,
        typed: p.typed,
        keyCode: p.code,
        msSincePrev: p.msSincePrev,
        correct: p.correct,
        firstTry: p.firstTry,
      })),
    );
    await db.keyStats.bulkPut(changed.map((c) => ({ ...c, stars: summarize(c, state.settings).stars })));
    await db.progress.put(progress);
    // Save settings too, so first-launch defaults become explicit once you've practised.
    await db.settings.put(state.settings);
  });

  return { state: { ...state, stats, progress }, unlocked: newUnit };
}
