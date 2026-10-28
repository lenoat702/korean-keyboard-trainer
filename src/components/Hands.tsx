import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import {
  FINGERS,
  handPose,
  targetTips,
  type FingerPose,
  type HandFinger,
  type HandPose,
  type KeyLayout,
  type Point,
  type Thumb,
} from '../hands/geometry';
import type { SkinColors } from '../hands/skin';

interface Props {
  /** The element holding the keyboard keys, each marked with data-code. */
  containerRef: RefObject<HTMLElement | null>;
  /** Physical keys held down, oldest first. */
  held: readonly string[];
  spaceThumb: Thumb;
  /** The finger for the next expected key, outlined as a gentle hint. */
  nextFinger?: HandFinger;
  skin: SkinColors;
}

/** Fingertips close ~95% of the distance to their target in about 3 × this many ms. */
const GLIDE_MS = 40;
/** Tips are drawn this far (in key widths) below a key's centre, so the jamo stays readable. */
const TIP_DROP = 0.24;

/** Two translucent hands over the on-screen keyboard that mirror the keys you press. */
export function Hands({ containerRef, held, spaceThumb, nextFinger, skin }: Props) {
  const layout = useKeyLayout(containerRef);
  const target = useMemo(() => (layout ? targetTips(layout, held, spaceThumb) : null), [layout, held, spaceThumb]);
  const glided = useGlide(target?.tips ?? null, layout);

  if (!layout || !target || !glided) return null;
  const { k } = layout;
  const tips = dropTips(glided, TIP_DROP * k);
  const poses = (['L', 'R'] as const).map((hand) => handPose(layout, hand, tips));
  const style = { '--skin': skin.base, '--skin-shade': skin.shade, '--nail': skin.nail } as CSSProperties;

  return (
    <svg className="hands" aria-hidden="true" style={style}>
      <defs>
        {poses.map((p) => (
          <linearGradient key={p.hand} id={`hand-fade-${p.hand}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={p.fadeFrom} y2={p.fadeTo}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
        ))}
        {poses.map((p) => (
          <mask key={p.hand} id={`hand-mask-${p.hand}`} maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000">
            <rect x="-10000" y="-10000" width="20000" height="20000" fill={`url(#hand-fade-${p.hand})`} />
          </mask>
        ))}
        {/* A soft highlight in the middle of the back of the hand gives it some volume. */}
        <radialGradient id="hand-palm" cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="var(--nail)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--skin)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {poses.map((p) => (
        <g key={p.hand} mask={`url(#hand-mask-${p.hand})`}>
          {/* Drawn opaque, then faded as one group, so overlaps don't show as darker seams. */}
          <g className="hand-shape">
            <HandSilhouette pose={p} k={k} />
          </g>
        </g>
      ))}

      {/* Fingers mid-press, tinted, on top of the silhouettes. */}
      {poses.flatMap((p) =>
        [...p.fingers, p.thumb]
          .filter((f) => target.pressing.has(f.finger))
          .map((f) => <path key={f.finger} className="finger-pressing" d={fingerPath(f)} />),
      )}

      {/* Only active fingertips get a ring; resting ones would cover the key labels. */}
      {FINGERS.map((f) => {
        const pressing = target.pressing.has(f);
        if (!pressing && f !== nextFinger) return null;
        const t = tips[f];
        return <circle key={f} className={`fingertip ${pressing ? 'pressing' : 'next'}`} cx={t.x} cy={t.y} r={0.17 * k} />;
      })}
    </svg>
  );
}

function dropTips(tips: Record<HandFinger, Point>, dy: number): Record<HandFinger, Point> {
  const out = {} as Record<HandFinger, Point>;
  for (const f of FINGERS) out[f] = { x: tips[f].x, y: tips[f].y + dy };
  return out;
}

/**
 * One hand in two passes: every part outlined in the shade colour, then every part
 * filled on top. The fills cover the outlines wherever parts overlap, so only the
 * hand's outer edge stays outlined.
 */
function HandSilhouette({ pose, k }: { pose: HandPose; k: number }) {
  const parts = [...pose.fingers, pose.thumb];
  const palm = smoothPath(pose.palm);
  const palmWidth = 0.35 * k;
  return (
    <>
      <g className="hand-outline">
        <path d={palm} strokeWidth={palmWidth + 3} />
        {parts.map((f) => (
          <path key={f.finger} d={fingerPath(f)} strokeWidth={3} />
        ))}
      </g>
      <g className="hand-fill">
        <path d={palm} strokeWidth={palmWidth} />
        <path d={palm} fill="url(#hand-palm)" stroke="none" />
        {parts.map((f) => (
          <path key={f.finger} d={fingerPath(f)} />
        ))}
      </g>
      {parts.map((f) => (
        <FingerDetail key={f.finger} pose={f} />
      ))}
    </>
  );
}

// A finger is a capsule that narrows from knuckle to tip, as a share of its width.
const KNUCKLE_HALF = 0.55;
const TIP_HALF = 0.42;

/** Unit vector along a finger (knuckle → tip) and the normal across it. */
function axes(f: FingerPose) {
  const dx = f.tip.x - f.knuckle.x;
  const dy = f.tip.y - f.knuckle.y;
  const len = Math.hypot(dx, dy) || 1;
  const d = { x: dx / len, y: dy / len };
  return { d, n: { x: -d.y, y: d.x }, len };
}

function fingerPath(f: FingerPose): string {
  const { n } = axes(f);
  const wk = f.width * KNUCKLE_HALF;
  const wt = f.width * TIP_HALF;
  const at = (p: Point, s: number) => `${p.x + n.x * s},${p.y + n.y * s}`;
  // Round caps at both ends: the tip bulges past the fingertip, the base hides in the palm.
  return [
    `M${at(f.knuckle, wk)}`,
    `L${at(f.tip, wt)}`,
    `A${wt},${wt} 0 0 0 ${at(f.tip, -wt)}`,
    `L${at(f.knuckle, -wk)}`,
    `A${wk},${wk} 0 0 0 ${at(f.knuckle, wk)}`,
    'Z',
  ].join(' ');
}

/** A fingernail near the tip and faint creases at the two finger joints. */
function FingerDetail({ pose: f }: { pose: FingerPose }) {
  const { d, n, len } = axes(f);
  const wt = f.width * TIP_HALF;
  const nail = { x: f.tip.x - d.x * wt * 0.3, y: f.tip.y - d.y * wt * 0.3 };
  const angle = (Math.atan2(-d.x, d.y) * 180) / Math.PI;
  const isThumb = f.finger.endsWith('1');
  // Joints sit roughly 45% and 72% of the way from knuckle to tip (the thumb shows one).
  const joints = isThumb ? [0.55] : [0.45, 0.72];
  return (
    <g className="finger-detail">
      {joints.map((s) => {
        const c = { x: f.knuckle.x + d.x * len * s, y: f.knuckle.y + d.y * len * s };
        const half = f.width * (KNUCKLE_HALF + (TIP_HALF - KNUCKLE_HALF) * s) * 0.5;
        return (
          <line
            key={s}
            className="crease"
            x1={c.x + n.x * half}
            y1={c.y + n.y * half}
            x2={c.x - n.x * half}
            y2={c.y - n.y * half}
          />
        );
      })}
      <ellipse className="nail" cx={nail.x} cy={nail.y} rx={wt * 0.62} ry={wt * 0.78} transform={`rotate(${angle} ${nail.x} ${nail.y})`} />
    </g>
  );
}

/** A closed curve through the points (Catmull-Rom as cubic Béziers), for a rounder palm. */
function smoothPath(pts: readonly Point[]): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M${p(0).x},${p(0).y}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d + ' Z';
}

/** Measures every key's centre inside the container, again whenever it resizes. */
function useKeyLayout(containerRef: RefObject<HTMLElement | null>): KeyLayout | null {
  const [layout, setLayout] = useState<KeyLayout | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const centers = new Map<string, Point>();
      let k = 0;
      let space: KeyLayout['space'] | undefined;
      el.querySelectorAll<HTMLElement>('[data-code]').forEach((key) => {
        const r = key.getBoundingClientRect();
        const c = { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
        const code = key.dataset.code!;
        centers.set(code, c);
        if (code === 'KeyA') k = r.width;
        if (code === 'Space') space = { ...c, w: r.width };
      });
      setLayout(k > 0 && space ? { centers, k, space } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Web fonts can shift key sizes slightly after first paint.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [containerRef]);

  return layout;
}

/**
 * Animates fingertips towards their targets with exponential easing. Snaps when the
 * layout changes (no gliding across a resize) and when the user prefers reduced motion.
 */
function useGlide(target: Record<HandFinger, Point> | null, layout: KeyLayout | null): Record<HandFinger, Point> | null {
  const [, setFrame] = useState(0);
  const current = useRef<Record<HandFinger, Point> | null>(null);
  const lastLayout = useRef<KeyLayout | null>(null);
  const targetRef = useRef(target);
  targetRef.current = target;

  if (target && (current.current === null || lastLayout.current !== layout || prefersReducedMotion())) {
    current.current = target;
    lastLayout.current = layout;
  }

  useEffect(() => {
    if (!target) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const goal = targetRef.current;
      const cur = current.current;
      if (!goal || !cur) return;
      const a = 1 - Math.exp(-(t - last) / GLIDE_MS);
      last = t;
      let moving = false;
      const next = {} as Record<HandFinger, Point>;
      for (const f of FINGERS) {
        const dx = goal[f].x - cur[f].x;
        const dy = goal[f].y - cur[f].y;
        if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
          next[f] = goal[f];
        } else {
          next[f] = { x: cur[f].x + dx * a, y: cur[f].y + dy * a };
          moving = true;
        }
      }
      current.current = next;
      setFrame((n) => n + 1);
      if (moving) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return current.current;
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
