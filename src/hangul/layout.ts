// Standard 2-set (두벌식) layout, keyed by KeyboardEvent.code so it works
// whatever input language the operating system is set to.

export type Finger = 'L5' | 'L4' | 'L3' | 'L2' | 'R2' | 'R3' | 'R4' | 'R5' | 'thumb';

export interface KeyDef {
  code: string;
  latin: string;
  base: string;
  shift?: string;
  finger: Finger;
}

const k = (code: string, base: string, finger: Finger, shift?: string): KeyDef => ({
  code,
  latin: code.replace('Key', ''),
  base,
  shift,
  finger,
});

export const ROWS: KeyDef[][] = [
  [
    k('KeyQ', 'ㅂ', 'L5', 'ㅃ'),
    k('KeyW', 'ㅈ', 'L4', 'ㅉ'),
    k('KeyE', 'ㄷ', 'L3', 'ㄸ'),
    k('KeyR', 'ㄱ', 'L2', 'ㄲ'),
    k('KeyT', 'ㅅ', 'L2', 'ㅆ'),
    k('KeyY', 'ㅛ', 'R2'),
    k('KeyU', 'ㅕ', 'R2'),
    k('KeyI', 'ㅑ', 'R3'),
    k('KeyO', 'ㅐ', 'R4', 'ㅒ'),
    k('KeyP', 'ㅔ', 'R5', 'ㅖ'),
  ],
  [
    k('KeyA', 'ㅁ', 'L5'),
    k('KeyS', 'ㄴ', 'L4'),
    k('KeyD', 'ㅇ', 'L3'),
    k('KeyF', 'ㄹ', 'L2'),
    k('KeyG', 'ㅎ', 'L2'),
    k('KeyH', 'ㅗ', 'R2'),
    k('KeyJ', 'ㅓ', 'R2'),
    k('KeyK', 'ㅏ', 'R3'),
    k('KeyL', 'ㅣ', 'R4'),
  ],
  [
    k('KeyZ', 'ㅋ', 'L5'),
    k('KeyX', 'ㅌ', 'L4'),
    k('KeyC', 'ㅊ', 'L3'),
    k('KeyV', 'ㅍ', 'L2'),
    k('KeyB', 'ㅠ', 'L2'),
    k('KeyN', 'ㅜ', 'R2'),
    k('KeyM', 'ㅡ', 'R2'),
  ],
];

export const SPACE: KeyDef = { code: 'Space', latin: 'Space', base: ' ', finger: 'thumb' };

/** Index of the first right-hand key in each row (ㅠ on B is typed by the left hand). */
export const HAND_SPLIT = 5;

export const HOME_BUMPS = new Set(['KeyF', 'KeyJ']);

const byCode = new Map<string, KeyDef>([...ROWS.flat(), SPACE].map((d) => [d.code, d]));

export function keyForCode(code: string): KeyDef | undefined {
  return byCode.get(code);
}

/** What a physical key types. Keys with no Shift character type their base jamo with Shift held. */
export function jamoForKey(code: string, shift: boolean): string | undefined {
  const def = byCode.get(code);
  if (!def) return undefined;
  return shift ? (def.shift ?? def.base) : def.base;
}

export interface KeyStroke {
  key: KeyDef;
  shift: boolean;
}

const byJamo = new Map<string, KeyStroke>();
for (const def of [...ROWS.flat(), SPACE]) {
  byJamo.set(def.base, { key: def, shift: false });
  if (def.shift) byJamo.set(def.shift, { key: def, shift: true });
}

/** The key (and whether Shift is needed) that types a jamo, or undefined if the layout can't. */
export function strokeForJamo(jamo: string): KeyStroke | undefined {
  return byJamo.get(jamo);
}

/** Every jamo the layout can type directly: 26 base + 7 shifted = 33. */
export const ALL_JAMO = [...byJamo.keys()].filter((j) => j !== ' ');

export function isLeftHand(finger: Finger): boolean {
  return finger.startsWith('L');
}

const FINGER_NAMES: Record<Finger, string> = {
  L5: 'left pinky',
  L4: 'left ring',
  L3: 'left middle',
  L2: 'left index',
  R2: 'right index',
  R3: 'right middle',
  R4: 'right ring',
  R5: 'right pinky',
  thumb: 'thumb',
};

export function fingerName(finger: Finger): string {
  return FINGER_NAMES[finger];
}
