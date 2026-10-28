import { describe, expect, it } from 'vitest';
import { ROWS, SPACE } from '../hangul/layout';
import {
  EXTRA_KEYS,
  FINGERS,
  fingerForCode,
  handPose,
  HOME_KEYS,
  homeTips,
  targetTips,
  thumbForSpace,
  type KeyLayout,
  type Point,
} from './geometry';

// A keyboard laid out like the CSS one: 52px keys, 6px gaps, staggered rows, a gap at the hand split.
const K = 52;
const GAP = 6;
function fakeLayout(): KeyLayout {
  const centers = new Map<string, Point>();
  const offsets = [0, 0.3, 0.8];
  const step = K + GAP;
  ROWS.forEach((row, r) => {
    const y = r * step + K / 2;
    let x = offsets[r] * K + (r === 2 ? 1.4 * K + GAP : 0);
    row.forEach((def, i) => {
      if (i === 5) x += 14;
      centers.set(def.code, { x: x + K / 2, y });
      x += step;
    });
    if (r === 1) centers.set('Semicolon', { x: x + K / 2, y });
    if (r === 2) {
      centers.set('ShiftLeft', { x: offsets[r] * K + 0.7 * K, y });
      centers.set('ShiftRight', { x: x + 0.7 * K, y });
    }
  });
  const space = { x: 2.4 * K + 3 * K, y: 3 * step + K / 2, w: 6 * K };
  centers.set('Space', { x: space.x, y: space.y });
  return { centers, k: K, space };
}

const layout = fakeLayout();
const at = (code: string) => layout.centers.get(code)!;

describe('fingerForCode', () => {
  it('gives every key on the keyboard a finger', () => {
    for (const def of [...ROWS.flat(), SPACE]) expect(fingerForCode(def.code), def.code).toBeDefined();
    for (const code of EXTRA_KEYS) expect(fingerForCode(code), code).toBeDefined();
  });

  it('uses the pinkies for Shift and the right pinky for ;', () => {
    expect(fingerForCode('ShiftLeft')).toBe('L5');
    expect(fingerForCode('ShiftRight')).toBe('R5');
    expect(fingerForCode('Semicolon')).toBe('R5');
  });

  it('types ㅠ (B) with the left index, across the hand split', () => {
    expect(fingerForCode('KeyB')).toBe('L2');
    expect(fingerForCode('KeyN')).toBe('R2');
  });

  it('ignores keys the trainer does not draw', () => {
    expect(fingerForCode('Digit1')).toBeUndefined();
  });
});

describe('thumbForSpace', () => {
  it('uses the thumb opposite the previous key', () => {
    expect(thumbForSpace('KeyK')).toBe('L1'); // ㅏ, right hand → left thumb
    expect(thumbForSpace('KeyF')).toBe('R1'); // ㄹ, left hand → right thumb
    expect(thumbForSpace(undefined)).toBe('R1');
  });
});

describe('homeTips', () => {
  it('rests the long fingers on the home row', () => {
    const tips = homeTips(layout);
    for (const [f, code] of Object.entries(HOME_KEYS)) expect(tips[f as keyof typeof HOME_KEYS]).toEqual(at(code));
  });

  it('rests both thumbs on the space bar, left thumb left of the right one', () => {
    const { L1, R1 } = homeTips(layout);
    for (const t of [L1, R1]) {
      expect(t.y).toBe(layout.space.y);
      expect(Math.abs(t.x - layout.space.x)).toBeLessThan(layout.space.w / 2);
    }
    expect(L1.x).toBeLessThan(R1.x);
  });
});

describe('targetTips', () => {
  it('moves only the finger for the held key', () => {
    const home = homeTips(layout);
    const { tips, pressing } = targetTips(layout, ['KeyR'], 'R1');
    expect(tips.L2).toEqual(at('KeyR'));
    expect([...pressing]).toEqual(['L2']);
    for (const f of FINGERS.filter((f) => f !== 'L2')) expect(tips[f]).toEqual(home[f]);
  });

  it('mirrors Shift + key with both pinkies', () => {
    const { tips, pressing } = targetTips(layout, ['ShiftRight', 'KeyQ'], 'R1');
    expect(tips.L5).toEqual(at('KeyQ'));
    expect(tips.R5).toEqual(at('ShiftRight'));
    expect(pressing).toEqual(new Set(['R5', 'L5']));
  });

  it('sends a finger to its newest key when two are held', () => {
    const { tips } = targetTips(layout, ['KeyR', 'KeyT'], 'R1');
    expect(tips.L2).toEqual(at('KeyT'));
  });

  it('presses Space in place with the chosen thumb', () => {
    const { tips, pressing } = targetTips(layout, ['Space'], 'L1');
    expect(tips.L1).toEqual(homeTips(layout).L1);
    expect([...pressing]).toEqual(['L1']);
  });
});

describe('handPose', () => {
  it('puts knuckles below the fingertips, middle finger longest', () => {
    const pose = handPose(layout, 'L', homeTips(layout));
    for (const f of pose.fingers) expect(f.knuckle.y).toBeGreaterThan(f.tip.y);
    const len = (f: (typeof pose.fingers)[number]) => f.knuckle.y - f.tip.y;
    const [pinky, ring, middle] = pose.fingers;
    expect(len(middle)).toBeGreaterThan(len(ring));
    expect(len(ring)).toBeGreaterThan(len(pinky));
  });

  it('lifts the hand towards a top-row reach and leaves the other hand still', () => {
    const rest = homeTips(layout);
    const reach = targetTips(layout, ['KeyR'], 'R1').tips;
    const leftRest = handPose(layout, 'L', rest);
    const leftReach = handPose(layout, 'L', reach);
    expect(leftReach.fingers[0].knuckle.y).toBeLessThan(leftRest.fingers[0].knuckle.y);
    expect(handPose(layout, 'R', reach)).toEqual(handPose(layout, 'R', rest));
  });

  it('mirrors the right hand: its thumb sits on the inner (left) side', () => {
    const tips = homeTips(layout);
    const right = handPose(layout, 'R', tips);
    const left = handPose(layout, 'L', tips);
    expect(right.thumb.knuckle.x).toBeLessThan(right.fingers[3].knuckle.x);
    expect(left.thumb.knuckle.x).toBeGreaterThan(left.fingers[3].knuckle.x);
  });
});
