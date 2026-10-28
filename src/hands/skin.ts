// Skin colours for the on-screen hands, picked anywhere along a light-to-dark scale.

export interface SkinColors {
  base: string;
  /** Outline and joint creases. */
  shade: string;
  nail: string;
}

/** Evenly spaced stops from lightest (0) to darkest (1). */
const STOPS: readonly SkinColors[] = [
  { base: '#f3cfb3', shade: '#c99a7a', nail: '#fadbd0' },
  { base: '#e2b08a', shade: '#b07f5c', nail: '#f3cdb6' },
  { base: '#c48a5f', shade: '#91603d', nail: '#e2b496' },
  { base: '#9a6644', shade: '#6b432a', nail: '#c2927a' },
  { base: '#6a432b', shade: '#43291a', nail: '#9a705c' },
];

/** The slider track: the same scale the hands are coloured from. */
export const SKIN_GRADIENT = `linear-gradient(to right, ${STOPS.map((s) => s.base).join(', ')})`;

/** Where the earlier five fixed tones sit on the scale, so a saved choice carries over. */
export const LEGACY_TONES: Readonly<Record<string, number>> = {
  light: 0,
  mediumLight: 0.25,
  medium: 0.5,
  mediumDark: 0.75,
  dark: 1,
};

/** Colours at position t (0 = lightest, 1 = darkest), blended between the nearest stops. */
export function skinAt(t: number): SkinColors {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  return { base: mix(a.base, b.base, f), shade: mix(a.shade, b.shade, f), nail: mix(a.nail, b.nail, f) };
}

function mix(a: string, b: string, f: number): string {
  const ca = rgb(a);
  const cb = rgb(b);
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * f).toString(16).padStart(2, '0')).join('');
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
