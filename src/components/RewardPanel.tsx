import { badgeById } from '../engine/badges';
import { rankName } from '../engine/rank';
import type { Reward } from '../storage/progress';

/** What a finished round or game earned: XP, goal progress, streak, rank-ups and badges. */
export function RewardPanel({ reward }: { reward?: Reward }) {
  if (!reward) return <div className="rewards pending">Saving…</div>;
  const minutes = Math.floor(reward.streak.todaySeconds / 60);
  const goalShare = Math.min(1, reward.streak.todaySeconds / (reward.goalMinutes * 60));

  return (
    <div className="rewards">
      {reward.rankAfter > reward.rankBefore && (
        <p className="rank-up" lang="ko">
          Rank up: <b>{rankName(reward.rankAfter)}</b>
        </p>
      )}
      {reward.personalBest && <p className="rank-up">New personal best sprint</p>}

      <div className="reward-row">
        <span className="xp">+{reward.xp} XP</span>
        <div className="goal" title={`${minutes} of ${reward.goalMinutes} minutes today`}>
          <span>
            Daily goal {Math.min(minutes, reward.goalMinutes)}/{reward.goalMinutes} min
            {reward.streak.todayMet ? ' · met' : ''}
          </span>
          <span className="goal-bar">
            <span style={{ width: `${goalShare * 100}%` }} />
          </span>
        </div>
        <span className="streak">
          {reward.streak.current} day streak
        </span>
      </div>

      {reward.xp === 0 && reward.mode !== 'falling' && <p className="hint-text">No XP under 85% accuracy: slow down a little and it pays.</p>}

      {reward.newBadges.length > 0 && (
        <p className="new-badges">
          New badge{reward.newBadges.length > 1 ? 's' : ''}:{' '}
          {reward.newBadges.map((id) => (
            <span key={id} className="chip badge-chip" lang="ko" title={badgeById(id)?.description}>
              {badgeById(id)?.name ?? id}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
