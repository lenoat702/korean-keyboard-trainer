import { currentStage, nextLocked, STAGES, unitLabel } from '../engine/curriculum';
import { MIN_SAMPLES, summarize } from '../engine/keyStats';
import type { AppState } from '../storage/progress';

interface Props {
  state: AppState;
  focus?: string;
}

/** Each unlocked unit against the targets, and what unlocks next. */
export function KeyProgress({ state, focus }: Props) {
  const { progress, stats, settings } = state;
  const stage = STAGES.find((s) => s.id === currentStage(progress.unlocked))!;
  const next = nextLocked(progress.unlocked);
  const readyCount = progress.unlocked.filter((u) => summarize(stats.get(u), settings).ready).length;

  return (
    <section className="progress">
      <h2>
        Stage {stage.id} · {stage.name}
        <span>
          {readyCount}/{progress.unlocked.length} keys at target ({settings.targetSpeed} 타/분, {settings.accuracyFloor}%)
        </span>
      </h2>

      <ul className="units" lang="ko">
        {progress.unlocked.map((u) => {
          const s = summarize(stats.get(u), settings);
          const status = s.ready ? 'ready' : s.samples < MIN_SAMPLES ? 'learning' : 'working';
          return (
            <li key={u} className={`unit ${status} ${u === focus ? 'focus' : ''}`} title={titleFor(u, s.samples)}>
              <span className="label">{unitLabel(u)}</span>
              <span className="nums">
                {s.samples < MIN_SAMPLES ? `${s.samples}/${MIN_SAMPLES}` : `${s.speed} · ${Math.round(s.accuracy)}%`}
              </span>
            </li>
          );
        })}
        {next && (
          <li className="unit locked" title="Unlocks when every key above is at target">
            <span className="label">{unitLabel(next)}</span>
            <span className="nums">next</span>
          </li>
        )}
      </ul>
    </section>
  );
}

function titleFor(unit: string, samples: number): string {
  if (samples < MIN_SAMPLES) return `${unitLabel(unit)}: ${samples} of ${MIN_SAMPLES} presses needed before it counts`;
  return `${unitLabel(unit)}: speed 타/분 · accuracy, over the last ${samples} presses`;
}
