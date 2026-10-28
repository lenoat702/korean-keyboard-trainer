import { useEffect, type ReactNode } from 'react';
import { unitLabel } from '../engine/curriculum';
import { stats, type Round } from '../engine/round';
import { fingerName, strokeForJamo } from '../hangul/layout';
import { assembleTyped } from '../hangul/text';
import type { Reward } from '../storage/progress';
import { RewardPanel } from './RewardPanel';

interface Props {
  round: Round;
  /** True until the round is stored; the next round waits for it so it can use the new stats. */
  saving: boolean;
  /** A unit this round unlocked. */
  unlocked?: string;
  reward?: Reward;
  onNext: () => void;
  onRetry: () => void;
  title?: string;
  nextLabel?: string;
  retryLabel?: string;
  /** Extra results for a mode, e.g. the sprint score or the daily comparison. */
  extra?: ReactNode;
  onBack?: () => void;
}

export function Summary({
  round,
  saving,
  unlocked,
  reward,
  onNext,
  onRetry,
  title = 'Round complete',
  nextLabel = 'Next round',
  retryLabel = 'Same text again',
  extra,
  onBack,
}: Props) {
  const s = stats(round, round.finishedAt ?? 0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Enter' && !saving) onNext();
      if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) onRetry();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onRetry, saving]);

  return (
    <div className="summary">
      <h2>{title}</h2>
      {unlocked && <p className="unlock" lang="ko">New: {describeUnlock(unlocked)}</p>}
      <div className="scores">
        <div>
          <b>{s.netSpeed}</b>
          <span>타/분</span>
        </div>
        <div>
          <b>{s.accuracy}%</b>
          <span>accuracy</span>
        </div>
        <div>
          <b>{s.seconds.toFixed(1)}s</b>
          <span>
            {s.correct}/{round.typed.length} keystrokes right
          </span>
        </div>
      </div>

      {extra}
      <RewardPanel reward={saving ? undefined : reward} />

      {s.missed.length > 0 ? (
        <p className="missed" lang="ko">
          Missed on first try:{' '}
          {s.missed.map(({ jamo, count }) => (
            <span key={jamo} className="chip">
              {jamo === ' ' ? 'Space' : jamo} ×{count}
            </span>
          ))}
        </p>
      ) : (
        <p className="missed">No first-try mistakes.</p>
      )}

      <p lang="ko" className="typed-text">
        {shownText(round)}
      </p>

      <div className="actions">
        <button className="primary" onClick={onNext} disabled={saving}>
          {saving ? 'Saving…' : nextLabel} <kbd>Enter</kbd>
        </button>
        <button onClick={onRetry}>
          {retryLabel} <kbd>R</kbd>
        </button>
        {onBack && <button onClick={onBack}>Back to games</button>}
      </div>
    </div>
  );
}

/** The text practised: all of it, or only the part reached when a timed round ran out. */
function shownText(round: Round): string {
  return round.typed.length < round.expected.length ? assembleTyped(round.expected.slice(0, round.typed.length)) : round.target;
}

/** A newly unlocked unit and how to type it, e.g. "ㄱ unlocked: R, left index". */
export function describeUnlock(unit: string): string {
  const stroke = strokeForJamo(unit);
  if (!stroke) return `${unitLabel(unit)} unlocked`;
  const keys = stroke.shift ? `Shift + ${stroke.key.latin}` : stroke.key.latin;
  return `${unit} unlocked: ${keys}, ${fingerName(stroke.key.finger)}`;
}
