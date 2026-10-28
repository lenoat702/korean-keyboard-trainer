import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { backspace, createRound, isFinished, nextExpected, press, stats, type Round } from '../engine/round';
import { fingerForCode, thumbForSpace, type Thumb } from '../hands/geometry';
import { skinAt } from '../hands/skin';
import { fingerName, jamoForKey, strokeForJamo, type KeyStroke } from '../hangul/layout';
import { assembleTyped, charRanges } from '../hangul/text';
import { useSettings } from '../settings';
import { Keyboard, type Flash } from './Keyboard';
import { useKeyFeedback } from './useKeyFeedback';

interface Props {
  text: string;
  unlocked: ReadonlySet<string>;
  focus?: string;
  onFinish: (round: Round) => void;
}

const now = () => performance.timeOrigin + performance.now();

/** The code of the last non-Space key in the round, which decides the thumb for Space. */
function lastLetterCode(r: Round): string | undefined {
  for (let i = r.log.length - 1; i >= 0; i--) if (r.log[i].code !== 'Space') return r.log[i].code;
  return undefined;
}

export function Practice({ text, unlocked, focus, onFinish }: Props) {
  const [round, setRound] = useState(() => createRound(text));
  const [flash, setFlash] = useState<Flash | null>(null);
  const [focused, setFocused] = useState(true);
  const [clock, setClock] = useState(now);
  const areaRef = useRef<HTMLDivElement>(null);
  const ranges = useMemo(() => charRanges(text), [text]);
  const { settings } = useSettings();
  const keys = useKeyFeedback();

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  // Tick the live speed readout while the round is running.
  useEffect(() => {
    if (round.startedAt === null || isFinished(round)) return;
    const id = setInterval(() => setClock(now()), 250);
    return () => clearInterval(id);
  }, [round.startedAt, round.finishedAt]);

  // Report the finished round exactly once, even if onFinish changes identity afterwards.
  const reported = useRef(false);
  useEffect(() => {
    if (isFinished(round) && !reported.current) {
      reported.current = true;
      onFinish(round);
    }
  }, [round, onFinish]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    keys.down(e, thumbForSpace(lastLetterCode(round)));
    if (e.code === 'Backspace') {
      e.preventDefault();
      setRound(backspace);
      return;
    }
    const jamo = jamoForKey(e.code, e.shiftKey);
    if (jamo === undefined) return;
    e.preventDefault(); // stop Space from scrolling the page
    if (e.repeat) return;

    const t = now();
    setFlash({ code: e.code, ok: jamo === nextExpected(round), id: t });
    setRound(press(round, jamo, e.code, t));
    setClock(t);
  }

  const expected = nextExpected(round);
  const stroke = expected !== undefined ? strokeForJamo(expected) : undefined;
  const nextThumb = thumbForSpace(lastLetterCode(round));
  const nextFinger = stroke ? fingerForCode(stroke.key.code, nextThumb) : undefined;
  const live = stats(round, clock);
  const lastWrong = round.typed.length > 0 && round.typed.at(-1) !== round.expected[round.typed.length - 1];

  return (
    <div
      ref={areaRef}
      className="practice"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={keys.up}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        keys.reset();
      }}
    >
      <div className="live">
        <span>
          <b>{live.netSpeed}</b> 타/분
        </span>
        <span>
          <b>{live.accuracy}</b>% accuracy
        </span>
        <span>
          <b>{Math.floor(live.seconds)}</b>s
        </span>
      </div>

      <p className="target" lang="ko">
        {[...text].map((ch, i) => (
          <span key={i} className={charState(round, ranges[i])}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </p>

      <p className={`input ${lastWrong ? 'wrong' : ''}`} lang="ko">
        {assembleTyped(round.typed)}
        <span className="caret" />
      </p>

      <div className="hint-row">
        <p className="hint">
          {lastWrong
            ? 'Not quite. Press Backspace to fix it, or keep going.'
            : stroke
              ? describeStroke(expected!, stroke, nextThumb)
              : '\u00a0'}
        </p>
      </div>

      <Keyboard
        next={stroke}
        flash={flash}
        unlocked={unlocked}
        focus={focus}
        held={keys.held}
        showHands={settings.showHands}
        spaceThumb={keys.spaceThumb}
        nextFinger={nextFinger}
        skin={skinAt(settings.skin)}
      />

      {!focused && (
        <button className="refocus" onClick={() => areaRef.current?.focus()}>
          Click here to keep typing
        </button>
      )}
    </div>
  );
}

function charState(r: Round, [start, end]: [number, number]): string {
  const typedCount = r.typed.length;
  if (typedCount < start) return 'pending';
  if (typedCount === start) return 'current';
  const wrong = r.typed.slice(start, Math.min(end, typedCount)).some((j, k) => j !== r.expected[start + k]);
  if (typedCount >= end) return wrong ? 'done wrong' : 'done';
  return wrong ? 'current wrong' : 'current';
}

function describeStroke(jamo: string, { key, shift }: KeyStroke, thumb: Thumb): string {
  if (jamo === ' ') return `Space · ${thumb === 'L1' ? 'left' : 'right'} thumb`;
  const keys = shift ? `Shift + ${key.latin}` : key.latin;
  return `${jamo} = ${keys} · ${fingerName(key.finger)}`;
}
