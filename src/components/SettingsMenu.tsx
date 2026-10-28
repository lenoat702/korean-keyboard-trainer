import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { previewProfile, SOUND_PROFILES } from '../audio/keySound';
import { SKIN_GRADIENT, skinAt } from '../hands/skin';
import { useSettings } from '../settings';

const GROUPS = ['Linear', 'Tactile', 'Clicky'] as const;

/** The gear button in the header and its dropdown of display and sound settings. */
export function SettingsMenu() {
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Where focus was before opening (usually the typing area), to hand it back on close.
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = () => {
    setOpen(false);
    returnFocus.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // A click elsewhere closes the menu and lands wherever it was aimed, so focus isn't restored.
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      returnFocus.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tone = skinAt(settings.skin);
  const sliderStyle = { '--track': SKIN_GRADIENT, '--thumb': tone.base } as CSSProperties;

  return (
    <div className="settings" ref={rootRef}>
      <button
        className={`settings-button ${open ? 'open' : ''}`}
        aria-expanded={open}
        aria-controls="settings-panel"
        // Read on mousedown, before the button itself takes focus.
        onMouseDown={() => {
          if (!open) returnFocus.current = document.activeElement as HTMLElement | null;
        }}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <GearIcon />
        Settings
      </button>

      {open && (
        <div className="settings-panel" id="settings-panel" role="group" aria-label="Settings">
          <p className="settings-heading">Hands</p>
          <label className="setting">
            <input type="checkbox" checked={settings.showHands} onChange={(e) => update({ showHands: e.target.checked })} />
            Show hands
          </label>
          <label className={`setting setting-column ${settings.showHands ? '' : 'disabled'}`}>
            Skin tone
            <input
              className="skin-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(settings.skin * 100)}
              disabled={!settings.showHands}
              style={sliderStyle}
              onChange={(e) => update({ skin: Number(e.target.value) / 100 })}
            />
          </label>

          <p className="settings-heading">Sound</p>
          <label className={`setting setting-column ${settings.sound ? '' : 'disabled'}`}>
            Switch sound
            <select
              value={settings.soundProfile}
              disabled={!settings.sound}
              onChange={(e) => {
                update({ soundProfile: e.target.value });
                void previewProfile(e.target.value);
              }}
            >
              {GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {SOUND_PROFILES.filter((p) => p.group === group).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="setting">
            <input type="checkbox" checked={!settings.sound} onChange={(e) => update({ sound: !e.target.checked })} />
            Mute key sounds
          </label>
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
