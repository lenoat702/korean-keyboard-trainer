import type { Pair } from '../../engine/generator';
import type { PairStat } from '../../engine/history';

interface Props {
  pairs: readonly PairStat[];
  onDrill: (pair: Pair) => void;
}

/** The slowest key-to-key transitions, each with a button to drill it. */
export function SlowPairs({ pairs, onDrill }: Props) {
  const max = Math.max(...pairs.map((p) => p.median), 1);
  return (
    <section className="dash-card">
      <h3>Slowest key pairs</h3>
      <p className="sub">Median time from one key to the next, correct first tries only.</p>
      {pairs.length === 0 ? (
        <p className="empty">Not enough data yet. A pair shows up after you've typed it 5 times.</p>
      ) : (
        <ol className="pairs" lang="ko">
          {pairs.map((p) => (
            <li key={p.from + p.to}>
              <span className="pair-label">
                {p.from} → {p.to}
              </span>
              <span className="bar-track">
                {/* Scaled to the track minus room for the value label, so lengths stay proportional. */}
                <span className="bar" style={{ width: `calc((100% - var(--bar-label)) * ${p.median / max})` }} />
                <span className="bar-value">{p.median} ms</span>
              </span>
              <span className="pair-count">×{p.count}</span>
              <button onClick={() => onDrill([p.from, p.to])}>Drill this</button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
