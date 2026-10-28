import { keyForCode } from '../hangul/layout';

// Geometry for the on-screen hands: which finger presses which key, where each
// fingertip rests, and the shape of each hand around its fingertips. Everything is
// in pixels relative to the keyboard, scaled by the measured key width `k`.

export interface Point {
  x: number;
  y: number;
}

export type Hand = 'L' | 'R';
/** 5 = pinky … 2 = index, 1 = thumb. */
export type HandFinger = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type Thumb = 'L1' | 'R1';

export const FINGERS: readonly HandFinger[] = ['L5', 'L4', 'L3', 'L2', 'L1', 'R1', 'R2', 'R3', 'R4', 'R5'];
const LONG_FINGERS = { L: ['L5', 'L4', 'L3', 'L2'], R: ['R5', 'R4', 'R3', 'R2'] } as const;

/** Home row: ㅁ ㄴ ㅇ ㄹ under the left hand, ㅓ ㅏ ㅣ ; under the right. */
export const HOME_KEYS = {
  L5: 'KeyA',
  L4: 'KeyS',
  L3: 'KeyD',
  L2: 'KeyF',
  R2: 'KeyJ',
  R3: 'KeyK',
  R4: 'KeyL',
  R5: 'Semicolon',
} as const;

/** Physical keys the hands react to, beyond the layout's jamo keys. */
export const EXTRA_KEYS = ['ShiftLeft', 'ShiftRight', 'Semicolon'] as const;

/** The finger that presses a key. Space goes to whichever thumb the caller picks. */
export function fingerForCode(code: string, spaceThumb: Thumb = 'R1'): HandFinger | undefined {
  if (code === 'Space') return spaceThumb;
  if (code === 'ShiftLeft') return 'L5';
  if (code === 'ShiftRight' || code === 'Semicolon') return 'R5';
  const finger = keyForCode(code)?.finger;
  return finger === undefined || finger === 'thumb' ? undefined : finger;
}

/**
 * Space is pressed by the thumb of the hand that did NOT type the previous key,
 * so the other hand is already free for the next one. Right thumb by default.
 */
export function thumbForSpace(previousCode: string | undefined): Thumb {
  const finger = previousCode === undefined ? undefined : fingerForCode(previousCode);
  return finger?.startsWith('R') ? 'L1' : 'R1';
}

export interface KeyLayout {
  /** Centre of every rendered key, by KeyboardEvent.code. */
  centers: ReadonlyMap<string, Point>;
  /** Width of one ordinary key. */
  k: number;
  space: { x: number; y: number; w: number };
}

/** Each hand's inward direction along x: towards the middle of the keyboard. */
const inward = (hand: Hand) => (hand === 'L' ? 1 : -1);

/** Where each fingertip rests: long fingers on their home keys, thumbs on the space bar. */
export function homeTips(l: KeyLayout): Record<HandFinger, Point> {
  const tips = {} as Record<HandFinger, Point>;
  for (const [f, code] of Object.entries(HOME_KEYS) as Array<[keyof typeof HOME_KEYS, string]>) {
    tips[f] = center(l, code);
  }
  for (const hand of ['L', 'R'] as const) {
    const index = tips[`${hand}2`];
    const minX = l.space.x - l.space.w / 2 + 0.35 * l.k;
    const maxX = l.space.x + l.space.w / 2 - 0.35 * l.k;
    tips[`${hand}1`] = { x: clamp(index.x + inward(hand) * 0.55 * l.k, minX, maxX), y: l.space.y };
  }
  return tips;
}

export interface Targets {
  tips: Record<HandFinger, Point>;
  pressing: ReadonlySet<HandFinger>;
}

/**
 * Where each fingertip should be for the keys held down, oldest first. A finger
 * with two keys held goes to the newest. A thumb presses Space where it rests.
 */
export function targetTips(l: KeyLayout, held: readonly string[], spaceThumb: Thumb): Targets {
  const tips = homeTips(l);
  const pressing = new Set<HandFinger>();
  for (const code of held) {
    const f = fingerForCode(code, spaceThumb);
    if (!f || !l.centers.has(code)) continue;
    pressing.add(f);
    if (code !== 'Space') tips[f] = center(l, code);
  }
  return { tips, pressing };
}

// Per finger, in key widths: tip-to-knuckle length and finger thickness.
const FINGER_SHAPE: Record<'5' | '4' | '3' | '2', { len: number; width: number }> = {
  5: { len: 1.2, width: 0.4 },
  4: { len: 1.5, width: 0.46 },
  3: { len: 1.65, width: 0.48 },
  2: { len: 1.5, width: 0.48 },
};
/** How far the palm follows a reaching finger, as a share of the fingers' mean reach. */
const PALM_FOLLOW = 0.6;
/** Knuckles sit a little closer together than the fingertips. */
const KNUCKLE_CONVERGE = 0.18;

export interface FingerPose {
  finger: HandFinger;
  knuckle: Point;
  tip: Point;
  width: number;
}

export interface HandPose {
  hand: Hand;
  fingers: FingerPose[];
  thumb: FingerPose;
  /** Outline of the palm, knuckles first, then down to the wrist. */
  palm: Point[];
  /** The hand fades out between these two heights, so it reads as hovering. */
  fadeFrom: number;
  fadeTo: number;
}

/**
 * The shape of one hand for the given fingertip positions. Knuckles and palm are
 * anchored to the home row and shift a little towards wherever the fingers reach.
 */
export function handPose(l: KeyLayout, hand: Hand, tips: Record<HandFinger, Point>): HandPose {
  const { k } = l;
  const home = homeTips(l);
  const longs = LONG_FINGERS[hand];
  const dir = inward(hand);

  // The palm follows the fingers' average reach, so a stretch to the top row lifts the hand.
  const shift = { x: 0, y: 0 };
  for (const f of longs) {
    shift.x += (tips[f].x - home[f].x) / longs.length;
    shift.y += (tips[f].y - home[f].y) / longs.length;
  }
  shift.x *= PALM_FOLLOW;
  shift.y *= PALM_FOLLOW;

  const centerX = longs.reduce((s, f) => s + home[f].x, 0) / longs.length;
  const fingers: FingerPose[] = longs.map((f) => {
    const shape = FINGER_SHAPE[f[1] as '5' | '4' | '3' | '2'];
    const h = home[f];
    return {
      finger: f,
      knuckle: {
        x: h.x + (centerX - h.x) * KNUCKLE_CONVERGE + shift.x,
        y: h.y + shape.len * k + shift.y,
      },
      tip: tips[f],
      width: shape.width * k,
    };
  });

  const pinky = fingers[0].knuckle;
  const index = fingers[3].knuckle;
  const thumbBase = { x: index.x + dir * 0.3 * k, y: index.y + 0.75 * k };
  const palm: Point[] = [
    { x: pinky.x - dir * 0.22 * k, y: pinky.y + 0.1 * k },
    ...fingers.map((f) => f.knuckle),
    { x: index.x + dir * 0.18 * k, y: index.y + 0.1 * k },
    thumbBase,
    { x: index.x + dir * 0.02 * k, y: index.y + 1.45 * k },
    { x: pinky.x + dir * 0.05 * k, y: pinky.y + 1.35 * k },
  ];

  const knuckleY = Math.min(...fingers.map((f) => f.knuckle.y));
  return {
    hand,
    fingers,
    thumb: { finger: `${hand}1`, knuckle: thumbBase, tip: tips[`${hand}1`], width: 0.5 * k },
    palm,
    fadeFrom: knuckleY + 0.3 * k,
    fadeTo: knuckleY + 1.6 * k,
  };
}

function center(l: KeyLayout, code: string): Point {
  const c = l.centers.get(code);
  if (!c) throw new Error(`Key ${code} is not on the keyboard`);
  return c;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
