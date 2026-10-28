import { useRef, useState } from 'react';
import { parseSettings, useSettings } from '../../settings';
import { backupFileName, exportBackup, importBackup, parseBackup, summarizeBackup, type Backup } from '../../storage/backup';
import type { TrainerDB } from '../../storage/db';
import { longDate } from './TrendChart';

interface Props {
  db: TrainerDB;
  /** Called after a restore, to reload everything from the database. */
  onRestored: () => void;
}

/** Download everything as a file, or replace it all from one. */
export function BackupSection({ db, onRestored }: Props) {
  const { settings, update } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const backup = await exportBackup(db, settings);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName(backup.exportedAt);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ text: `Saved ${a.download}.` });
    } catch (e) {
      setMessage({ text: `Couldn't make the backup: ${String(e)}`, bad: true });
    } finally {
      setBusy(false);
    }
  }

  async function pick(file: File) {
    setMessage(null);
    try {
      setPending(parseBackup(JSON.parse(await file.text())));
    } catch (e) {
      setPending(null);
      const text = e instanceof SyntaxError ? "That file isn't a backup: it couldn't be read." : (e as Error).message;
      setMessage({ text, bad: true });
    }
  }

  async function restore(backup: Backup) {
    setBusy(true);
    try {
      await importBackup(db, backup);
      if (backup.prefs !== undefined) update(parseSettings(backup.prefs));
      setPending(null);
      setMessage({ text: 'Progress restored from the backup.' });
      onRestored();
    } catch (e) {
      setMessage({ text: `Couldn't restore: ${String(e)}. Your progress is unchanged.`, bad: true });
    } finally {
      setBusy(false);
    }
  }

  const summary = pending && summarizeBackup(pending);

  return (
    <section className="dash-card backup">
      <h3>Backup</h3>
      <p className="sub">
        Your progress is saved in this browser only. Download a backup to keep it safe or move it to another browser.
      </p>
      <div className="backup-actions">
        <button onClick={() => void download()} disabled={busy}>
          Download backup
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy}>
          Restore from a file…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // so picking the same file again still fires
            if (file) void pick(file);
          }}
        />
      </div>

      {summary && (
        <div className="backup-confirm" role="alert">
          <p>
            Backup from {summary.exportedAt ? longDate(new Date(summary.exportedAt)) : 'an unknown date'}:{' '}
            {summary.sessions.toLocaleString()} rounds, {summary.units} keys unlocked. Restoring replaces everything
            saved here, including today's practice.
          </p>
          <button className="primary danger" onClick={() => void restore(pending!)} disabled={busy}>
            Replace my progress
          </button>
          <button onClick={() => setPending(null)} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
      {message && <p className={message.bad ? 'error' : 'quiet'}>{message.text}</p>}
    </section>
  );
}
