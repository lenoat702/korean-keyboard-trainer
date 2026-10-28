import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PROFILE, isSoundProfile, type SoundProfile } from './audio/keySound';
import { LEGACY_TONES } from './hands/skin';

// Display and sound preferences. They're per-browser conveniences, so they live in
// localStorage rather than in the progress database.

export interface Settings {
  showHands: boolean;
  /** Skin tone along the light (0) to dark (1) scale. */
  skin: number;
  /** Key sounds on (false = muted). */
  sound: boolean;
  soundProfile: SoundProfile;
}

export const DEFAULT_SETTINGS: Settings = { showHands: true, skin: 0.25, sound: true, soundProfile: DEFAULT_PROFILE };
const STORAGE_KEY = 'kkt.settings';

interface SettingsValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsValue>({ settings: DEFAULT_SETTINGS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage blocked (e.g. private window): the change still applies for this visit.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return parseSettings(JSON.parse(raw));
    // Earlier versions stored these as separate keys.
    const legacySkin = LEGACY_TONES[localStorage.getItem('kkt.skin') ?? ''];
    return {
      ...DEFAULT_SETTINGS,
      showHands: localStorage.getItem('kkt.showHands') !== 'false',
      skin: legacySkin ?? DEFAULT_SETTINGS.skin,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Keeps only well-typed fields, so a hand-edited or outdated value can't break the app. */
export function parseSettings(v: unknown): Settings {
  const o = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  return {
    showHands: typeof o.showHands === 'boolean' ? o.showHands : DEFAULT_SETTINGS.showHands,
    skin: typeof o.skin === 'number' && o.skin >= 0 && o.skin <= 1 ? o.skin : DEFAULT_SETTINGS.skin,
    sound: typeof o.sound === 'boolean' ? o.sound : DEFAULT_SETTINGS.sound,
    // Unknown values (including the retired 'synth') fall back to the default switch.
    soundProfile: isSoundProfile(o.soundProfile) ? o.soundProfile : DEFAULT_SETTINGS.soundProfile,
  };
}
