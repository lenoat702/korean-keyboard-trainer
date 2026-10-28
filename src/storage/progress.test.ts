import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { STARTING_UNITS, UNLOCK_ORDER } from '../engine/curriculum';
import { createRound, press, type Round } from '../engine/round';
import { toKeystrokes } from '../hangul/text';
import { TrainerDB } from './db';
import { dailyText, loadState, saveGame, saveRound } from './progress';

let n = 0;
const dbs: TrainerDB[] = [];
function freshName() {
  return `test-${n++}`;
}
function open(name: string) {
  const db = new TrainerDB(name);
  dbs.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

/** Types the whole text correctly, one press every `stepMs`. */
function typed(text: string, stepMs: number, start = 1_000_000): Round {
  return toKeystrokes(text).reduce((r, j, i) => press(r, j, 'test', start + i * stepMs), createRound(text));
}

describe('progress storage', () => {
  it('starts a new learner on the starting units', async () => {
    const state = await loadState(open(freshName()));
    expect(state.progress.unlocked).toEqual(STARTING_UNITS);
    expect(state.stats.size).toBe(0);
  });

  it('survives a reload: a new connection sees the saved round, stats and unlocks', async () => {
    const name = freshName();
    const db = open(name);
    let state = await loadState(db);

    // Fast, accurate rounds over the starting keys until the next key unlocks.
    let unlocked: string | undefined;
    for (let i = 0; i < 10 && !unlocked; i++) {
      ({ state, unlocked } = await saveRound(db, state, typed('아이 나라 니 리 아니 나이 이리 나리 리나 이나', 200, i * 100_000)));
    }
    expect(unlocked).toBe('ㅓ');
    db.close();

    const reloaded = await loadState(open(name));
    expect(reloaded.progress.unlocked).toEqual([...STARTING_UNITS, 'ㅓ']);
    expect(reloaded.stats.get('ㅏ')?.results.length).toBeGreaterThan(0);
    expect(reloaded.stats).toEqual(state.stats);

    const again = open(name);
    expect(await again.sessions.count()).toBeGreaterThan(0);
    const session = (await again.sessions.toArray())[0];
    expect(await again.keystrokes.where('sessionId').equals(session.id!).count()).toBe(toKeystrokes(session.text).length);
  });

  it('does not unlock while a key is slow', async () => {
    const db = open(freshName());
    let state = await loadState(db);
    for (let i = 0; i < 5; i++) {
      const r = await saveRound(db, state, typed('아이 나라 니 리 아니 나이 이리 나리', 900, i * 100_000));
      expect(r.unlocked).toBeUndefined();
      state = r.state;
    }
  });
});

describe('rewards storage', () => {
  it('records XP and the first-round badge, and remembers them after a reload', async () => {
    const name = freshName();
    const db = open(name);
    const { state, reward } = await saveRound(db, await loadState(db), typed('아니 나리', 150));
    // 9 keystrokes, all right first time: 9 XP plus the 97%+ bonus.
    expect(reward.xp).toBe(14);
    expect(reward.newBadges).toEqual(['first-syllable']);
    expect(state.badges.has('first-syllable')).toBe(true);

    const reloaded = await loadState(open(name));
    expect(reloaded.sessions).toHaveLength(1);
    expect(reloaded.sessions[0]).toMatchObject({ xp: 14, correct: 9, mode: 'adaptive' });
    expect(reloaded.badges.has('first-syllable')).toBe(true);
  });

  it('only awards a badge once', async () => {
    const db = open(freshName());
    const first = await saveRound(db, await loadState(db), typed('아니', 150));
    const second = await saveRound(db, first.state, typed('나리', 150, 2_000_000));
    expect(second.reward.newBadges).toEqual([]);
  });

  it('saves a game with XP but no key stats, at the clear rate the game aims for', async () => {
    const db = open(freshName());
    const { state, reward } = await saveGame(db, await loadState(db), {
      mode: 'falling',
      text: '아이 나라',
      startedAt: 1_000_000,
      seconds: 30,
      netSpeed: 20,
      accuracy: 75,
      correct: 10,
    });
    expect(reward.xp).toBe(10);
    expect(state.stats.size).toBe(0);
    expect(await db.keystrokes.count()).toBe(0);
  });

  it('keeps the same daily challenge text all day', async () => {
    const db = open(freshName());
    const state = await loadState(db);
    const morning = new Date(2026, 9, 29, 8).getTime();
    const evening = new Date(2026, 9, 29, 21).getTime();
    const text = await dailyText(db, state, morning);
    expect(await dailyText(db, { ...state, progress: { ...state.progress, unlocked: UNLOCK_ORDER } }, evening)).toBe(text);
    expect(await dailyText(db, state, new Date(2026, 9, 30, 8).getTime())).not.toBe(text);
  });

  it('upgrades a version 1 database without losing practice', async () => {
    const name = freshName();
    const v1 = new Dexie(name);
    v1.version(1).stores({ keystrokes: '++id, sessionId, time, expected', sessions: '++id, startedAt, mode', keyStats: 'unit', progress: 'id', settings: 'id' });
    await v1.table('sessions').add({ mode: 'adaptive', stage: 1, text: '아니', startedAt: 1, seconds: 10, netSpeed: 50, accuracy: 90, xp: 0 });
    await v1.table('settings').put({ id: 'me', targetSpeed: 120, accuracyFloor: 95 });
    v1.close();

    const state = await loadState(open(name));
    expect(state.sessions).toHaveLength(1);
    expect(state.settings).toMatchObject({ targetSpeed: 120, dailyGoalMinutes: 10 });
    expect(state.badges.size).toBe(0);
  });
});
