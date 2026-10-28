import { describe, expect, it } from 'vitest';
import { backspace, createRound, isFinished, nextExpected, press, stats, type Round } from './round';

const typeAll = (r: Round, jamo: string[], start = 0, stepMs = 100): Round =>
  jamo.reduce((acc, j, i) => press(acc, j, 'test', start + i * stepMs), r);

describe('round', () => {
  it('starts the timer on the first press', () => {
    const r = press(createRound('아'), 'ㅇ', 'KeyD', 5000);
    expect(r.startedAt).toBe(5000);
  });

  it('finishes when every position is filled', () => {
    const r = typeAll(createRound('나'), ['ㄴ', 'ㅏ']);
    expect(isFinished(r)).toBe(true);
    expect(nextExpected(r)).toBeUndefined();
  });

  it('ignores presses after the round ends', () => {
    const r = typeAll(createRound('나'), ['ㄴ', 'ㅏ']);
    expect(press(r, 'ㅁ', 'KeyA', 999)).toBe(r);
  });

  it('counts accuracy on first tries only', () => {
    let r = createRound('나');
    r = press(r, 'ㅁ', 'KeyA', 0); // wrong first try at position 0
    r = backspace(r);
    r = press(r, 'ㄴ', 'KeyS', 100); // fixed, but the first try already counted
    r = press(r, 'ㅏ', 'KeyK', 200);
    expect(stats(r, 200).accuracy).toBe(50);
    expect(stats(r, 200).missed).toEqual([{ jamo: 'ㄴ', count: 1 }]);
  });

  it('computes net speed from correct keystrokes only', () => {
    // 4 keystrokes, one left wrong, over 3 seconds → 3 correct / 3 s = 60 per minute
    const r = typeAll(createRound('나라'), ['ㄴ', 'ㅏ', 'ㄹ', 'ㅓ'], 0, 1000);
    const s = stats(r, 3000);
    expect(s.correct).toBe(3);
    expect(s.netSpeed).toBe(60);
  });

  it('logs the time since the previous press', () => {
    const r = typeAll(createRound('나'), ['ㄴ', 'ㅏ'], 1000, 250);
    expect(r.log.map((p) => p.msSincePrev)).toEqual([null, 250]);
  });

  it('does nothing on backspace with nothing typed', () => {
    const r = createRound('나');
    expect(backspace(r)).toBe(r);
  });
});
