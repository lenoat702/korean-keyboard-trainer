import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createRound, press, type Round } from '../engine/round';
import { toKeystrokes } from '../hangul/text';
import { exportBackup, importBackup, parseBackup, summarizeBackup } from './backup';
import { TrainerDB } from './db';
import { addOwnText, loadState, saveRound } from './progress';

let n = 0;
const dbs: TrainerDB[] = [];
function open() {
  const db = new TrainerDB(`backup-test-${n++}`);
  dbs.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

function typed(text: string, stepMs: number, start = 1_000_000): Round {
  return toKeystrokes(text).reduce((r, j, i) => press(r, j, 'test', start + i * stepMs), createRound(text));
}

describe('backup', () => {
  it('restores everything into another database, through JSON', async () => {
    const from = open();
    await saveRound(from, await loadState(from), typed('아니 나라', 200));
    await addOwnText(from, '안녕하세요. 반갑습니다.');
    const file = JSON.stringify(await exportBackup(from, { showHands: false }, 5_000));

    const to = open();
    await saveRound(to, await loadState(to), typed('이리', 300)); // replaced by the restore
    const backup = parseBackup(JSON.parse(file));
    await importBackup(to, backup);

    const [a, b] = [await loadState(from), await loadState(to)];
    expect(b.sessions).toEqual(a.sessions);
    expect(b.progress).toEqual(a.progress);
    expect([...b.stats]).toEqual([...a.stats]);
    expect(await to.keystrokes.count()).toBe(await from.keystrokes.count());
    expect(await to.texts.toArray()).toEqual(await from.texts.toArray());
    expect(backup.prefs).toEqual({ showHands: false });
    expect(summarizeBackup(backup)).toMatchObject({ exportedAt: 5_000, sessions: 1 });
  });

  it('rejects files that are not backups, with a message to show', () => {
    expect(() => parseBackup({ hello: 1 })).toThrow("isn't a Korean Keyboard Trainer backup");
    expect(() => parseBackup({ app: 'korean-keyboard-trainer', format: 99, tables: {} })).toThrow('newer version');
    expect(() => parseBackup({ app: 'korean-keyboard-trainer', format: 1, tables: { sessions: 'x' } })).toThrow('damaged');
  });

  it('leaves the data unchanged when a restore fails part way', async () => {
    const db = open();
    await saveRound(db, await loadState(db), typed('아니', 200));
    // Two keystrokes with the same id can't both be added, so the restore must roll back.
    const bad = parseBackup({
      app: 'korean-keyboard-trainer',
      format: 1,
      tables: { sessions: [], keystrokes: [{ id: 1 }, { id: 1 }] },
    });
    await expect(importBackup(db, bad)).rejects.toThrow();
    expect(await db.sessions.count()).toBe(1);
  });
});
