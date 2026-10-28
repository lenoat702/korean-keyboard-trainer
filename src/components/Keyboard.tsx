import { useRef } from 'react';
import type { HandFinger, Thumb } from '../hands/geometry';
import { HAND_SPLIT, HOME_BUMPS, isLeftHand, ROWS, SPACE, type KeyDef, type KeyStroke } from '../hangul/layout';
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
}

// Row offsets in key widths, roughly matching a physical keyboard's stagger.
const OFFSETS = [0, 0.3, 0.8];

export function Keyboard({ next, flash, unlocked, focus, held, showHands, spaceThumb, nextFinger, skin }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const down = new Set(held);
  // Shift is pressed with the hand opposite the key, so it never ties up the finger you need.
  const shiftSide = next?.shift ? (isLeftHand(next.key.finger) ? 'right' : 'left') : null;

  const keyClass = (def: KeyDef, i: number) =>
    [
      'key',
      `finger-${def.finger}`,
      i === HAND_SPLIT ? 'split' : '',
      unlocked.has(def.base) || (def.shift !== undefined && unlocked.has(def.shift)) || def === SPACE ? '' : 'locked',
      focus !== undefined && (def.base === focus || def.shift === focus) ? 'focus' : '',
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
      <div className="keyboard" aria-hidden="true">
        {ROWS.map((row, r) => (
          <div className="kb-row" key={r} style={{ paddingLeft: `calc(${OFFSETS[r]} * var(--key))` }}>
            {r === 2 && shiftKey('ShiftLeft', 'left')}
            {row.map((def, i) => (
              <div data-code={def.code} className={keyClass(def, i)} key={def.code + (flash?.code === def.code ? flash.id : '')}>
                <span className="latin">{def.latin}</span>
                {def.shift && <span className="shifted">{def.shift}</span>}
                <span className="jamo">{def.base}</span>
                {HOME_BUMPS.has(def.code) && <span className="bump" />}
              </div>
            ))}
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
