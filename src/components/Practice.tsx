import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { glossText, sentenceAt, type Gloss } from '../engine/meanings';
import { backspace, createRound, endRound, isFinished, nextExpected, press, stats, type Round } from '../engine/round';
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
  /** For timed rounds (the sprint): the round ends this long after the first key. */
  timeLimitMs?: number;
}

const now = () => performance.timeOrigin + performance.now();

/** The code of the last non-Space key in the round, which decides the thumb for Space. */
function lastLetterCode(r: Round): string | undefined {
  for (let i = r.log.length - 1; i >= 0; i--) if (r.log[i].code !== 'Space') return r.log[i].code;
  return undefined;
}

/** Long texts (the sprint) show this many characters around where you are. */
const WINDOW_CHARS = 72;

export function Practice({ text, unlocked, focus, onFinish, timeLimitMs }: Props) {
  const [round, setRound] = useState(() => createRound(text));
  const [flash, setFlash] = useState<Flash | null>(null);
  const [focused, setFocused] = useState(true);
  const [clock, setClock] = useState(now);
  const areaRef = useRef<HTMLDivElement>(null);
  const ranges = useMemo(() => charRanges(text), [text]);
  const glosses = useMemo(() => glossText(text), [text]);
  const { settings } = useSettings();
  const keys = useKeyFeedback();

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  // Tick the live speed readout while the round is running.
  useEffect(() => {
    if (round.startedAt === null || isFinished(round)) return;
    const id = setInterval(() => {
      const t = now();
      setClock(t);
      // A timed round ends exactly at its limit, however late the tick lands.
      if (timeLimitMs !== undefined && round.startedAt !== null && t - round.startedAt >= timeLimitMs) {
        setRound((r) => endRound(r, r.startedAt! + timeLimitMs));
      }
    }, 100);
    return () => clearInterval(id);
  }, [round.startedAt, round.finishedAt, timeLimitMs]);

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
  const [from, to] = visibleRange(text, ranges, round.typed.length);
  const currentChar = ranges.findIndex(([, end]) => round.typed.length < end);
  const sentence = settings.showMeanings && currentChar !== -1 ? sentenceAt(glosses, currentChar) : undefined;
  const secondsLeft =
    timeLimitMs === undefined ? undefined : Math.max(0, Math.ceil((timeLimitMs - live.seconds * 1000) / 1000));
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
        {secondsLeft === undefined ? (
          <span>
            <b>{Math.floor(live.seconds)}</b>s
          </span>
        ) : (
          <span className={secondsLeft <= 10 && round.startedAt !== null ? 'ending' : ''}>
            <b>{secondsLeft}</b>s left{round.startedAt === null ? ' · starts on your first key' : ''}
          </span>
        )}
      </div>

      <p className="target" lang="ko">
        {renderTarget(text, round, ranges, from, to, settings.showMeanings ? glosses : [])}
      </p>
      {sentence && (
        <p className="translation" lang="en">
          {sentence.meaning}
        </p>
      )}

      <p className={`input ${lastWrong ? 'wrong' : ''}`} lang="ko">
        {assembleTyped(round.typed.slice(ranges[from]?.[0] ?? 0))}
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
        extraKeys={unlocked.has('.')}
      />

      {!focused && (
        <button className="refocus" onClick={() => areaRef.current?.focus()}>
          Click here to keep typing
        </button>
      )}
    </div>
  );
}

/**
 * Which characters to show: all of a normal round, or for long texts a window that starts a
 * little before the current character, on a word boundary, so the line moves along with you.
 */
function visibleRange(text: string, ranges: Array<[number, number]>, typedCount: number): [number, number] {
  const length = ranges.length;
  if (length <= WINDOW_CHARS) return [0, length];
  const current = Math.max(0, ranges.findIndex(([, end]) => typedCount < end));
  const chars = [...text];
  // Move the window on in steps of about half its width, so it doesn't shift every keystroke.
  let from = Math.max(0, current - (current % (WINDOW_CHARS / 2)) - 8);
  while (from > 0 && chars[from - 1] !== ' ') from--;
  return [from, Math.min(length, from + WINDOW_CHARS)];
}

/**
 * The visible characters, coloured by state. Words with a meaning are grouped with it underneath.
 * A break opportunity follows each space, which is non-breaking so its underline shows.
 */
function renderTarget(
  text: string,
  round: Round,
  ranges: Array<[number, number]>,
  from: number,
  to: number,
  glosses: readonly Gloss[],
): ReactNode[] {
  const chars = [...text];
  const wordAt = new Map(glosses.filter((g) => g.kind === 'word').map((g) => [g.start, g]));
  const char = (i: number) =>
    chars[i] === ' ' ? (
      <Fragment key={i}>
        <span className={charState(round, ranges[i])}>{'\xa0'}</span>
        <wbr />
      </Fragment>
    ) : (
      <span key={i} className={charState(round, ranges[i])}>
        {chars[i]}
      </span>
    );

  const out: ReactNode[] = [];
  for (let i = from; i < to; ) {
    const word = wordAt.get(i);
    if (!word) {
      out.push(char(i++));
      continue;
    }
    const end = Math.min(word.end, to);
    const inner: ReactNode[] = [];
    for (let j = i; j < end; j++) inner.push(char(j));
    out.push(
      <span key={`w${i}`} className="w">
        <span>{inner}</span>
        <span className="gloss" lang="en">
          {word.meaning}
        </span>
      </span>,
    );
    i = end;
  }
  return out;
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
