import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ALL_JAMO, jamoForKey } from '../hangul/layout';
import { assembleTyped, toKeystrokes } from '../hangul/text';
import { skinAt } from '../hands/skin';
import type { GameResult, Reward } from '../storage/progress';
import { useSettings } from '../settings';
import { Keyboard, type Flash } from './Keyboard';
import { RewardPanel } from './RewardPanel';
import { useKeyFeedback } from './useKeyFeedback';

// Words fall from the top; type one and press Space (or Enter) to clear it before it lands.
// Each landed word costs a life. Fall speed adapts so you clear roughly 70–80% of words.

const LIVES = 3;
const MAX_ON_SCREEN = 6;
const WORDS_PER_LEVEL = 10;
/** Recent outcomes used to tune the speed. */
const TUNE_WINDOW = 10;
const TARGET_LOW = 0.7;
const TARGET_HIGH = 0.8;
const EVERY_KEY = new Set(ALL_JAMO);

interface Drop {
  id: number;
  text: string;
  jamo: string[];
  /** Left edge, as a share of the play area's width. */
  x: number;
  /** Game clock (ms) when it appeared, and how long it takes to land. */
  born: number;
  duration: number;
}

interface Pop {
  id: number;
  text: string;
  x: number;
  y: number;
  at: number;
}

interface Game {
  clock: number;
  drops: Drop[];
  pops: Pop[];
  nextSpawn: number;
  spawnEvery: number;
  /** Multiplier on fall time: higher is slower. Tuned towards the target clear rate. */
  pace: number;
  outcomes: boolean[];
  cleared: string[];
  correct: number;
  missed: number;
  lives: number;
  nextId: number;
  startedAt: number | null;
  over: boolean;
}

interface Props {
  words: readonly string[];
  /** Recent typing speed (타/분), the starting point for how fast words fall. */
  typingSpeed: number;
  onFinish: (result: GameResult & { level: number; missed: number; cleared: number }) => void;
  onQuit: () => void;
}

export function FallingWords({ words, typingSpeed, onFinish, onQuit }: Props) {
  const { settings } = useSettings();
  const keys = useKeyFeedback();
  const game = useRef<Game>({
    clock: 0,
    drops: [],
    pops: [],
    nextSpawn: 800,
    spawnEvery: 2600,
    pace: 1.6,
    outcomes: [],
    cleared: [],
    correct: 0,
    missed: 0,
    lives: LIVES,
    nextId: 1,
    startedAt: null,
    over: false,
  });
  const [, setFrame] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [focused, setFocused] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const level = 1 + Math.floor(game.current.cleared.length / WORDS_PER_LEVEL);

  // The game loop: runs only while the game has focus, so stepping away pauses it.
  useEffect(() => {
    if (!focused || game.current.over) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const g = game.current;
      g.startedAt ??= Date.now();
      g.clock += Math.min(100, t - last); // a long gap (tab hidden) doesn't jump the game
      last = t;

      if (g.clock >= g.nextSpawn && g.drops.length < MAX_ON_SCREEN) {
        g.drops.push(spawn(g, words, typingSpeed));
        g.nextSpawn = g.clock + g.spawnEvery;
      }
      for (const d of [...g.drops]) {
        if (g.clock - d.born < d.duration) continue;
        g.drops = g.drops.filter((x) => x !== d);
        g.missed++;
        g.lives--;
        record(g, false);
      }
      g.pops = g.pops.filter((p) => g.clock - p.at < 450);
      if (g.lives <= 0) g.over = true;

      setFrame((n) => n + 1);
      if (!g.over) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [focused, words, typingSpeed]);

  const g = game.current;

  // Report once when the game ends.
  useEffect(() => {
    if (!g.over || finished.current) return;
    finished.current = true;
    const seconds = g.clock / 1000;
    const resolved = g.cleared.length + g.missed;
    onFinish({
      mode: 'falling',
      text: g.cleared.join(' '),
      startedAt: g.startedAt ?? Date.now(),
      seconds,
      netSpeed: seconds < 1 ? 0 : Math.round((g.correct / seconds) * 60),
      accuracy: resolved === 0 ? 100 : Math.round((1000 * g.cleared.length) / resolved) / 10,
      correct: g.correct,
      level,
      missed: g.missed,
      cleared: g.cleared.length,
    });
  });

  function submit() {
    if (typed.length === 0) return;
    const hits = g.drops.filter((d) => sameJamo(d.jamo, typed));
    setTyped([]);
    if (hits.length === 0) {
      setWrong((n) => n + 1);
      return;
    }
    // Several on screen with the same word: clear the one closest to landing.
    const hit = hits.reduce((a, b) => (progress(g, b) > progress(g, a) ? b : a));
    g.drops = g.drops.filter((d) => d !== hit);
    g.pops.push({ id: hit.id, text: hit.text, x: hit.x, y: progress(g, hit), at: g.clock });
    const levelBefore = 1 + Math.floor(g.cleared.length / WORDS_PER_LEVEL);
    g.cleared.push(hit.text);
    g.correct += hit.jamo.length;
    record(g, true);
    // Each level brings words in a little more often.
    if (1 + Math.floor(g.cleared.length / WORDS_PER_LEVEL) > levelBefore) g.spawnEvery = Math.max(1100, g.spawnEvery * 0.9);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || g.over) return;
    keys.down(e);
    if (e.code === 'Backspace') {
      e.preventDefault();
      setTyped((t) => t.slice(0, -1));
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) submit();
      return;
    }
    const jamo = jamoForKey(e.code, e.shiftKey);
    if (jamo === undefined) return;
    e.preventDefault();
    if (e.repeat) return;
    setTyped((t) => [...t, jamo]);
    setFlash({ code: e.code, ok: true, id: performance.now() });
  }

  const hearts = '♥'.repeat(Math.max(0, g.lives)) + '♡'.repeat(LIVES - Math.max(0, g.lives));

  return (
    <div
      ref={areaRef}
      className="practice falling"
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
            <b>{g.cleared.length}</b> cleared
          </span>
          <span>
            <b>{level}</b> level
          </span>
          <span className="hearts" aria-label={`${g.lives} lives left`}>
            {hearts}
          </span>
        </div>
        <div className="free-actions" onMouseDown={(e) => e.preventDefault()}>
          <button onClick={onQuit}>Quit</button>
        </div>
      </div>

      <div className="fall-area" lang="ko" aria-hidden="true">
        {g.drops.map((d) => {
          const p = progress(g, d);
          const matching = typed.length > 0 && startsWithJamo(d.jamo, typed);
          return (
            <span
              key={d.id}
              className={`drop ${matching ? 'match' : ''} ${p > 0.75 ? 'danger' : ''}`}
              style={{ left: `${d.x * 100}%`, top: `calc(${p} * (100% - 1.6em))` }}
            >
              {d.text}
            </span>
          );
        })}
        {g.pops.map((pop) => (
          <span key={`pop-${pop.id}`} className="drop pop" style={{ left: `${pop.x * 100}%`, top: `calc(${pop.y} * (100% - 1.6em))` }}>
            {pop.text}
          </span>
        ))}
        {g.clock < 800 && <span className="fall-ready">Type the word, then Space</span>}
      </div>

      <p key={wrong} className={`input fall-input ${wrong ? 'shake' : ''}`} lang="ko">
        {assembleTyped(typed)}
        <span className="caret" />
      </p>

      <Keyboard
        flash={flash}
        unlocked={EVERY_KEY}
        held={keys.held}
        showHands={settings.showHands}
        spaceThumb={keys.spaceThumb}
        skin={skinAt(settings.skin)}
      />

      {!focused && !g.over && (
        <button className="refocus" onClick={() => areaRef.current?.focus()}>
          Paused. Click to keep playing
        </button>
      )}
    </div>
  );
}

function progress(g: Game, d: Drop): number {
  return Math.min(1, (g.clock - d.born) / d.duration);
}

function record(g: Game, cleared: boolean) {
  g.outcomes = [...g.outcomes, cleared].slice(-TUNE_WINDOW);
  if (g.outcomes.length < 5) return;
  const rate = g.outcomes.filter(Boolean).length / g.outcomes.length;
  if (rate > TARGET_HIGH) g.pace = Math.max(0.5, g.pace * 0.92);
  else if (rate < TARGET_LOW) g.pace = Math.min(4, g.pace * 1.1);
}

/** A new word: not already on screen, placed away from the newest drop, falling at the current pace. */
function spawn(g: Game, words: readonly string[], typingSpeed: number): Drop {
  const showing = new Set(g.drops.map((d) => d.text));
  const choices = words.filter((w) => !showing.has(w));
  const text = (choices.length ? choices : words)[Math.floor(Math.random() * (choices.length || words.length))];
  const jamo = toKeystrokes(text);
  const lastX = g.drops.at(-1)?.x;
  let x = Math.random() * 0.78;
  for (let i = 0; i < 4 && lastX !== undefined && Math.abs(x - lastX) < 0.2; i++) x = Math.random() * 0.78;
  // Time to type it at your usual speed, scaled by the pace, plus time to spot it.
  const typingMs = (jamo.length / Math.max(30, typingSpeed)) * 60_000;
  return { id: g.nextId++, text, jamo, x, born: g.clock, duration: typingMs * g.pace + 3000 };
}

function sameJamo(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((j, i) => j === b[i]);
}

function startsWithJamo(word: readonly string[], typed: readonly string[]): boolean {
  return typed.length <= word.length && typed.every((j, i) => j === word[i]);
}

interface SummaryProps {
  result: { cleared: number; missed: number; level: number; correct: number; netSpeed: number; seconds: number };
  reward?: Reward;
  onAgain: () => void;
  onBack: () => void;
}

/** Results of a falling-words game. */
export function FallingSummary({ result, reward, onAgain, onBack }: SummaryProps) {
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.code === 'Enter' && reward) onAgain();
      if (e.code === 'Escape') onBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAgain, onBack, reward]);

  return (
    <div className="summary">
      <h2>Game over</h2>
      <div className="scores">
        <div>
          <b>{result.cleared}</b>
          <span>words cleared</span>
        </div>
        <div>
          <b>{result.level}</b>
          <span>level reached</span>
        </div>
        <div>
          <b>{result.netSpeed}</b>
          <span>
            타/분 · {result.correct} keystrokes in {Math.round(result.seconds)}s
          </span>
        </div>
      </div>
      <RewardPanel reward={reward} />
      <div className="actions">
        <button className="primary" onClick={onAgain} disabled={!reward}>
          Play again <kbd>Enter</kbd>
        </button>
        <button onClick={onBack}>
          Back to games <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  );
}
