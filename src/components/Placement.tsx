import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Targets } from '../engine/keyStats';
import { PLACEMENT_STAGES, placementText, stagePassed, unitsThrough } from '../engine/placement';
import { stats, type Round } from '../engine/round';
import { Practice } from './Practice';
import { describeUnlock } from './Summary';

interface Props {
  targets: Targets;
  /** Saves the stages typed and how many passed; resolves to the first key you'll practise next. */
  onSave: (rounds: Round[], passed: number) => Promise<string | undefined>;
  /** Back to practice, once the result has been seen (or the test was left before typing). */
  onDone: () => void;
}

type Phase = { kind: 'testing' } | { kind: 'saving' } | { kind: 'done'; next?: string } | { kind: 'failed'; error: string };

/** The placement test: a short text per stage, stopping at the first stage you don't pass. */
export function Placement({ targets, onSave, onDone }: Props) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'testing' });
  const stage = PLACEMENT_STAGES[rounds.length];
  const text = useMemo(() => (stage ? placementText(stage.id) : ''), [stage]);
  const passed = rounds.filter((r) => stagePassed(r, targets)).length;

  const finish = useCallback(
    (all: Round[]) => {
      const count = all.filter((r) => stagePassed(r, targets)).length;
      if (all.length === 0) return onDone();
      setPhase({ kind: 'saving' });
      onSave(all, count)
        .then((next) => setPhase({ kind: 'done', next }))
        .catch((e: unknown) => setPhase({ kind: 'failed', error: String(e) }));
    },
    [onSave, onDone, targets],
  );

  const onFinish = useCallback(
    (round: Round) => {
      const all = [...rounds, round];
      setRounds(all);
      if (!stagePassed(round, targets) || all.length === PLACEMENT_STAGES.length) finish(all);
    },
    [rounds, targets, finish],
  );

  useEffect(() => {
    if (phase.kind !== 'done') return;
    const onKey = (e: KeyboardEvent) => e.code === 'Enter' && onDone();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onDone]);

  if (phase.kind !== 'testing') {
    return (
      <section className="summary placement">
        <h2>{phase.kind === 'saving' ? 'Placement test done' : resultTitle(passed)}</h2>
        {phase.kind === 'failed' ? (
          <p className="error">Couldn't save the result: {phase.error}</p>
        ) : (
          <p>{resultText(passed, phase.kind === 'done' ? phase.next : undefined)}</p>
        )}
        <StageResults rounds={rounds} targets={targets} />
        <div className="actions">
          <button className="primary" onClick={onDone} disabled={phase.kind === 'saving'}>
            {phase.kind === 'saving' ? 'Saving…' : 'Start practising'} <kbd>Enter</kbd>
          </button>
        </div>
      </section>
    );
  }

  const last = rounds.at(-1);
  return (
    <>
      <div className="drill-banner placement-banner">
        <span>
          Placement test · stage {stage.id} of {PLACEMENT_STAGES.length}: {stage.name}
        </span>
        <button className="link" onClick={() => finish(rounds)}>
          {rounds.length === 0 ? 'Skip the test' : 'Stop here'}
        </button>
      </div>
      <p className="placement-note">
        {last
          ? `Stage ${rounds.length} passed (${stats(last, last.finishedAt!).netSpeed} 타/분, ${stats(last, last.finishedAt!).accuracy}%). This text adds stage ${stage.id}'s keys.`
          : `Type each short text at ${targets.targetSpeed} 타/분 and ${targets.accuracyFloor}% accuracy or better to skip that stage. Each text adds the next stage's keys; the test stops at the first one you don't pass. About two minutes.`}
      </p>
      <ol className="placement-steps" aria-label="Stages">
        {PLACEMENT_STAGES.map((s, i) => (
          <li key={s.id} className={i < rounds.length ? 'passed' : i === rounds.length ? 'current' : ''} title={s.name}>
            {s.id}
          </li>
        ))}
      </ol>
      <Practice key={stage.id} text={text} unlocked={new Set(unitsThrough(stage.id))} onFinish={onFinish} />
    </>
  );
}

function resultTitle(passed: number): string {
  if (passed === 0) return 'You start at the home row';
  if (passed === PLACEMENT_STAGES.length) return 'Every stage passed';
  const next = PLACEMENT_STAGES[passed];
  return `You start at stage ${next.id}: ${next.name}`;
}

function resultText(passed: number, next?: string): string {
  if (passed === 0) return 'Nothing skipped: the trainer starts you with the first home-row keys and adds keys as you reach the targets.';
  const credit = "count as at target until you've pressed each one 20 times; after that, your own numbers count like any other key's.";
  if (passed === PLACEMENT_STAGES.length) return `Every key is unlocked and practice moves on to free text. The keys ${credit}`;
  const skipped = passed === 1 ? 'Stage 1 is' : `Stages 1–${passed} are`;
  return `${skipped} unlocked. Their keys ${credit}${next ? ` New: ${describeUnlock(next)}.` : ''}`;
}

function StageResults({ rounds, targets }: { rounds: Round[]; targets: Targets }) {
  return (
    <table className="placement-results">
      <thead>
        <tr>
          <th scope="col">Stage</th>
          <th scope="col">타/분</th>
          <th scope="col">Accuracy</th>
          <th scope="col">Result</th>
        </tr>
      </thead>
      <tbody>
        {rounds.map((r, i) => {
          const s = stats(r, r.finishedAt!);
          const ok = stagePassed(r, targets);
          return (
            <tr key={i}>
              <th scope="row">
                {PLACEMENT_STAGES[i].id}. {PLACEMENT_STAGES[i].name}
              </th>
              <td className={s.netSpeed >= targets.targetSpeed ? '' : 'short'}>{s.netSpeed}</td>
              <td className={s.accuracy >= targets.accuracyFloor ? '' : 'short'}>{s.accuracy}%</td>
              <td className={ok ? 'ok' : 'short'}>{ok ? '✓ Passed' : '✗ Not yet'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
