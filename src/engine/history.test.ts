import { describe, expect, it } from 'vitest';
import type { KeystrokeRow, SessionRow } from '../storage/db';
import { dailySeries, dayKey, slowestPairs, startOfDay } from './history';

const NOW = new Date(2026, 9, 28, 20, 0).getTime(); // Oct 28 2026, 8pm local

function session(daysAgo: number, netSpeed: number, seconds = 60, accuracy = 95): SessionRow {
  return {
    mode: 'adaptive',
    stage: 1,
    text: '',
    startedAt: startOfDay(NOW, -daysAgo).getTime() + 9 * 3600_000,
    seconds,
    netSpeed,
    accuracy,
    xp: 0,
  };
}

describe('dailySeries', () => {
  it('has one point per day ending today, empty days included', () => {
    const pts = dailySeries([session(0, 100)], NOW, 7);
    expect(pts).toHaveLength(7);
    expect(pts.at(-1)!.day).toBe('2026-10-28');
    expect(pts[0].day).toBe('2026-10-22');
    expect(pts[0].speed).toBeNull();
    expect(pts.at(-1)!.speed).toBe(100);
  });

  it('weights a day by typing time', () => {
    const pts = dailySeries([session(0, 100, 60), session(0, 200, 180)], NOW, 1);
    expect(pts[0].speed).toBe(175);
    expect(pts[0].minutes).toBe(4);
    expect(pts[0].rounds).toBe(2);
  });

  it('shows a week of practice as a rising 7-day average', () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => session(d, 160 - d * 10));
    const pts = dailySeries(week, NOW, 7);
    const avgs = pts.map((p) => p.avgSpeed!);
    expect(avgs.every((a, i) => i === 0 || a > avgs[i - 1])).toBe(true);
    expect(avgs.at(-1)).toBe(130);
  });

  it('uses sessions before the range to complete the first averages', () => {
    // Range starts Oct 26; its window reaches back to Oct 20 (8 days ago) but not Oct 18.
    const pts = dailySeries([session(10, 999), session(8, 100), session(7, 140)], NOW, 3);
    expect(pts[0].avgSpeed).toBe(120);
    expect(pts[0].speed).toBeNull();
  });
});

describe('dayKey', () => {
  it('uses the local calendar day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

let id = 0;
function ks(sessionId: number, index: number, expected: string, ms: number | null, extra: Partial<KeystrokeRow> = {}): KeystrokeRow {
  return { id: id++, sessionId, index, time: 0, expected, typed: expected, keyCode: '', msSincePrev: ms, correct: true, firstTry: true, ...extra };
}

describe('slowestPairs', () => {
  const run = (pairs: Array<[string, string, number]>, session = 1) =>
    pairs.flatMap(([a, b, ms], i) => [ks(session, i * 3, a, 100), ks(session, i * 3 + 1, b, ms), ks(session, i * 3 + 2, ' ', 100)]);

  it('ranks pairs by median time, slowest first, needing enough samples', () => {
    const rows = [
      ...run(new Array(5).fill(['ㄴ', 'ㅏ', 300])),
      ...run(new Array(5).fill(['ㄹ', 'ㅣ', 600]), 2),
      ...run(new Array(2).fill(['ㅁ', 'ㅓ', 900]), 3),
    ];
    expect(slowestPairs(rows)).toEqual([
      { from: 'ㄹ', to: 'ㅣ', median: 600, count: 5 },
      { from: 'ㄴ', to: 'ㅏ', median: 300, count: 5 },
    ]);
  });

  it('skips pairs broken by a correction, a pause, a session boundary or a space', () => {
    const rows = [
      ks(1, 0, 'ㄴ', null),
      ks(1, 1, 'ㅏ', 300, { firstTry: false }), // retyped after Backspace
      ks(1, 2, 'ㄹ', 5000), // pause
      ks(2, 3, 'ㅣ', 200), // new session
      ks(2, 4, ' ', 100),
      ks(2, 5, 'ㅇ', 100),
    ];
    expect(slowestPairs(rows, 1)).toEqual([]);
  });
});
