import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react';
import { ALL_JAMO, fingerName, jamoForKey, keyForCode } from '../hangul/layout';
import { assembleTyped } from '../hangul/text';
import { skinAt } from '../hands/skin';
import { useSettings } from '../settings';
import { Keyboard, type Flash } from './Keyboard';
import { useKeyFeedback } from './useKeyFeedback';

interface Props {
  /** Jamo typed so far, with ' ' and '\n'. Kept by the parent so switching screens doesn't lose it. */
  typed: readonly string[];
  setTyped: Dispatch<SetStateAction<string[]>>;
}

const EVERY_KEY = new Set(ALL_JAMO);

/** Type anything on the 2-set layout and see it built into Hangul. Nothing is scored or saved. */
export function FreeType({ typed, setTyped }: Props) {
  const { settings } = useSettings();
  const keys = useKeyFeedback();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [last, setLast] = useState<{ jamo: string; code: string; shift: boolean } | null>(null);
  const [focused, setFocused] = useState(true);
  const [copied, setCopied] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const text = assembleTyped(typed);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  // Keep the newest line in view as the text grows.
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [typed.length]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    keys.down(e);
    // Holding Backspace keeps deleting, one jamo at a time, like a Korean input method.
    if (e.code === 'Backspace') {
      e.preventDefault();
      setTyped((t) => t.slice(0, -1));
      return;
    }
    if (e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) setTyped((t) => [...t, '\n']);
      return;
    }
    const jamo = jamoForKey(e.code, e.shiftKey);
    if (jamo === undefined) return;
    e.preventDefault(); // stop Space from scrolling the page
    if (e.repeat) return;
    setTyped((t) => [...t, jamo]);
    setFlash({ code: e.code, ok: true, id: performance.now() });
    setLast({ jamo, code: e.code, shift: e.shiftKey });
    setCopied(false);
  }

  function copy() {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  const syllables = [...text].filter((ch) => ch >= '가' && ch <= '힣').length;

  return (
    <div
      ref={areaRef}
      className="practice free"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={keys.up}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        keys.reset();
      }}
    >
      <div className="free-bar">
        <div className="live">
          <span>
            <b>{syllables}</b> syllables
          </span>
          <span>
            <b>{typed.length}</b> keystrokes
          </span>
        </div>
        {/* mousedown is cancelled so these buttons don't pull focus out of the typing area. */}
        <div className="free-actions" onMouseDown={(e) => e.preventDefault()}>
          <button onClick={copy} disabled={text === ''}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => setTyped([])} disabled={typed.length === 0}>
            Clear
          </button>
        </div>
      </div>

      <div ref={outputRef} className="free-output" lang="ko" aria-live="polite">
        {text}
        <span className="caret" />
        {text === '' && <span className="placeholder"> Type anything. Enter starts a new line.</span>}
      </div>

      <div className="hint-row">
        <p className="hint">{last ? describeKey(last) : 'Free type: nothing here is scored or saved.'}</p>
      </div>

      <Keyboard
        flash={flash}
        unlocked={EVERY_KEY}
        held={keys.held}
        showHands={settings.showHands}
        spaceThumb={keys.spaceThumb}
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

/** What the last key typed, e.g. "ㄲ = Shift + R · left index". */
function describeKey({ jamo, code, shift }: { jamo: string; code: string; shift: boolean }): string {
  if (jamo === ' ') return 'Space';
  const key = keyForCode(code);
  if (!key) return jamo;
  return `${jamo} = ${shift ? `Shift + ${key.latin}` : key.latin} · ${fingerName(key.finger)}`;
}
