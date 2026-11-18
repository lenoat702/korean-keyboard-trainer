# Korean Keyboard Trainer 두벌식

Learn to touch-type Hangul on the standard 2-set (두벌식) keyboard. The trainer teaches the layout a few keys at a time, adapts each drill to your weakest keys, and measures you the way Korean typing tests do: keystrokes per minute (타/분) at a set accuracy.

It runs in the browser, needs no account, and keeps your progress on your own machine.

## Features

- **Stage-by-stage curriculum.** Ten stages, from the home row (ㅁ ㄴ ㅇ ㄹ · ㅓ ㅏ ㅣ) to compound vowels, double finals, sentences with punctuation and numbers, and free text.
- **Adaptive drills.** Every keystroke is timed. Each round leans on the key or pattern furthest from the targets, and the next key unlocks once every key you have is at **100 타/분 and 95% accuracy** (both adjustable).
- **Placement test.** On first launch, a two-minute test lets you skip the stages you can already type.
- **On-screen keyboard and hands.** Translucent hands show which finger reaches each key, and key colours show how well you know each one.
- **Word meanings.** An English meaning under each practice word, and a translation under each sentence. Turn them off in Settings.
- **Your own text.** From stage 10, paste any Korean text and type through it part by part.
- **Games.** A 60-second sprint (the rank test), falling words, and a daily challenge.
- **Ranks, XP, streaks and badges.** Rank comes only from measured skill (stages passed and sprint scores). XP rewards practice but never raises your rank.
- **Progress screen.** Speed and accuracy trends, a per-key heatmap, your slowest key pairs (with a one-click drill), a practice calendar, and backup and restore.
- **Key sounds.** Nine recorded mechanical switches, or silence.
- **Free type.** A scratchpad for typing anything, with live Hangul assembly.

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer.

```sh
git clone https://github.com/lenoat702/korean-keyboard-trainer.git
cd korean-keyboard-trainer
npm install
npm run dev
```

Then open http://localhost:5173.

**Keep your computer's input language on English.** The trainer reads the physical keys you press and builds the Hangul itself, so a Korean input method would get in the way.

To serve a built copy instead:

```sh
npm run build
npm run preview
```

## How the curriculum works

| Stage | Adds |
| --- | --- |
| 1. Home row | ㅇ ㅏ ㄴ ㅣ ㄹ ㅓ ㅁ |
| 2. Index reaches + first finals | ㅎ ㅗ |
| 3. Top row | ㄱ ㅅ ㅔ ㄷ ㅈ ㅐ ㅂ ㅕ ㅛ ㅑ |
| 4. Bottom row | ㅡ ㅜ ㅊ ㅌ ㅍ ㅋ ㅠ |
| 5. Shift doubles | ㅆ ㄲ ㄸ ㅃ ㅉ ㅖ ㅒ |
| 6. Compound vowels | ㅘ ㅝ ㅢ and the rest, as two keystrokes |
| 7. Double finals | ㄳ ㄺ ㄼ and the rest |
| 8. Words in rhythm | Smooth gaps between words |
| 9. Sentences | . , ? numbers ! |
| 10. Free text | Proverbs, paragraphs and your own text |

Keys unlock one at a time, in that order. A key counts as ready once it has at least 20 presses and its last 50 average 100 타/분 at 95% accuracy. When every unlocked key is ready, the next one unlocks.

Keys you skip in the placement test count as ready until you've pressed each one 20 times. After that, your own numbers decide, like any other key's.

## Your data

Everything is stored in your browser's IndexedDB, including every keystroke with its timing, so any statistic can be recalculated later. Nothing is sent anywhere. Each browser, and each address the app runs on, keeps its own separate progress.

To keep your progress safe or move it to another browser, use **Progress → Backup → Download backup**, and **Restore from a file…** on the other side. A restore replaces everything in one step, so a bad file leaves your progress unchanged.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with live reload |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | Type-check the project |
| `npm run build` | Type-check, then build into `dist/` |
| `npm run preview` | Serve the built copy |

Built with TypeScript, React 18 and Vite. [es-hangul](https://github.com/toss/es-hangul) splits and assembles Hangul, and [Dexie](https://dexie.org/) wraps IndexedDB.

```text
src/
  hangul/    Layout, keystroke sequences, syllable assembly
  engine/    Curriculum, text generator, key stats, ranks, XP, badges, placement test
  storage/   Database, saving and loading progress, backup
  hands/     Hand and finger geometry for the on-screen hands
  audio/     Key sounds
  components/  Screens: practice, games, free type, progress
```

`plan.md` is the original design plan, covering the goals, curriculum, game rules and data model.

## Credits

Key sounds are recordings from [kbsim](https://github.com/tplai/kbsim) by Thomas Lai, used under the MIT licence (see `public/sounds/LICENSE-kbsim.md`).
