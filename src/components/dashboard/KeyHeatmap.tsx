import { useState } from 'react';
import { unitLabel } from '../../engine/curriculum';
import { MIN_SAMPLES, summarize } from '../../engine/keyStats';
import { COMPOUND, DOUBLE_FINAL } from '../../hangul/text';
import { HAND_SPLIT, ROWS, type KeyDef } from '../../hangul/layout';
import type { AppState } from '../../storage/progress';

const OFFSETS = [0, 0.3, 0.8];

/** The layout coloured by key mastery (0–5 stars), so the weakest keys stand out. */
export function KeyHeatmap({ state }: { state: AppState }) {
  const [active, setActive] = useState<string | null>(null);
  const unlocked = new Set(state.progress.unlocked);
  const info = (unit: string) => {
    const s = summarize(state.stats.get(unit), state.settings);
    return { unit, locked: !unlocked.has(unit), ...s };
  };

  // A key shows its base jamo's mastery; its Shift jamo is reported in the readout.
  const cell = (def: KeyDef, i: number) => {
    const k = info(def.base);
    const sh = def.shift ? info(def.shift) : null;
    const locked = k.locked && (!sh || sh.locked);
    const level = locked ? 'locked' : `s${k.locked ? sh!.stars : k.stars}`;
    return (
      <div
        key={def.code}
        className={`hk ${level} ${i === HAND_SPLIT ? 'split' : ''} ${active === def.code ? 'active' : ''}`}
        tabIndex={0}
        onPointerEnter={() => setActive(def.code)}
        onFocus={() => setActive(def.code)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        <span className="latin">{def.latin}</span>
        <span className="jamo">{def.base}</span>
        {def.shift && <span className="shifted">{def.shift}</span>}
      </div>
    );
  };

  const activeDef = ROWS.flat().find((d) => d.code === active);
  const patterns = [COMPOUND, DOUBLE_FINAL].map(info);

  return (
    <section className="dash-card">
      <h3>Key mastery</h3>
      <p className="sub">Each key's last 50 presses. Not affected by the date range.</p>

      <div className="heatmap" lang="ko">
        {ROWS.map((row, r) => (
          <div className="kb-row" key={r} style={{ paddingLeft: `calc(${OFFSETS[r]} * var(--hk))` }}>
            {row.map(cell)}
          </div>
        ))}
        <div className="kb-row patterns">
          {patterns.map((p) => (
            <div
              key={p.unit}
              className={`hk wide ${p.locked ? 'locked' : `s${p.stars}`} ${active === p.unit ? 'active' : ''}`}
              tabIndex={0}
              onPointerEnter={() => setActive(p.unit)}
              onFocus={() => setActive(p.unit)}
              onPointerLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
            >
              {unitLabel(p.unit)}
            </div>
          ))}
        </div>
      </div>

      <p className="readout" lang="ko" aria-live="polite">
        {activeDef
          ? [info(activeDef.base), ...(activeDef.shift ? [info(activeDef.shift)] : [])]
              .map((k) => describe(k, k.unit === activeDef.shift ? `Shift + ${activeDef.latin}` : activeDef.latin))
              .join('   ·   ')
          : active
            ? describe(info(active))
            : 'Point at or tab to a key for its numbers.'}
      </p>

      <div className="scale" aria-hidden="true">
        <span className="hk-swatch locked" /> locked
        <span className="hk-swatch s0" /> 0
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={`hk-swatch s${s}`} />
        ))}
        5 stars <span className="note">(3 = at target)</span>
      </div>
    </section>
  );
}

function describe(k: ReturnType<typeof summarize> & { unit: string; locked: boolean }, keys?: string): string {
  const name = keys ? `${k.unit} (${keys})` : unitLabel(k.unit);
  if (k.locked) return `${name}: locked`;
  if (k.samples < MIN_SAMPLES) return `${name}: ${k.samples} of ${MIN_SAMPLES} presses so far`;
  return `${name}: ${k.stars}★ · ${k.speed} 타/분 · ${Math.round(k.accuracy)}% over ${k.samples} presses`;
}
