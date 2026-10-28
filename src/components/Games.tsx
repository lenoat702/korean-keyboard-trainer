import { dayKey } from '../engine/history';
import { RANKS, rankName, sprintScore } from '../engine/rank';
import type { AppState, SessionSummary, Status } from '../storage/progress';

export type GameKind = 'daily' | 'sprint' | 'falling';

interface GameInfo {
  kind: GameKind;
  name: string;
  about: string;
  /** Index into RANKS needed to play. */
  rank: number;
}

export const GAMES: readonly GameInfo[] = [
  { kind: 'daily', name: 'Daily challenge', about: 'The same text all day. Beat your earlier days.', rank: 0 },
  { kind: 'sprint', name: 'Sprint', about: '60 seconds for your top net speed. Sprints are the rank test.', rank: 1 },
  { kind: 'falling', name: 'Falling words', about: 'Type each word and press Space before it lands. Speed adapts to you.', rank: 1 },
];

interface Props {
  state: AppState;
  status: Status;
  onPlay: (kind: GameKind) => void;
}

/** The game modes, with what unlocks them and your best results so far. */
export function Games({ state, status, onPlay }: Props) {
  const { streak } = status;
  const goal = state.settings.dailyGoalMinutes;
  const minutes = Math.floor(streak.todaySeconds / 60);

  return (
    <div className="games">
      <section className="dash-card goal-card">
        <div>
          <span className="tile-label">Today</span>
          <b>
            {Math.min(minutes, goal)}/{goal} min
          </b>
          <span className="goal-bar wide">
            <span style={{ width: `${Math.min(1, streak.todaySeconds / (goal * 60)) * 100}%` }} />
          </span>
          <span className="tile-unit">{streak.todayMet ? 'Daily goal met' : `${goal - Math.min(minutes, goal)} min to your daily goal`}</span>
        </div>
        <div>
          <span className="tile-label">Streak</span>
          <b>{streak.current} days</b>
          <span className="tile-unit">Best {streak.best} · one missed day a week is forgiven</span>
        </div>
        <div>
          <span className="tile-label">Rank</span>
          <b lang="ko">{rankName(status.rank)}</b>
          <span className="tile-unit">{status.xpTotal.toLocaleString()} XP</span>
        </div>
      </section>

      <div className="game-cards">
        {GAMES.map((g) => {
          const locked = status.rank < g.rank;
          return (
            <section key={g.kind} className={`dash-card game-card ${locked ? 'locked' : ''}`}>
              <h3>{g.name}</h3>
              <p>{g.about}</p>
              <p className="game-best">{locked ? unlockText(g.rank) : bestText(g.kind, state)}</p>
              <button className="primary" disabled={locked} onClick={() => onPlay(g.kind)}>
                {locked ? 'Locked' : 'Play'}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function unlockText(rank: number): string {
  const r = RANKS[rank];
  return `Unlocks at ${r.ko} ${r.en}: pass stage ${r.stage}.`;
}

function bestText(kind: GameKind, state: AppState): string {
  const sessions = state.sessions.filter((s) => s.mode === kind);
  if (sessions.length === 0) return 'Not played yet.';
  if (kind === 'daily') {
    const today = bestOnDay(sessions, Date.now());
    const yesterday = bestOnDay(sessions, Date.now() - 86_400_000);
    const parts = [today === null ? 'Not played today' : `Today ${today} 타/분`];
    if (yesterday !== null) parts.push(`yesterday ${yesterday}`);
    return parts.join(' · ');
  }
  if (kind === 'sprint') {
    const best = Math.max(...sessions.map((s) => s.netSpeed));
    const score = sprintScore(sessions, 95);
    return `Best ${best} 타/분${score === null ? '' : ` · score ${score}`}`;
  }
  const best = Math.max(...sessions.map((s) => s.correct ?? 0));
  return `Best ${best} keystrokes cleared in a game`;
}

/** Best daily-challenge speed on the day containing `t`, or null if not played. */
export function bestOnDay(sessions: readonly SessionSummary[], t: number): number | null {
  const day = sessions.filter((s) => s.mode === 'daily' && dayKey(s.startedAt) === dayKey(t));
  return day.length ? Math.max(...day.map((s) => s.netSpeed)) : null;
}
