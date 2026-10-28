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

/**
 * 'pair' = a "drill this" round from the slowest-pairs list; 'sprint' = the 60-second rank
 * test; 'daily' = the daily challenge; 'falling' = the falling-words game; 'own' = a part of
 * a text you pasted in; 'placement' = one stage of the placement test.
 */
export type SessionMode = 'adaptive' | 'pair' | 'sprint' | 'daily' | 'falling' | 'own' | 'placement';

export interface SessionRow {
  id?: number;
  mode: SessionMode;
  stage: number;
  text: string;
  startedAt: number;
  seconds: number;
  netSpeed: number;
  accuracy: number;
  xp: number;
  /** Correct keystrokes (rounds) or keystrokes in cleared words (falling words). Missing on early rows. */
  correct?: number;
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
  /** Units the placement test credited as ready until they're measured. Missing before it's taken. */
  placed?: string[];
}

export interface SettingsRow {
  id: 'me';
  targetSpeed: number;
  accuracyFloor: number;
  /** Practice minutes a day that count towards the streak. Missing on early rows. */
  dailyGoalMinutes?: number;
}

export interface BadgeRow {
  id: string;
  earnedAt: number;
}

/** The daily challenge text, fixed the first time it's opened that day. */
export interface DailyRow {
  day: string;
  text: string;
}

/** A text you pasted in to practise (stage 10), and how far through it you are. */
export interface OwnTextRow {
  id?: number;
  /** Cleaned: only what the trainer can check. */
  text: string;
  addedAt: number;
  /** The next part to type. */
  part: number;
}

export class TrainerDB extends Dexie {
  keystrokes!: EntityTable<KeystrokeRow, 'id'>;
  sessions!: EntityTable<SessionRow, 'id'>;
  keyStats!: EntityTable<KeyStatRow, 'unit'>;
  progress!: EntityTable<ProgressRow, 'id'>;
  settings!: EntityTable<SettingsRow, 'id'>;
  badges!: EntityTable<BadgeRow, 'id'>;
  daily!: EntityTable<DailyRow, 'day'>;
  texts!: EntityTable<OwnTextRow, 'id'>;

  constructor(name = 'korean-keyboard-trainer') {
    super(name);
    this.version(1).stores({
      keystrokes: '++id, sessionId, time, expected',
      sessions: '++id, startedAt, mode',
      keyStats: 'unit',
      progress: 'id',
      settings: 'id',
    });
    // Phase 4: badges and the daily challenge text.
    this.version(2).stores({
      keystrokes: '++id, sessionId, time, expected',
      sessions: '++id, startedAt, mode',
      keyStats: 'unit',
      progress: 'id',
      settings: 'id',
      badges: 'id',
      daily: 'day',
    });
    // Phase 5: texts you paste in to practise.
    this.version(3).stores({
      keystrokes: '++id, sessionId, time, expected',
      sessions: '++id, startedAt, mode',
      keyStats: 'unit',
      progress: 'id',
      settings: 'id',
      badges: 'id',
      daily: 'day',
      texts: '++id, addedAt',
    });
  }
}
