import { useState } from 'react';
import type { DayPoint } from '../../engine/history';
import { longDate } from './TrendChart';

/** Minutes thresholds for the four shades; 10 minutes is the default daily goal. */
const LEVELS = [5, 10, 20];

const level = (minutes: number) => (minutes === 0 ? 0 : 1 + LEVELS.filter((l) => minutes >= l).length);

/** One square per day, Monday-first weeks as columns, shaded by minutes practised. */
export function PracticeCalendar({ days }: { days: readonly DayPoint[] }) {
  const [active, setActive] = useState<DayPoint | null>(null);
  // Pad the front so the first column starts on a Monday.
  const lead = (days[0].date.getDay() + 6) % 7;
  const cells: Array<DayPoint | null> = [...new Array(lead).fill(null), ...days];
  const weeks: Array<Array<DayPoint | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const practised = days.filter((d) => d.minutes > 0).length;

  return (
    <section className="dash-card">
      <h3>Practice calendar</h3>
      <p className="sub">
        {practised} of {days.length} days practised
      </p>
      <div className="calendar">
        <div className="cal-days" aria-hidden="true">
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div className="cal-week" key={w}>
            {week.map((d, i) =>
              d ? (
                <div
                  key={d.day}
                  className={`cal-cell c${level(d.minutes)} ${active?.day === d.day ? 'active' : ''}`}
                  tabIndex={0}
                  aria-label={`${longDate(d.date)}: ${d.minutes} minutes`}
                  onPointerEnter={() => setActive(d)}
                  onFocus={() => setActive(d)}
                  onPointerLeave={() => setActive(null)}
                  onBlur={() => setActive(null)}
                />
              ) : (
                <div key={`pad${i}`} className="cal-cell pad" />
              ),
            )}
          </div>
        ))}
      </div>
      <p className="readout" aria-live="polite">
        {active
          ? `${longDate(active.date)}: ${active.minutes} min · ${active.rounds} round${active.rounds === 1 ? '' : 's'}`
          : 'Point at or tab to a day.'}
      </p>
      <div className="scale" aria-hidden="true">
        <span className="cal-cell c0" /> none <span className="cal-cell c1" /> &lt;5 <span className="cal-cell c2" /> 5–10{' '}
        <span className="cal-cell c3" /> 10–20 <span className="cal-cell c4" /> 20+ min
      </div>
    </section>
  );
}
