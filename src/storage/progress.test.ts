import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { STARTING_UNITS, UNLOCK_ORDER } from '../engine/curriculum';
import { createRound, press, type Round } from '../engine/round';
import { toKeystrokes } from '../hangul/text';
import { TrainerDB } from './db';
import { placementText, unitsThrough } from '../engine/placement';
import { addOwnText, dailyText, loadOwnTexts, loadState, saveGame, savePlacement, saveRound, setOwnTextPart, status } from './progress';

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

  it('saves a pasted text cleaned, and keeps your place through its parts', async () => {
    const db = open(freshName());
    const sentence = '저는 매일 아침 일찍 일어나서 공원에서 천천히 걸어요.';
    const { saved, removed } = await addOwnText(db, `Hello! ${Array(8).fill(sentence).join(' ')}`);
    expect(removed).toBe(6);
    expect(saved!.parts.length).toBeGreaterThan(1);

    const second = await setOwnTextPart(db, saved!, 1);
    expect((await loadOwnTexts(db))[0].part).toBe(1);
    // Past the last part, it starts again from the top.
    const wrapped = await setOwnTextPart(db, second, saved!.parts.length);
    expect(wrapped.part).toBe(0);
  });

  it("doesn't save a paste with nothing to type", async () => {
    const db = open(freshName());
    expect((await addOwnText(db, 'only English here')).saved).toBeUndefined();
    expect(await db.texts.count()).toBe(0);
  });

  describe('placement test', () => {
    it('unlocks the passed stages with credit, and keeps every stage typed as a round', async () => {
      const db = open(freshName());
      const state = await loadState(db);
      // Stages 1 and 2 typed fast, stage 3 too slow to pass.
      const rounds = [typed(placementText(1), 300), typed(placementText(2), 300, 2_000_000), typed(placementText(3), 900, 3_000_000)];
      const { state: next, reward } = await savePlacement(db, state, rounds, 2);

      expect(next.progress.unlocked).toEqual([...unitsThrough(2), 'ㄱ']);
      expect(next.progress.placed).toEqual(unitsThrough(2));
      expect(next.progress.stage).toBe(3);
      expect(status(next).stagesPassed).toBe(2);
      expect(reward?.mode).toBe('placement');

      // Stage 3's presses count too, now that its first key is unlocked.
      expect(next.stats.get('ㄱ')?.results.length ?? 0).toBeGreaterThan(0);
      const sessions = await db.sessions.toArray();
      expect(sessions.map((s) => [s.mode, s.stage])).toEqual([
        ['placement', 1],
        ['placement', 2],
        ['placement', 3],
      ]);
      expect(await db.keystrokes.count()).toBe(rounds.reduce((n, r) => n + r.log.length, 0));

      const reloaded = await loadState(db);
      expect(reloaded.progress).toEqual(next.progress);
    });

    it('changes nothing but the record when no stage passed', async () => {
      const db = open(freshName());
      const state = await loadState(db);
      const { state: next } = await savePlacement(db, state, [typed(placementText(1), 900)], 0);
      expect(next.progress.unlocked).toEqual(STARTING_UNITS);
      expect(next.progress.placed).toEqual([]);
      expect(await db.sessions.count()).toBe(1);
    });

    it('lets normal unlocking carry on from the placement', async () => {
      const db = open(freshName());
      let state = (await savePlacement(db, await loadState(db), [typed(placementText(1), 300)], 1)).state;
      expect(state.progress.unlocked).toEqual([...unitsThrough(1), 'ㅎ']);
      // Only ㅎ needs to reach the target; the placed home-row keys are on credit.
      let unlocked: string | undefined;
      for (let i = 0; i < 10 && !unlocked; i++) {
        ({ state, unlocked } = await saveRound(db, state, typed('하나 하하 한 하마 할 함 하리 아하 할머니 허', 200, (i + 5) * 100_000)));
      }
      expect(unlocked).toBe('ㅗ');
    });
  });
});
