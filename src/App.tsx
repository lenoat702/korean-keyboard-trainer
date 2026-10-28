import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/dashboard/Dashboard';
import { FreeType } from './components/FreeType';
import { KeyProgress } from './components/KeyProgress';
import { Practice } from './components/Practice';
import { SettingsMenu } from './components/SettingsMenu';
import { Summary } from './components/Summary';
import { generateText, type Pair } from './engine/generator';
import { focusUnit } from './engine/keyStats';
import type { Round } from './engine/round';
import { TrainerDB } from './storage/db';
import { loadState, saveRound, type AppState } from './storage/progress';

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

interface Result {
  round: Round;
  saving: boolean;
  unlocked?: string;
}

type View = 'practice' | 'free' | 'progress';

const VIEWS: ReadonlyArray<[View, string]> = [
  ['practice', 'Practice'],
  ['free', 'Free type'],
  ['progress', 'Progress'],
];

export function App() {
  const [view, setView] = useState<View>('practice');
  const [state, setState] = useState<AppState | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [result, setResult] = useState<Result | null>(null);
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

  // Each screen starts at the top, so e.g. a pair drill's banner isn't left scrolled out of view.
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect may only return a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const onFinish = useCallback(
    (round: Round) => {
      if (!state || !drill) return;
      setResult({ round, saving: true });
      saveRound(db, state, round, drill.pair ? 'pair' : 'adaptive')
        .then(({ state: next, unlocked }) => {
          setState(next);
          setResult({ round, saving: false, unlocked });
        })
        .catch((e: unknown) => {
          setError(`This round couldn't be saved: ${String(e)}`);
          setResult({ round, saving: false });
        });
    },
    [state, drill],
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

  return (
    <main>
      <header>
        <h1>
          Korean Keyboard Trainer <span lang="ko">두벌식</span>
        </h1>
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
      ) : !state || !drill ? (
        !error && <p className="loading">Loading your progress…</p>
      ) : view === 'progress' ? (
        <Dashboard db={db} state={state} onDrillPair={onDrillPair} />
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
