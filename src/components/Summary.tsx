import { useEffect } from 'react';
import { unitLabel } from '../engine/curriculum';
import { stats, type Round } from '../engine/round';
import { fingerName, strokeForJamo } from '../hangul/layout';

interface Props {
  round: Round;
  /** True until the round is stored; the next round waits for it so it can use the new stats. */
  saving: boolean;
  /** A unit this round unlocked. */
  unlocked?: string;
  onNext: () => void;
  onRetry: () => void;
}

export function Summary({ round, saving, unlocked, onNext, onRetry }: Props) {
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
      <h2>Round complete</h2>
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
            {s.correct}/{s.total} keystrokes right
          </span>
        </div>
      </div>

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
        {round.target}
      </p>

      <div className="actions">
        <button className="primary" onClick={onNext} disabled={saving}>
          {saving ? 'Saving…' : 'Next round'} <kbd>Enter</kbd>
        </button>
        <button onClick={onRetry}>
          Same text again <kbd>R</kbd>
        </button>
      </div>
    </div>
  );
}

function describeUnlock(unit: string): string {
  const stroke = strokeForJamo(unit);
  if (!stroke) return `${unitLabel(unit)} unlocked`;
  const keys = stroke.shift ? `Shift + ${stroke.key.latin}` : stroke.key.latin;
  return `${unit} unlocked: ${keys}, ${fingerName(stroke.key.finger)}`;
}
