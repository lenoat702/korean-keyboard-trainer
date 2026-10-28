import { earnedBadges, isPersonalBest } from '../engine/badges';
import { currentStage, STARTING_UNITS } from '../engine/curriculum';
import { generateText, seededRandom } from '../engine/generator';
import { dayKey } from '../engine/history';
import { recordRound, summarize, unitToUnlock, type UnitStat } from '../engine/keyStats';
import { rankIndex, stagesPassed, type RankInput } from '../engine/rank';
import { stats as roundStats, type Round } from '../engine/round';
import { DEFAULT_GOAL_MINUTES, streakInfo, type StreakInfo } from '../engine/streak';
import { fallingXp, xpFor } from '../engine/xp';
import type { ProgressRow, SessionMode, SessionRow, SettingsRow, TrainerDB } from './db';

export const DEFAULT_SETTINGS: Required<SettingsRow> = {
  id: 'me',
  targetSpeed: 100,
  accuracyFloor: 95,
  dailyGoalMinutes: DEFAULT_GOAL_MINUTES,
};

/** A session without its text, which only the history views need. */
export type SessionSummary = Omit<SessionRow, 'text'>;

export interface AppState {
  progress: ProgressRow;
  stats: ReadonlyMap<string, UnitStat>;
  settings: Required<SettingsRow>;
  /** Every session, oldest first: the source for XP, streaks, sprints and badges. */
  sessions: readonly SessionSummary[];
  /** Badge id → when it was first earned. */
  badges: ReadonlyMap<string, number>;
}

/** Everything the app needs, with first-launch defaults for anything not saved yet. */
export async function loadState(db: TrainerDB): Promise<AppState> {
  const [progress, settings, rows, sessions, badges] = await Promise.all([
    db.progress.get('me'),
    db.settings.get('me'),
    db.keyStats.toArray(),
    db.sessions.orderBy('startedAt').toArray(),
    db.badges.toArray(),
  ]);
  return {
    progress: progress ?? { id: 'me', unlocked: [...STARTING_UNITS], stage: 1 },
    settings: { ...DEFAULT_SETTINGS, ...settings },
    stats: new Map(rows.map((r) => [r.unit, { unit: r.unit, times: r.times, results: r.results }])),
    sessions: sessions.map(({ text: _text, ...rest }) => rest),
    badges: new Map(badges.map((b) => [b.id, b.earnedAt])),
  };
}

// ── Derived status ──────────────────────────────────────────────────────────

export function rankInput(state: AppState): RankInput {
  return {
    unlocked: state.progress.unlocked,
    stats: state.stats,
    targets: state.settings,
    sprints: state.sessions.filter((s) => s.mode === 'sprint'),
  };
}

export interface Status {
  rank: number;
  streak: StreakInfo;
  xpTotal: number;
  stagesPassed: number;
}

export function status(state: AppState, now = Date.now()): Status {
  return {
    rank: rankIndex(rankInput(state)),
    streak: streakInfo(state.sessions, state.settings.dailyGoalMinutes, now),
    xpTotal: state.sessions.reduce((sum, s) => sum + s.xp, 0),
    stagesPassed: stagesPassed(state.progress.unlocked, state.stats, state.settings),
  };
}

// ── Saving ──────────────────────────────────────────────────────────────────

/** What a finished session earned, for the results screen. */
export interface Reward {
  mode: SessionMode;
  xp: number;
  rankBefore: number;
  rankAfter: number;
  newBadges: string[];
  /** A sprint faster than every earlier one. */
  personalBest: boolean;
  streak: StreakInfo;
  goalMinutes: number;
}

export interface SaveResult {
  state: AppState;
  /** The unit this round unlocked, if any. */
  unlocked?: string;
  reward: Reward;
}

/** Stores a finished round, updates per-unit stats, and unlocks the next unit if every unlocked one is ready. */
export async function saveRound(
  db: TrainerDB,
  state: AppState,
  round: Round,
  mode: Exclude<SessionMode, 'falling'> = 'adaptive',
): Promise<SaveResult> {
  if (round.startedAt === null || round.finishedAt === null) throw new Error('Round not finished');
  const s = roundStats(round, round.finishedAt);

  const changed = recordRound(state.stats, round);
  const stats = new Map(state.stats);
  for (const c of changed) stats.set(c.unit, c);

  const newUnit = unitToUnlock(state.progress.unlocked, stats, state.settings);
  const unlocked = newUnit ? [...state.progress.unlocked, newUnit] : state.progress.unlocked;
  const progress: ProgressRow = { id: 'me', unlocked, stage: currentStage(unlocked) };
  const session: SessionRow = {
    mode,
    stage: state.progress.stage,
    text: round.target,
    startedAt: round.startedAt,
    seconds: s.seconds,
    netSpeed: s.netSpeed,
    accuracy: s.accuracy,
    xp: xpFor(s.correct, s.accuracy),
    correct: s.correct,
  };

  let id = 0;
  await db.transaction('rw', [db.sessions, db.keystrokes, db.keyStats, db.progress, db.settings], async () => {
    id = (await db.sessions.add(session)) as number;
    await db.keystrokes.bulkAdd(
      round.log.map((p) => ({
        sessionId: id,
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

  const { text: _text, ...summary } = session;
  const after: AppState = { ...state, stats, progress, sessions: [...state.sessions, { ...summary, id }] };
  const { state: withBadges, reward } = await settleRewards(db, state, after);
  return { state: withBadges, unlocked: newUnit, reward };
}

export interface GameResult {
  mode: 'falling';
  /** What was cleared, for the record. */
  text: string;
  startedAt: number;
  seconds: number;
  netSpeed: number;
  accuracy: number;
  correct: number;
}

/** Stores a game that isn't a jamo-checked round, so it earns XP and practice time but no key stats. */
export async function saveGame(db: TrainerDB, state: AppState, game: GameResult): Promise<SaveResult> {
  const session: SessionRow = { ...game, stage: state.progress.stage, xp: fallingXp(game.correct) };
  const id = (await db.sessions.add(session)) as number;
  const { text: _text, ...summary } = session;
  const after: AppState = { ...state, sessions: [...state.sessions, { ...summary, id }] };
  return settleRewards(db, state, after);
}

/** Works out what the latest session earned and stores any newly earned badges. */
async function settleRewards(db: TrainerDB, before: AppState, after: AppState): Promise<{ state: AppState; reward: Reward }> {
  const now = Date.now();
  const latest = after.sessions.at(-1)!;
  const was = status(before, now);
  const is = status(after, now);
  const earned = earnedBadges({ sessions: after.sessions, stagesPassed: is.stagesPassed, bestStreak: is.streak.best });
  const newBadges = [...earned].filter((id) => !after.badges.has(id));
  if (newBadges.length > 0) await db.badges.bulkPut(newBadges.map((id) => ({ id, earnedAt: now })));

  const badges = new Map(after.badges);
  for (const id of newBadges) badges.set(id, now);
  return {
    state: { ...after, badges },
    reward: {
      mode: latest.mode,
      xp: latest.xp,
      rankBefore: was.rank,
      rankAfter: is.rank,
      newBadges,
      personalBest: isPersonalBest(after.sessions, latest),
      streak: is.streak,
      goalMinutes: after.settings.dailyGoalMinutes,
    },
  };
}

export async function saveDailyGoal(db: TrainerDB, state: AppState, minutes: number): Promise<AppState> {
  const settings = { ...state.settings, dailyGoalMinutes: minutes };
  await db.settings.put(settings);
  return { ...state, settings };
}

/** Keystrokes in a daily challenge: about twice a normal round. */
const DAILY_KEYSTROKES = 100;

/** Today's challenge text: made on first open from today's date, then kept all day. */
export async function dailyText(db: TrainerDB, state: AppState, now = Date.now()): Promise<string> {
  const day = dayKey(now);
  const saved = await db.daily.get(day);
  if (saved) return saved.text;
  const text = generateText({ unlocked: state.progress.unlocked, random: seededRandom(day), keystrokes: DAILY_KEYSTROKES });
  await db.daily.put({ day, text });
  return text;
}
