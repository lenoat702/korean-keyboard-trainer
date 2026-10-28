import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { playKey, preloadProfile } from '../audio/keySound';
import { EXTRA_KEYS, thumbForSpace, type Thumb } from '../hands/geometry';
import { ROWS } from '../hangul/layout';
import { useSettings } from '../settings';

/** Physical keys whose presses the on-screen hands mirror. */
const TRACKED = new Set<string>([...ROWS.flat().map((d) => d.code), 'Space', ...EXTRA_KEYS]);
/** Keys that click when pressed: everything the hands follow, plus the editing keys. */
const SOUNDED = new Set<string>([...TRACKED, 'Backspace', 'Enter']);
/** A quick tap still shows the finger on its key for at least this long. */
const MIN_HOLD_MS = 150;

/**
 * What the typing screens show and play for physical key presses, separate from what the
 * keys type: held keys for the hands, which thumb took Space, and the key sounds.
 */
export function useKeyFeedback() {
  const { settings } = useSettings();
  const { held, hold, release, releaseAll } = useHeldKeys();
  const [spaceThumb, setSpaceThumb] = useState<Thumb>('R1');
  const lastLetter = useRef<string | undefined>(undefined);
  // Keys we played a press for, so a release only clicks if its press did.
  const sounding = useRef(new Set<string>());

  useEffect(() => {
    if (settings.sound) preloadProfile(settings.soundProfile);
  }, [settings.sound, settings.soundProfile]);

  /** Call from keydown. `thumb` overrides which thumb takes Space this time. */
  const down = (e: KeyboardEvent, thumb?: Thumb) => {
    if (e.repeat) return;
    if (settings.sound && SOUNDED.has(e.code)) {
      playKey(e.code, 'down', settings.soundProfile);
      sounding.current.add(e.code);
    }
    if (!TRACKED.has(e.code)) return;
    if (e.code === 'Space') setSpaceThumb(thumb ?? thumbForSpace(lastLetter.current));
    else if (!e.code.startsWith('Shift')) lastLetter.current = e.code;
    hold(e.code);
  };

  const up = (e: KeyboardEvent) => {
    if (sounding.current.delete(e.code) && settings.sound) playKey(e.code, 'up', settings.soundProfile);
    if (TRACKED.has(e.code)) release(e.code);
  };

  /** Call on blur: key-ups are lost once focus leaves, so don't leave fingers stuck down. */
  const reset = useCallback(() => {
    sounding.current.clear();
    releaseAll();
  }, [releaseAll]);

  return { held, spaceThumb, down, up, reset };
}

/**
 * Keys held down, oldest first. Releases are delayed so even a quick tap shows the
 * finger on its key for MIN_HOLD_MS.
 */
function useHeldKeys() {
  const [held, setHeld] = useState<string[]>([]);
  const downAt = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, number>());

  const clearTimer = (code: string) => {
    window.clearTimeout(timers.current.get(code));
    timers.current.delete(code);
  };

  const hold = useCallback((code: string) => {
    clearTimer(code);
    downAt.current.set(code, performance.now());
    setHeld((h) => [...h.filter((c) => c !== code), code]);
  }, []);

  const release = useCallback((code: string) => {
    const since = downAt.current.get(code);
    const wait = since === undefined ? 0 : Math.max(0, MIN_HOLD_MS - (performance.now() - since));
    clearTimer(code);
    timers.current.set(
      code,
      window.setTimeout(() => {
        timers.current.delete(code);
        setHeld((h) => h.filter((c) => c !== code));
      }, wait),
    );
  }, []);

  const releaseAll = useCallback(() => {
    for (const id of timers.current.values()) window.clearTimeout(id);
    timers.current.clear();
    setHeld([]);
  }, []);

  useEffect(() => releaseAll, [releaseAll]);

  return { held, hold, release, releaseAll };
}
