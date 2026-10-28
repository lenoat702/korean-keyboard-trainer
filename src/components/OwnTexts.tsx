import { useState } from 'react';
import { MAX_OWN_TEXT } from '../engine/ownText';
import type { OwnText } from '../storage/progress';

interface Props {
  texts: readonly OwnText[];
  /** False until stage 10: the panel only says what unlocks it. */
  unlocked: boolean;
  /** Saves a pasted text; resolves to how many characters were left out, or null if nothing was typable. */
  onAdd: (raw: string) => Promise<number | null>;
  onPractise: (text: OwnText) => void;
  onRemove: (id: number) => void;
}

/** Paste your own Korean to practise, and pick up saved texts where you left off. */
export function OwnTexts({ texts, unlocked, onAdd, onPractise, onRemove }: Props) {
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!unlocked) {
    return (
      <section className="own-texts locked">
        <h2>Your own text</h2>
        <p className="quiet">Unlocks at stage 10, free text: paste in anything you want to type.</p>
      </section>
    );
  }

  async function add() {
    setBusy(true);
    try {
      const removed = await onAdd(draft);
      if (removed === null) setNote('Nothing to practise there: paste some Korean text.');
      else {
        setDraft('');
        setNote(removed > 0 ? `Left out ${removed} character${removed > 1 ? 's' : ''} the trainer can't check (letters, quotes, symbols).` : null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="own-texts">
      <h2>Your own text</h2>
      <p className="quiet">
        Paste Korean you'd like to type: a message, a diary entry, a news article. It's split into parts you type in
        order. Hangul, numbers and . , ? ! are kept.
      </p>
      <textarea
        lang="ko"
        rows={3}
        maxLength={MAX_OWN_TEXT * 2}
        placeholder="여기에 붙여 넣으세요…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="own-actions">
        <button className="primary" disabled={busy || draft.trim() === ''} onClick={() => void add()}>
          Save and practise
        </button>
        {note && <span className="quiet">{note}</span>}
      </div>

      {texts.length > 0 && (
        <ul className="own-list">
          {texts.map((t) => (
            <li key={t.id}>
              <span className="own-preview" lang="ko">
                {t.text.length > 40 ? `${t.text.slice(0, 40)}…` : t.text}
              </span>
              <span className="quiet">
                part {t.part + 1} of {t.parts.length}
              </span>
              <button onClick={() => onPractise(t)}>{t.part === 0 ? 'Start' : 'Continue'}</button>
              <button className="link" onClick={() => onRemove(t.id)} aria-label={`Remove ${t.text.slice(0, 20)}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
