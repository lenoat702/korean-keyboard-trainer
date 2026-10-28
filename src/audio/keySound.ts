// Mechanical-keyboard sounds for key presses and releases, from short recordings of real
// switches in public/sounds (from kbsim by Thomas Lai, MIT licence).

export type KeyAction = 'down' | 'up';

export interface SoundProfileInfo {
  /** Folder name under public/sounds. */
  id: string;
  label: string;
  group: 'Linear' | 'Tactile' | 'Clicky';
  /** False when the switch has no own recordings for Space, Enter and Backspace. */
  bigKeys?: false;
}

export const SOUND_PROFILES: readonly SoundProfileInfo[] = [
  { id: 'cream', label: 'NovelKeys Cream', group: 'Linear' },
  { id: 'alpaca', label: 'Alpaca', group: 'Linear' },
  { id: 'redink', label: 'Gateron Red Ink', group: 'Linear' },
  { id: 'turquoise', label: 'Turquoise Tealios', group: 'Linear' },
  { id: 'mxblack', label: 'Cherry MX Black', group: 'Linear' },
  { id: 'holypanda', label: 'Holy Panda', group: 'Tactile' },
  { id: 'mxbrown', label: 'Cherry MX Brown', group: 'Tactile' },
  { id: 'mxblue', label: 'Cherry MX Blue', group: 'Clicky', bigKeys: false },
  { id: 'bluealps', label: 'SKCM Blue Alps', group: 'Clicky' },
];
export type SoundProfile = string;
export const DEFAULT_PROFILE: SoundProfile = 'cream';

export function isSoundProfile(v: unknown): v is SoundProfile {
  return SOUND_PROFILES.some((p) => p.id === v);
}

/** Overall loudness: kept faint so it sits under the typing rather than over it. */
const VOLUME = 0.5;
/**
 * Every switch's home-row press is scaled to this peak, so changing switch doesn't change
 * the volume (a Blue Alps is far louder than a Tealio). It's the Cream recording's own level.
 */
const TARGET_PEAK = 0.116;
/** No single recording plays louder than this peak (Cream's Space bar), so big keys can't spike. */
const MAX_PEAK = 0.356;

let ctx: AudioContext | null = null;
let out: GainNode | null = null;

/** Plays the sound for one key. The audio context is created on the first key press. */
export function playKey(code: string, action: KeyAction, profile: SoundProfile): void {
  const c = context();
  if (!c || !out) return;
  const set = loaded.get(profile);
  if (!set) {
    void loadProfile(c, profile);
    return;
  }
  const buf = (action === 'down' ? set.press : set.release).get(sampleName(code, action, hasBigKeys(profile)));
  if (buf) playBuffer(c, out, buf, Math.min(set.gain, MAX_PEAK / (set.peaks.get(buf) || 1)), Math.random());
}

/** Plays one press and release, so a profile can be heard when it's picked in Settings. */
export async function previewProfile(profile: SoundProfile): Promise<void> {
  const c = context();
  if (!c) return;
  await loadProfile(c, profile);
  playKey('KeyJ', 'down', profile);
  window.setTimeout(() => playKey('KeyJ', 'up', profile), 110);
}

/** Starts fetching a profile's samples so the first key press isn't silent. */
export function preloadProfile(profile: SoundProfile): void {
  const c = context(false);
  if (c) void loadProfile(c, profile);
}

function context(resume = true): AudioContext | null {
  if (!ctx) {
    if (typeof AudioContext === 'undefined') return null;
    ctx = new AudioContext({ latencyHint: 'interactive' });
    out = ctx.createGain();
    out.gain.value = VOLUME;
    out.connect(ctx.destination);
  }
  // Browsers start audio suspended until a user gesture; a key press counts.
  if (resume && ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// File names in public/sounds/<profile>/press and /release.
const ROW_FILES = ['generic_r1', 'generic_r2', 'generic_r3'];
const BIG_FILES = ['space', 'enter', 'backspace'];

interface SampleSet {
  press: Map<string, AudioBuffer>;
  release: Map<string, AudioBuffer>;
  /** Loudness correction for this switch, towards TARGET_PEAK. */
  gain: number;
  peaks: Map<AudioBuffer, number>;
}

const loaded = new Map<SoundProfile, SampleSet>();
const loading = new Map<SoundProfile, Promise<void>>();

const hasBigKeys = (profile: SoundProfile) => SOUND_PROFILES.find((p) => p.id === profile)?.bigKeys !== false;

function loadProfile(c: AudioContext, profile: SoundProfile): Promise<void> {
  const pending = loading.get(profile);
  if (pending) return pending;
  const big = hasBigKeys(profile) ? BIG_FILES : [];
  const press = new Map<string, AudioBuffer>();
  const release = new Map<string, AudioBuffer>();
  const fetchInto = async (map: Map<string, AudioBuffer>, dir: string, name: string) => {
    const r = await fetch(`${import.meta.env.BASE_URL}sounds/${profile}/${dir}/${name}.mp3`);
    if (!r.ok) throw new Error(`${r.status} ${r.url}`);
    map.set(name, await c.decodeAudioData(await r.arrayBuffer()));
  };
  const p = Promise.all([
    ...[...ROW_FILES, ...big].map((n) => fetchInto(press, 'press', n)),
    ...['generic', ...big].map((n) => fetchInto(release, 'release', n)),
  ]).then(
    () => {
      // Matched on an ordinary home-row key, the sound heard most; big keys keep their own relative weight.
      const peaks = new Map([...press.values(), ...release.values()].map((b) => [b, peakOf(b)]));
      const peak = peaks.get(press.get('generic_r2')!) ?? 0;
      loaded.set(profile, { press, release, peaks, gain: peak > 0 ? Math.min(4, TARGET_PEAK / peak) : 1 });
    },
    () => {
      loading.delete(profile); // allow a retry on the next press
    },
  );
  loading.set(profile, p);
  return p;
}

/**
 * Which recording a key uses: its own for Space, Enter and Backspace (when the switch has
 * them), otherwise one per keyboard row on press and a shared one on release.
 */
export function sampleName(code: string, action: KeyAction, bigKeys = true): string {
  const special = bigKeys ? { Space: 'space', Enter: 'enter', Backspace: 'backspace' }[code] : undefined;
  if (special) return special;
  if (action === 'up') return 'generic';
  if (/^Key[QWERTYUIOP]$/.test(code)) return 'generic_r1';
  if (/^Key[ASDFGHJKL]$/.test(code) || code === 'Semicolon') return 'generic_r2';
  return 'generic_r3'; // bottom row, Shift, and the big keys of switches without their own
}

function peakOf(buf: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    for (const v of buf.getChannelData(ch)) peak = Math.max(peak, Math.abs(v));
  }
  return peak;
}

/** Plays a sample with a touch of random pitch and level, so repeats don't sound copy-pasted. */
function playBuffer(c: AudioContext, dest: AudioNode, buf: AudioBuffer, gain: number, rand: number): void {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.96 + rand * 0.08;
  const g = c.createGain();
  g.gain.value = gain * (0.85 + rand * 0.15);
  src.connect(g).connect(dest);
  src.start();
}
