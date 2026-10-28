import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/dashboard/Dashboard';
import { FallingSummary, FallingWords } from './components/FallingWords';
import { FreeType } from './components/FreeType';
import { bestOnDay, Games, type GameKind } from './components/Games';
import { KeyProgress } from './components/KeyProgress';
import { Practice } from './components/Practice';
import { SettingsMenu } from './components/SettingsMenu';
import { Summary } from './components/Summary';
import { generateText, practiceWords, type Pair } from './engine/generator';
import { focusUnit } from './engine/keyStats';
import { rankName, sprintScore } from './engine/rank';
import type { Round } from './engine/round';
import { TrainerDB, type SessionMode } from './storage/db';
import {
  dailyText,
  loadState,
  saveDailyGoal,
  saveGame,
  saveRound,
  status as statusOf,
  type AppState,
  type GameResult,
  type Reward,
} from './storage/progress';

const db = new TrainerDB();

interface Drill {
  text: string;
  focus?: string;
  /** Set when drilling one slow key pair from the progress screen. */
  pair?: Pair;
}

function nextDrill(state: AppState, pair?: Pair): Drill {
  const { unlocked } = state.progress;
  if (pair) return { text: generateText({ unlocked, pair }), pair };
  const focus = focusUnit(unlocked, state.stats, state.settings);
  return { text: generateText({ unlocked, focus }), focus };
}

/** Sprint text: more than anyone types in a minute, so it never runs out. */
const SPRINT_KEYSTROKES = 900;
const SPRINT_MS = 60_000;

interface Result {
  round: Round;
  saving: boolean;
  unlocked?: string;
  reward?: Reward;
}

/** A game in progress or just finished. Sprint and daily are timed or fixed-text rounds. */
type Play =
  | { kind: 'sprint' | 'daily'; text: string; id: number; result?: Result }
  | {
      kind: 'falling';
      id: number;
      result?: { game: GameResult & { level: number; missed: number; cleared: number }; reward?: Reward };
    };

type View = 'practice' | 'games' | 'free' | 'progress';

const VIEWS: ReadonlyArray<[View, string]> = [
  ['practice', 'Practice'],
  ['games', 'Games'],
  ['free', 'Free type'],
  ['progress', 'Progress'],
];

/** Your usual speed for tuning games: the mean of recent jamo-checked rounds. */
function typingSpeed(state: AppState): number {
  const recent = state.sessions.filter((s) => s.mode !== 'falling' && s.netSpeed > 0).slice(-10);
  return recent.length ? recent.reduce((a, s) => a + s.netSpeed, 0) / recent.length : 60;
}

export function App() {
  const [view, setView] = useState<View>('practice');
  const [state, setState] = useState<AppState | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [play, setPlay] = useState<Play | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped to remount Practice with a fresh round, even when the text is unchanged.
  const [roundId, setRoundId] = useState(0);
  // Free-type text lives here so it survives switching screens.
  const [freeTyped, setFreeTyped] = useState<string[]>([]);

  useEffect(() => {
    loadState(db)
      .then((s) => {
        setState(s);
        setDrill(nextDrill(s));
      })
      .catch((e: unknown) => setError(`Couldn't open saved progress: ${String(e)}`));
  }, []);

  const unlockedSet = useMemo(() => new Set(state?.progress.unlocked), [state]);
  const status = useMemo(() => (state ? statusOf(state) : null), [state]);

  // Each screen starts at the top, so e.g. a pair drill's banner isn't left scrolled out of view.
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect may only return a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, play?.id]);

  /** Saves a finished round in any mode, then hands the outcome to `show`. */
  const saveFinished = useCallback(
    (round: Round, mode: Exclude<SessionMode, 'falling'>, show: (r: Result) => void) => {
      if (!state) return;
      show({ round, saving: true });
      saveRound(db, state, round, mode)
        .then(({ state: next, unlocked, reward }) => {
          setState(next);
          show({ round, saving: false, unlocked, reward });
        })
        .catch((e: unknown) => {
          setError(`This round couldn't be saved: ${String(e)}`);
          show({ round, saving: false });
        });
    },
    [state],
  );

  const onFinish = useCallback(
    (round: Round) => drill && saveFinished(round, drill.pair ? 'pair' : 'adaptive', setResult),
    [drill, saveFinished],
  );

  const startDrill = useCallback((next: Drill) => {
    setDrill(next);
    setResult(null);
    setRoundId((n) => n + 1);
  }, []);

  // After a pair drill, Next goes back to adaptive practice; Retry repeats the same text.
  const onNext = useCallback(() => state && startDrill(nextDrill(state)), [state, startDrill]);
  const onRetry = useCallback(() => drill && startDrill(drill), [drill, startDrill]);
  const onDrillPair = useCallback(
    (pair: Pair) => {
      if (!state) return;
      startDrill(nextDrill(state, pair));
      setView('practice');
    },
    [state, startDrill],
  );

  const startGame = useCallback(
    async (kind: GameKind, text?: string) => {
      if (!state) return;
      const id = Date.now();
      if (kind === 'falling') setPlay({ kind, id });
      else if (kind === 'sprint') {
        setPlay({ kind, id, text: text ?? generateText({ unlocked: state.progress.unlocked, keystrokes: SPRINT_KEYSTROKES }) });
      } else setPlay({ kind, id, text: text ?? (await dailyText(db, state)) });
    },
    [state],
  );

  const onGoalChange = useCallback(
    (minutes: number) => {
      if (!state) return;
      saveDailyGoal(db, state, minutes)
        .then(setState)
        .catch((e: unknown) => setError(`Couldn't save the daily goal: ${String(e)}`));
    },
    [state],
  );

  const backToGames = useCallback(() => setPlay(null), []);

  function renderGame() {
    if (!state || !status) return null;
    if (!play) return <Games state={state} status={status} onPlay={(k) => void startGame(k)} />;

    if (play.kind === 'falling') {
      if (play.result) {
        const { game, reward } = play.result;
        return <FallingSummary result={game} reward={reward} onAgain={() => void startGame('falling')} onBack={backToGames} />;
      }
      return (
        <FallingWords
          key={play.id}
          words={practiceWords(state.progress.unlocked)}
          typingSpeed={typingSpeed(state)}
          onQuit={backToGames}
          onFinish={(game) => {
            setPlay({ ...play, result: { game } });
            saveGame(db, state, game)
              .then(({ state: next, reward }) => {
                setState(next);
                setPlay((p) => (p?.id === play.id && p.kind === 'falling' ? { ...p, result: { game, reward } } : p));
              })
              .catch((e: unknown) => setError(`This game couldn't be saved: ${String(e)}`));
          }}
        />
      );
    }

    const show = (r: Result) => setPlay((p) => (p?.id === play.id ? { ...play, result: r } : p));
    if (play.result) {
      const sprint = play.kind === 'sprint';
      return (
        <Summary
          round={play.result.round}
          saving={play.result.saving}
          unlocked={play.result.unlocked}
          reward={play.result.reward}
          title={sprint ? 'Sprint finished' : 'Daily challenge complete'}
          nextLabel={sprint ? 'New sprint' : 'Back to games'}
          retryLabel={sprint ? 'Same text again' : 'Try again'}
          onNext={sprint ? () => void startGame('sprint') : backToGames}
          onRetry={() => void startGame(play.kind, play.text)}
          onBack={sprint ? backToGames : undefined}
          extra={sprint ? <SprintNote state={state} /> : <DailyNote state={state} />}
        />
      );
    }
    return (
      <>
        <p className="drill-banner">
          {play.kind === 'sprint'
            ? 'Sprint: type as fast as you can for 60 seconds. The timer starts on your first key.'
            : "Daily challenge: today's text is the same all day."}{' '}
          <button className="link" onClick={backToGames}>
            Back to games
          </button>
        </p>
        <Practice
          key={play.id}
          text={play.text}
          unlocked={unlockedSet}
          onFinish={(round) => saveFinished(round, play.kind, show)}
          timeLimitMs={play.kind === 'sprint' ? SPRINT_MS : undefined}
        />
      </>
    );
  }

  return (
    <main>
      <header>
        <div className="title">
          <h1>
            Korean Keyboard Trainer <span lang="ko">두벌식</span>
          </h1>
          {status && (
            <button className="status-line" onClick={() => setView('progress')} title="Rank, streak and XP: open Progress">
              <span lang="ko">{rankName(status.rank)}</span> · {status.streak.current} day streak ·{' '}
              {status.xpTotal.toLocaleString()} XP
            </button>
          )}
        </div>
        <div className="header-actions">
          <nav aria-label="Screens">
            {VIEWS.map(([v, label]) => (
              <button key={v} className={view === v ? 'active' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </nav>
          <SettingsMenu />
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {view === 'free' ? (
        // Free type needs no saved progress, so it doesn't wait for the database.
        <FreeType typed={freeTyped} setTyped={setFreeTyped} />
      ) : !state || !drill || !status ? (
        !error && <p className="loading">Loading your progress…</p>
      ) : view === 'progress' ? (
        <Dashboard db={db} state={state} status={status} onDrillPair={onDrillPair} onGoalChange={onGoalChange} />
      ) : view === 'games' ? (
        renderGame()
      ) : (
        <>
          {drill.pair && !result && (
            <p className="drill-banner" lang="ko">
              Drilling a slow pair: {drill.pair[0]} → {drill.pair[1]}
            </p>
          )}
          {result ? (
            <Summary
              round={result.round}
              saving={result.saving}
              unlocked={result.unlocked}
              reward={result.reward}
              onNext={onNext}
              onRetry={onRetry}
            />
          ) : (
            <Practice key={roundId} text={drill.text} unlocked={unlockedSet} focus={drill.focus} onFinish={onFinish} />
          )}
          <KeyProgress state={state} focus={drill.focus} />
        </>
      )}

      <footer>
        Keep your input language on English: the trainer reads physical keys and builds Hangul itself. Progress is saved
        in this browser only.
      </footer>
    </main>
  );
}

/** The sprint's rank-test score after this result. */
function SprintNote({ state }: { state: AppState }) {
  const sprints = state.sessions.filter((s) => s.mode === 'sprint');
  const score = sprintScore(sprints, 95);
  return (
    <p className="mode-note">
      {score === null
        ? `Rank test: ${Math.min(sprints.length, 3)} of 3 sprints so far. Your score is the mean of your best 3 of the last 10.`
        : `Sprint score ${score} 타/분 (best 3 of your last 10 at 95%+ accuracy).`}
    </p>
  );
}

/** How today's best compares with earlier days. */
function DailyNote({ state }: { state: AppState }) {
  const now = Date.now();
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ d, best: bestOnDay(state.sessions, now - d * 86_400_000) }));
  const earlier = days.slice(1).filter((x) => x.best !== null);
  const today = days[0].best;
  return (
    <p className="mode-note">
      Today's best {today ?? '—'} 타/분
      {earlier.length > 0
        ? ` · ${earlier.map((x) => `${x.d === 1 ? 'yesterday' : `${x.d} days ago`} ${x.best}`).join(' · ')}`
        : ' · come back tomorrow to compare'}
    </p>
  );
}
