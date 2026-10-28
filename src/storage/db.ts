import Dexie, { type EntityTable } from 'dexie';

// Tables follow the plan's data model. Keystrokes are kept raw so any stat can be recomputed later.

export interface KeystrokeRow {
  id?: number;
  sessionId: number;
  /** Position in the session's keystroke sequence; with the session text, this recovers what was practised. */
  index: number;
  time: number;
  expected: string;
  typed: string;
  keyCode: string;
  msSincePrev: number | null;
  correct: boolean;
  firstTry: boolean;
}

export interface SessionRow {
  id?: number;
  /** 'pair' = a "drill this" round from the slowest-pairs list. */
  mode: 'adaptive' | 'pair';
  stage: number;
  text: string;
  startedAt: number;
  seconds: number;
  netSpeed: number;
  accuracy: number;
  xp: number;
}

export interface KeyStatRow {
  /** A jamo, or a pattern such as 'compound'. */
  unit: string;
  times: number[];
  results: boolean[];
  stars: number;
}

export interface ProgressRow {
  id: 'me';
  /** Units in the order they unlocked. */
  unlocked: string[];
  stage: number;
}

export interface SettingsRow {
  id: 'me';
  targetSpeed: number;
  accuracyFloor: number;
}

export class TrainerDB extends Dexie {
  keystrokes!: EntityTable<KeystrokeRow, 'id'>;
  sessions!: EntityTable<SessionRow, 'id'>;
  keyStats!: EntityTable<KeyStatRow, 'unit'>;
  progress!: EntityTable<ProgressRow, 'id'>;
  settings!: EntityTable<SettingsRow, 'id'>;

  constructor(name = 'korean-keyboard-trainer') {
    super(name);
    this.version(1).stores({
      keystrokes: '++id, sessionId, time, expected',
      sessions: '++id, startedAt, mode',
      keyStats: 'unit',
      progress: 'id',
      settings: 'id',
    });
  }
}
