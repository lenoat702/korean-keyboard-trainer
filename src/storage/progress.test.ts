import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { STARTING_UNITS } from '../engine/curriculum';
import { createRound, press, type Round } from '../engine/round';
import { toKeystrokes } from '../hangul/text';
import { TrainerDB } from './db';
import { loadState, saveRound } from './progress';

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
