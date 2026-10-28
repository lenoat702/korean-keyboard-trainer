import { BADGES } from '../../engine/badges';
import { RANKS, requirements } from '../../engine/rank';
import { rankInput, type AppState, type Status } from '../../storage/progress';
import { longDate } from './TrendChart';

const GOAL_CHOICES = [5, 10, 15, 20, 30, 45, 60];

interface Props {
  state: AppState;
  status: Status;
  onGoalChange: (minutes: number) => void;
}

/** Rank ladder, what the next rank needs, the daily goal, and badges. */
export function RewardsSection({ state, status, onGoalChange }: Props) {
  const next = RANKS[status.rank + 1];
  const reqs = next ? requirements(next, rankInput(state)) : [];

  return (
    <section className="dash-card rewards-section">
      <h3>Rank and rewards</h3>
      <ol className="rank-ladder" lang="ko">
        {RANKS.map((r, i) => (
          <li key={r.id} className={i < status.rank ? 'passed' : i === status.rank ? 'current' : ''} aria-current={i === status.rank ? 'step' : undefined}>
            <b>{r.ko}</b>
            <span>{r.en}</span>
          </li>
        ))}
      </ol>

      {next ? (
        <div className="next-rank">
          <p>
            Next: <b lang="ko">{next.ko}</b> {next.en}
          </p>
          <ul>
            {reqs.map((q) => (
              <li key={q.label} className={q.done ? 'done' : ''}>
                <span aria-hidden="true">{q.done ? '✓' : '○'}</span> {q.label} <span className="quiet">· {q.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="next-rank">Top rank reached.</p>
      )}

      <div className="reward-stats">
        <span>
          <b>{status.xpTotal.toLocaleString()}</b> XP
        </span>
        <span>
          <b>{status.streak.current}</b> day streak (best {status.streak.best})
        </span>
        <label>
          Daily goal{' '}
          <select value={state.settings.dailyGoalMinutes} onChange={(e) => onGoalChange(Number(e.target.value))}>
            {GOAL_CHOICES.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>

      <h4>
        Badges <span className="quiet">· {state.badges.size} of {BADGES.length}</span>
      </h4>
      <ul className="badge-grid">
        {BADGES.map((b) => {
          const at = state.badges.get(b.id);
          return (
            <li key={b.id} className={at ? 'earned' : ''} lang="ko">
              <b>{b.name}</b>
              <span>{at ? `Earned ${longDate(new Date(at))}` : b.description}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
