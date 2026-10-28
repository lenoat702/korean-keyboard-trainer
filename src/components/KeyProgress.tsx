import { nextLocked, stageInProgress, STAGES, unitLabel } from '../engine/curriculum';
import { MIN_SAMPLES, summarize } from '../engine/keyStats';
import { stagesPassed } from '../engine/rank';
import type { AppState } from '../storage/progress';

interface Props {
  state: AppState;
  focus?: string;
}

/** Each unlocked unit against the targets, and what unlocks next. */
export function KeyProgress({ state, focus }: Props) {
  const { progress, stats, settings } = state;
  const placed = new Set(progress.placed);
  const summary = (u: string) => summarize(stats.get(u), settings, placed.has(u));
  const passed = stagesPassed(progress.unlocked, stats, settings, progress.placed);
  const stage = STAGES.find((s) => s.id === stageInProgress(progress.unlocked, passed))!;
  const next = nextLocked(progress.unlocked);
  const readyCount = progress.unlocked.filter((u) => summary(u).ready).length;

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
          const s = summary(u);
          const status = s.placed ? 'ready placed' : s.ready ? 'ready' : s.samples < MIN_SAMPLES ? 'learning' : 'working';
          return (
            <li key={u} className={`unit ${status} ${u === focus ? 'focus' : ''}`} title={titleFor(u, s.samples, s.placed)}>
              <span className="label">{unitLabel(u)}</span>
              <span className="nums">
                {s.placed
                  ? `placed · ${s.samples}/${MIN_SAMPLES}`
                  : s.samples < MIN_SAMPLES
                    ? `${s.samples}/${MIN_SAMPLES}`
                    : `${s.speed} · ${Math.round(s.accuracy)}%`}
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

function titleFor(unit: string, samples: number, placed: boolean): string {
  if (placed) {
    return `${unitLabel(unit)}: passed in the placement test. It counts as at target until you've pressed it ${MIN_SAMPLES} times (${samples} so far); then your own numbers count.`;
  }
  if (samples < MIN_SAMPLES) return `${unitLabel(unit)}: ${samples} of ${MIN_SAMPLES} presses needed before it counts`;
  return `${unitLabel(unit)}: speed 타/분 · accuracy, over the last ${samples} presses`;
}
