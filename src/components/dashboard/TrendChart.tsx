import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface Series {
  label: string;
  values: readonly (number | null)[];
  /** Daily values are dots; the smoothed average is a line. */
  kind: 'dots' | 'line';
}

interface Props {
  title: string;
  dates: readonly Date[];
  series: readonly Series[];
  format: (v: number) => string;
  /** Lower bound of the y-axis; the upper bound is a nice number above the data. */
  yMin?: number;
  yMax?: number;
  /** Day index under the pointer, shared between charts so they move together. */
  hover: number | null;
  onHover: (i: number | null) => void;
  height?: number;
}

const M = { top: 12, right: 44, bottom: 24, left: 40 };

export function TrendChart({ title, dates, series, format, yMin = 0, yMax, hover, onHover, height = 180 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useWidth(wrapRef);
  const n = dates.length;
  const plotW = Math.max(width - M.left - M.right, 10);
  const plotH = height - M.top - M.bottom;

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const ticks = niceTicks(yMin, yMax ?? Math.max(yMin + 1, ...all));
  const top = ticks.at(-1)!;
  const x = (i: number) => M.left + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => M.top + plotH - ((v - yMin) / (top - yMin)) * plotH;

  const indexAt = (px: number) => Math.max(0, Math.min(n - 1, Math.round(((px - M.left) / plotW) * (n - 1))));
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    onHover(indexAt(e.clientX - rect.left));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const from = hover ?? n - 1;
    onHover(Math.max(0, Math.min(n - 1, from + (e.key === 'ArrowLeft' ? -1 : 1))));
  };

  const xLabels = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];
  const line = series.find((s) => s.kind === 'line');
  const lastLine = line ? lastIndex(line.values) : -1;

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div className="chart-plot" ref={wrapRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}. Use left and right arrow keys to read each day.`}
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => hover === null && onHover(n - 1)}
          onBlur={() => onHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />
              <text className="tick" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text key={i} className="tick" x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {shortDate(dates[i])}
            </text>
          ))}

          {hover !== null && <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} />}

          {series.map((s) =>
            s.kind === 'line' ? (
              <path key={s.label} className="series-line" d={linePath(s.values, x, y)} />
            ) : (
              <g key={s.label}>
                {s.values.map((v, i) => (v === null ? null : <circle key={i} className="series-dot" cx={x(i)} cy={y(v)} r={4} />))}
              </g>
            ),
          )}

          {hover !== null &&
            series.map((s) => {
              const v = s.values[hover];
              return v === null ? null : (
                <circle key={s.label} className={s.kind === 'line' ? 'hover-line-dot' : 'hover-dot'} cx={x(hover)} cy={y(v)} r={5} />
              );
            })}

          {/* Direct label at the end of the average line only; the tooltip and table carry the rest. */}
          {line && lastLine >= 0 && hover === null && (
            <text className="end-label" x={x(lastLine) + 8} y={y(line.values[lastLine]!)} dy="0.32em">
              {format(line.values[lastLine]!)}
            </text>
          )}

          <rect
            className="hit"
            x={M.left - 8}
            y={0}
            width={plotW + 16}
            height={height}
            onPointerMove={onMove}
            onPointerLeave={() => onHover(null)}
          />
        </svg>

        {hover !== null && (
          <div className="tooltip" style={tooltipPos(x(hover), width)}>
            <div className="tt-date">{longDate(dates[hover])}</div>
            {series.map((s) => (
              <div key={s.label} className="tt-row">
                <span className={`key-${s.kind}`} />
                <b>{s.values[hover] === null ? '—' : format(s.values[hover]!)}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}

export function Legend({ series }: { series: readonly Series[] }) {
  return (
    <div className="legend">
      {series.map((s) => (
        <span key={s.label}>
          <span className={`key-${s.kind}`} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** About four evenly spaced round numbers from `min` up past `max`. */
function niceTicks(min: number, max: number): number[] {
  const raw = (max - min) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks = [];
  for (let t = min; t < max + step; t += step) {
    ticks.push(Math.round(t * 100) / 100);
    if (t >= max) break;
  }
  return ticks;
}

/** A path through the non-null values, with gaps where data is missing. */
function linePath(values: readonly (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

function lastIndex(values: readonly (number | null)[]): number {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return i;
  return -1;
}

function tooltipPos(px: number, width: number): React.CSSProperties {
  // Keep the tooltip on the side of the crosshair with more room.
  return px > width / 2 ? { right: width - px + 12 } : { left: px + 12 };
}

const shortFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const longFmt = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' });
export const shortDate = (d: Date) => shortFmt.format(d);
export const longDate = (d: Date) => longFmt.format(d);
