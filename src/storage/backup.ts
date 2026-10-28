import type { TrainerDB } from './db';

// Progress lives only in this browser, so a backup file is the way to keep it safe or move it.
// A backup holds every table as it is, plus the display and sound preferences.

const APP = 'korean-keyboard-trainer';
const FORMAT = 1;

export interface Backup {
  app: typeof APP;
  format: number;
  exportedAt: number;
  tables: Record<string, unknown[]>;
  /** Display and sound preferences from localStorage, as stored. */
  prefs?: unknown;
}

/** What a backup holds, to show before replacing anything. */
export interface BackupSummary {
  exportedAt: number;
  sessions: number;
  keystrokes: number;
  units: number;
}

export async function exportBackup(db: TrainerDB, prefs?: unknown, now = Date.now()): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) tables[table.name] = await table.toArray();
  });
  return { app: APP, format: FORMAT, exportedAt: now, tables, prefs };
}

export function backupFileName(exportedAt: number): string {
  const d = new Date(exportedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `korean-keyboard-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Checks a parsed file is one of our backups. Throws a message fit to show if it isn't. */
export function parseBackup(value: unknown): Backup {
  const o = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  if (!o || o.app !== APP) throw new Error("This file isn't a Korean Keyboard Trainer backup.");
  if (typeof o.format !== 'number' || o.format > FORMAT) {
    throw new Error('This backup comes from a newer version of the trainer. Update the app, then try again.');
  }
  const tables = o.tables;
  if (typeof tables !== 'object' || tables === null) throw new Error('This backup is damaged: it has no data.');
  for (const [name, rows] of Object.entries(tables)) {
    if (!Array.isArray(rows) || rows.some((r) => typeof r !== 'object' || r === null)) {
      throw new Error(`This backup is damaged: the ${name} data isn't readable.`);
    }
  }
  return {
    app: APP,
    format: o.format,
    exportedAt: typeof o.exportedAt === 'number' ? o.exportedAt : 0,
    tables: tables as Record<string, unknown[]>,
    prefs: o.prefs,
  };
}

export function summarizeBackup(b: Backup): BackupSummary {
  return {
    exportedAt: b.exportedAt,
    sessions: b.tables.sessions?.length ?? 0,
    keystrokes: b.tables.keystrokes?.length ?? 0,
    units: b.tables.progress?.length ? ((b.tables.progress[0] as { unlocked?: unknown[] }).unlocked?.length ?? 0) : 0,
  };
}

/**
 * Replaces everything saved with the backup, all at once: if anything fails, nothing changes.
 * Tables the backup doesn't have (it's from an older version) end up empty.
 */
export async function importBackup(db: TrainerDB, backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      const rows = backup.tables[table.name];
      if (rows?.length) await table.bulkAdd(rows);
    }
  });
}
