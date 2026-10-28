import { useRef } from 'react';
import type { HandFinger, Thumb } from '../hands/geometry';
import { HAND_SPLIT, HOME_BUMPS, isLeftHand, NUMBER_ROW, PUNCTUATION_KEYS, ROWS, SPACE, type KeyDef, type KeyStroke } from '../hangul/layout';
import { unitOfChar } from '../hangul/text';
import type { SkinColors } from '../hands/skin';
import { Hands } from './Hands';

export interface Flash {
  code: string;
  ok: boolean;
  /** Changes on every press so the same key can flash twice in a row. */
  id: number;
}

interface Props {
  next?: KeyStroke;
  flash: Flash | null;
  /** Units unlocked so far; keys with nothing unlocked are dimmed. */
  unlocked: ReadonlySet<string>;
  /** The unit drills are leaning on, marked with a dot. */
  focus?: string;
  /** Physical keys held down right now, oldest first. */
  held: readonly string[];
  showHands: boolean;
  /** The thumb that presses Space this time. */
  spaceThumb: Thumb;
  /** The finger that should press the next key. */
  nextFinger?: HandFinger;
  skin: SkinColors;
  /** Show the number row and , . / keys (from stage 9, and in free typing). */
  extraKeys?: boolean;
}

// Row offsets in key widths, roughly matching a physical keyboard's stagger. With the
// number row shown, the letter rows move half a key right of it, as on a real keyboard.
const OFFSETS = [0, 0.3, 0.8];
const EXTRA_OFFSET = 0.5;

/** The units a key types: its characters, with digits counted as NUMBER. */
const keyUnits = (def: KeyDef) => [def.base, def.shift].filter((c) => c !== undefined).map(unitOfChar);

export function Keyboard({ next, flash, unlocked, focus, held, showHands, spaceThumb, nextFinger, skin, extraKeys = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const down = new Set(held);
  // Shift is pressed with the hand opposite the key, so it never ties up the finger you need.
  const shiftSide = next?.shift ? (isLeftHand(next.key.finger) ? 'right' : 'left') : null;

  const keyClass = (def: KeyDef, i: number) =>
    [
      'key',
      `finger-${def.finger}`,
      i === HAND_SPLIT ? 'split' : '',
      keyUnits(def).some((u) => unlocked.has(u)) || def === SPACE ? '' : 'locked',
      focus !== undefined && keyUnits(def).includes(focus) ? 'focus' : '',
      next?.key.code === def.code ? 'next' : '',
      flash?.code === def.code ? (flash.ok ? 'flash-ok' : 'flash-bad') : '',
      down.has(def.code) ? 'down' : '',
    ].join(' ');

  const shiftKey = (code: 'ShiftLeft' | 'ShiftRight', side: 'left' | 'right') => (
    <div
      data-code={code}
      className={`key wide finger-${side === 'left' ? 'L5' : 'R5'} ${shiftSide === side ? 'next' : ''} ${down.has(code) ? 'down' : ''}`}
    >
      Shift
    </div>
  );

  return (
    <div className="keyboard-wrap" ref={wrapRef}>
      <div className={`keyboard ${extraKeys ? 'extra' : ''}`} aria-hidden="true">
        {extraKeys && (
          <div className="kb-row number-row">{NUMBER_ROW.map((def, i) => renderKey(def, keyClass(def, i) + ' symbol', flash))}</div>
        )}
        {ROWS.map((row, r) => (
          <div
            className="kb-row"
            key={r}
            style={{ paddingLeft: `calc(${OFFSETS[r] + (extraKeys ? EXTRA_OFFSET : 0)} * var(--key))` }}
          >
            {r === 2 && shiftKey('ShiftLeft', 'left')}
            {row.map((def, i) => renderKey(def, keyClass(def, i), flash))}
            {r === 2 && extraKeys && PUNCTUATION_KEYS.map((def) => renderKey(def, keyClass(def, -1) + ' symbol', flash))}
            {/* ; types nothing in 2-set drills, but it's where the right pinky rests. */}
            {r === 1 && (
              <div data-code="Semicolon" className={`key aux finger-R5 ${down.has('Semicolon') ? 'down' : ''}`}>
                <span className="latin">;</span>
              </div>
            )}
            {r === 2 && shiftKey('ShiftRight', 'right')}
          </div>
        ))}
        <div className="kb-row">
          <div
            data-code="Space"
            className={keyClass(SPACE, -1) + ' space'}
            key={SPACE.code + (flash?.code === SPACE.code ? flash.id : '')}
          >
            Space
          </div>
        </div>
      </div>
      {showHands && <Hands containerRef={wrapRef} held={held} spaceThumb={spaceThumb} nextFinger={nextFinger} skin={skin} />}
    </div>
  );
}

function renderKey(def: KeyDef, className: string, flash: Flash | null) {
  return (
    <div data-code={def.code} className={className} key={def.code + (flash?.code === def.code ? flash.id : '')}>
      <span className="latin">{def.latin}</span>
      {def.shift && <span className="shifted">{def.shift}</span>}
      <span className="jamo">{def.base}</span>
      {HOME_BUMPS.has(def.code) && <span className="bump" />}
    </div>
  );
}
