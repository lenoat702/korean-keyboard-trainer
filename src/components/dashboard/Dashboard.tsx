import { useEffect, useMemo, useState } from 'react';
import type { Pair } from '../../engine/generator';
import { dailySeries, slowestPairs, startOfDay, type DayPoint, type PairStat } from '../../engine/history';
import type { TrainerDB } from '../../storage/db';
import type { AppState, Status } from '../../storage/progress';
import { BackupSection } from './BackupSection';
import { KeyHeatmap } from './KeyHeatmap';
import { PracticeCalendar } from './PracticeCalendar';
import { RewardsSection } from './RewardsSection';
import { SlowPairs } from './SlowPairs';
import { Legend, longDate, TrendChart, type Series } from './TrendChart';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

interface Props {
  db: TrainerDB;
  state: AppState;
  status: Status;
  onDrillPair: (pair: Pair) => void;
  onGoalChange: (minutes: number) => void;
  onRestored: () => void;
}

interface Data {
  days: DayPoint[];
  pairs: PairStat[];
}

export function Dashboard({ db, state, status, onDrillPair, onGoalChange, onRestored }: Props) {
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<Data | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const now = Date.now();
    const rangeStart = startOfDay(now, -(range - 1)).getTime();
    // Six extra days so the first point's 7-day average is complete.
    const loadFrom = startOfDay(now, -(range - 1) - 6).getTime();
    Promise.all([
      db.sessions.where('startedAt').aboveOrEqual(loadFrom).toArray(),
      db.keystrokes.where('time').aboveOrEqual(rangeStart).toArray(),
    ]).then(([sessions, keystrokes]) => {
      if (!live) return;
      keystrokes.sort((a, b) => a.id! - b.id!);
      setData({ days: dailySeries(sessions, now, range), pairs: slowestPairs(keystrokes) });
    });
    return () => {
      live = false;
    };
  }, [db, range]);

  const speedSeries = useMemo<Series[]>(
    () =>
      data
        ? [
            { label: 'Daily', values: data.days.map((d) => d.speed), kind: 'dots' },
            { label: '7-day average', values: data.days.map((d) => d.avgSpeed), kind: 'line' },
          ]
        : [],
    [data],
  );
  const accSeries = useMemo<Series[]>(
    () =>
      data
        ? [
            { label: 'Daily', values: data.days.map((d) => d.accuracy), kind: 'dots' },
            { label: '7-day average', values: data.days.map((d) => d.avgAccuracy), kind: 'line' },
          ]
        : [],
    [data],
  );

  const accMin = useMemo(() => {
    const vals = accSeries.flatMap((s) => s.values).filter((v): v is number => v !== null);
    return Math.min(80, Math.floor(Math.min(100, ...vals) / 5) * 5);
  }, [accSeries]);

  return (
    <div className={`dashboard ${data ? '' : 'loading'}`}>
      <RewardsSection state={state} status={status} onGoalChange={onGoalChange} />

      <div className="filters" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r} className={r === range ? 'active' : ''} aria-pressed={r === range} onClick={() => setRange(r)}>
            Last {r} days
          </button>
        ))}
      </div>

      {data && (data.days.every((d) => d.rounds === 0) ? (
        <p className="empty dash-card">No practice in the last {range} days yet. Finish a few rounds and your trends appear here.</p>
      ) : (
        <>
          <Tiles days={data.days} />

          <section className="dash-card">
            <h3>Speed and accuracy</h3>
            <Legend series={speedSeries} />
            <TrendChart
              title="Net speed (타/분)"
              dates={data.days.map((d) => d.date)}
              series={speedSeries}
              format={(v) => String(Math.round(v))}
              hover={hover}
              onHover={setHover}
            />
            <TrendChart
              title="Accuracy (%)"
              dates={data.days.map((d) => d.date)}
              series={accSeries}
              format={(v) => `${Math.round(v)}`}
              yMin={accMin}
              yMax={100}
              hover={hover}
              onHover={setHover}
              height={140}
            />
            <details className="table-view">
              <summary>Show daily numbers</summary>
              <DailyTable days={data.days} />
            </details>
          </section>

          <div className="dash-grid">
            <PracticeCalendar days={data.days} />
            <SlowPairs pairs={data.pairs} onDrill={onDrillPair} />
          </div>
        </>
      ))}

      <KeyHeatmap state={state} />
      <BackupSection db={db} onRestored={onRestored} />
    </div>
  );
}

function Tiles({ days }: { days: readonly DayPoint[] }) {
  const minutes = days.reduce((a, d) => a + d.minutes, 0);
  const practised = days.filter((d) => d.rounds > 0).length;
  const avgs = days.map((d) => d.avgSpeed).filter((v): v is number => v !== null);
  const accs = days.map((d) => d.avgAccuracy).filter((v): v is number => v !== null);
  const latest = avgs.at(-1);
  const change = avgs.length > 1 ? Math.round(avgs.at(-1)! - avgs[0]) : null;

  return (
    <div className="tiles">
      <div className="tile">
        <span className="tile-label">Speed, 7-day average</span>
        <b>{latest === undefined ? '—' : Math.round(latest)}</b>
        <span className="tile-unit">타/분</span>
        {change !== null && (
          <span className={`delta ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
            {change > 0 ? '▲' : change < 0 ? '▼' : '▬'} {change > 0 ? '+' : ''}
            {change} since {longDate(days[days.findIndex((d) => d.avgSpeed !== null)].date)}
          </span>
        )}
      </div>
      <div className="tile">
        <span className="tile-label">Accuracy, 7-day average</span>
        <b>{accs.length ? `${Math.round(accs.at(-1)! * 10) / 10}%` : '—'}</b>
      </div>
      <div className="tile">
        <span className="tile-label">Practice time</span>
        <b>{Math.round(minutes)}</b>
        <span className="tile-unit">min</span>
      </div>
      <div className="tile">
        <span className="tile-label">Days practised</span>
        <b>{practised}</b>
        <span className="tile-unit">of {days.length}</span>
      </div>
    </div>
  );
}

function DailyTable({ days }: { days: readonly DayPoint[] }) {
  const fmt = (v: number | null, suffix = '') => (v === null ? '—' : `${Math.round(v * 10) / 10}${suffix}`);
  return (
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Speed (타/분)</th>
          <th>7-day avg</th>
          <th>Accuracy</th>
          <th>7-day avg</th>
          <th>Minutes</th>
          <th>Rounds</th>
        </tr>
      </thead>
      <tbody>
        {[...days].reverse().map((d) => (
          <tr key={d.day}>
            <td>{longDate(d.date)}</td>
            <td>{fmt(d.speed)}</td>
            <td>{fmt(d.avgSpeed)}</td>
            <td>{fmt(d.accuracy, '%')}</td>
            <td>{fmt(d.avgAccuracy, '%')}</td>
            <td>{d.minutes}</td>
            <td>{d.rounds}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
