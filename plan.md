# Korean Keyboard Trainer — App Plan

Oct 28, 2026 · @Leno

## Goal

The app gets you touch-typing Hangul on the standard 2-set layout (두벌식, Dubeolsik) without looking at the keys. Progress is measured the way Korean typing tests measure it: keystrokes per minute (타/분) at a set accuracy.

| Milestone | What it means | Target |
| --- | --- | --- |
| Map learned | Every key found without looking | All 33 jamo inputs unlocked |
| Usable | Short messages without strain | 100 타/분 at 95% accuracy |
| Comfortable | Everyday chat, search, forms | 200 타/분 at 96% accuracy |
| Fluent | Work-ready typing | 300 타/분 at 97% accuracy |

Targets are defaults you can change in settings. The 300 mark matches a commonly cited average on the Korean word-processor exam ([brunch guide](https://brunch.co.kr/@aideveloper/43)). Scope for v1 is a physical keyboard on a laptop or desktop; phone keypads such as 천지인 work differently and are left out.

## How the layout works

The layout splits cleanly by hand: consonants sit under the left hand, vowels under the right, so most syllables alternate hands. That alternation is why 2-set typing gets fast, and the curriculum leans on it.

- **Home row:** left fingers rest on ㅁ ㄴ ㅇ ㄹ (A S D F), right fingers on ㅓ ㅏ ㅣ (J K L). The bumps on F and J mark ㄹ and ㅓ.
- **Shift doubles five consonants:** ㅂ→ㅃ, ㅈ→ㅉ, ㄷ→ㄸ, ㄱ→ㄲ, ㅅ→ㅆ. It also turns ㅐ→ㅒ and ㅔ→ㅖ. That gives 33 distinct jamo inputs.
- **Syllables are typed in reading order:** 한 = ㅎ ㅏ ㄴ. The input method stacks the jamo into a block for you.
- **Compound vowels are two keystrokes:** ㅘ = ㅗ+ㅏ, ㅝ = ㅜ+ㅓ, ㅢ = ㅡ+ㅣ (seven in all).
- **Double finals are two keystrokes too:** 닭 = ㄷ ㅏ ㄹ ㄱ.
- **The jumping final (도깨비불):** after typing 간, the ㄴ looks like a final. If a vowel comes next, ㄴ jumps to start the next syllable: 간 + ㅏ → 가나. Beginners stall here, so it gets its own lesson.

**Consonants sit under the left hand, vowels under the right.** Standard 2-set (두벌식) layout; ㅠ on B is the one vowel on the left.

```text
         LEFT HAND · consonants                    RIGHT HAND · vowels
┌──────┬──────┬──────┬──────┬──────╥──────┬──────┬──────┬──────┬──────┐
│Q   ㅃ│W   ㅉ│E   ㄸ│R   ㄲ│T   ㅆ║Y     │U     │I     │O   ㅒ│P   ㅖ│
│  ㅂ  │  ㅈ  │  ㄷ  │  ㄱ  │  ㅅ  ║  ㅛ  │  ㅕ  │  ㅑ  │  ㅐ  │  ㅔ  │
└──────┴──────┴──────┴──────┴──────╨──────┴──────┴──────┴──────┴──────┘
   ┌──────┬──────┬──────┬──────┬──────╥──────┬──────┬──────┬──────┐
   │A     │S     │D     │F     │G     ║H     │J     │K     │L     │
   │  ㅁ  │  ㄴ  │  ㅇ  │  ㄹ  │  ㅎ  ║  ㅗ  │  ㅓ  │  ㅏ  │  ㅣ  │
   └──────┴──────┴──────┴──══──┴──────╨──────┴──══──┴──────┴──────┘
      ┌──────┬──────┬──────┬──────┬──────╥──────┬──────┐
      │Z     │X     │C     │V     │B     ║N     │M     │
      │  ㅋ  │  ㅌ  │  ㅊ  │  ㅍ  │  ㅠ  ║  ㅜ  │  ㅡ  │
      └──────┴──────┴──────┴──────┴──────╨──────┴──────┘

Q   ㅃ  = Latin key, top left · Shift character, top right   ║ = hand split   ══ = bump on F and J
```

Read each key as: Latin letter top left, jamo in the middle, Shift character top right. The Latin letters matter if your keyboard has no Korean labels.

## Teaching principles

The core method is adaptive, keystroke-level practice in the style of [keybr](https://github.com/aradzie/keybr.com): start with a few keys, time every keystroke, drill the weakest ones, and add a key only when the current set is at target speed. Everything else supports that loop.

| Principle | What the app does | Basis |
| --- | --- | --- |
| Touch-type from day one | On-screen keyboard shows the key and finger; your hands are never the reference. Hints fade per key as it is mastered. | Home position on ㄹ/ㅓ bumps, eyes on screen ([brunch guide](https://brunch.co.kr/@aideveloper/43)) |
| Few keys at a time | Begin with home-row keys; unlock the next key only when every unlocked key reaches target speed | [keybr](https://github.com/aradzie/keybr.com) |
| Drill the weakest keys | Every keystroke is timed; generated drills over-sample slow or error-prone keys and key pairs | [keybr](https://github.com/aradzie/keybr.com) |
| Accuracy before speed | Unlocks and ranks require an accuracy floor (95%+); optional stop-on-error mode | Same guide puts accuracy ahead of speed ([brunch guide](https://brunch.co.kr/@aideveloper/43)) |
| Short daily sessions | Default goal is 10–15 minutes a day in 1-minute rounds; streaks reward days practiced, not hours | One hour a day was the most efficient schedule in Baddeley's Post Office typing study ([summary](https://theemotionallearner.com/2021/04/06/learning-the-importance-of-timing/)) |
| Make slow gains visible | Dashboard leads with weekly trends, not today's score | In that study, the most efficient group felt it was learning slowest ([summary](https://theemotionallearner.com/2021/04/06/learning-the-importance-of-timing/)) |
| Real Korean early | Move from jamo drills to real syllables and common words within the first two stages | Common typing-tutor practice |
| Instant feedback | Each keystroke flashes right or wrong; errors are logged per key and per key pair | Common typing-tutor practice |

## Curriculum

Ten stages take you from the home row to free text, and keys unlock one at a time inside each stage. A new key joins only when every unlocked key averages at least 100 타/분 (about 600 ms per press) at 95% accuracy over its last 50 presses. A stage ends with a 1-minute test on its keys.

| Stage | New keys | Sample practice (only unlocked keys) |
| --- | --- | --- |
| 1. Home row | ㅁ ㄴ ㅇ ㄹ · ㅓ ㅏ ㅣ | 아 이 나 라 마 어 |
| 2. Index reaches + first finals | ㅎ ㅗ; finals ㄴ ㅇ ㄹ ㅁ; the jumping final | 엄마, 언니, 할머니, 나라 |
| 3. Top row | ㅂ ㅈ ㄷ ㄱ ㅅ · ㅛ ㅕ ㅑ ㅐ ㅔ | 가방, 사랑, 학교, 안녕, 선생님 |
| 4. Bottom row | ㅋ ㅌ ㅊ ㅍ · ㅠ ㅜ ㅡ | 커피, 친구, 우유, 하늘, 컴퓨터 |
| 5. Shift doubles | ㅃ ㅉ ㄸ ㄲ ㅆ · ㅒ ㅖ | 빵, 딸기, 있다, 얘기, 예쁘다 |
| 6. Compound vowels | ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ | 과자, 왜, 회사, 뭐, 귀, 의사 |
| 7. Double finals | ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ | 닭, 앉다, 많다, 읽다, 없다 |
| 8. Words in rhythm | High-frequency word lists | Timed word streams |
| 9. Sentences | Space, punctuation, numbers | 안녕하세요. 만나서 반갑습니다. |
| 10. Free text | Everything | Proverbs, short paragraphs, text you paste in |

A 2-minute placement test on first launch lets you skip stages you can already pass. Stage 2 brings finals in early on purpose: ㄴ ㅇ ㄹ ㅁ are already under your fingers, and real words need them.

## Gamification

Rank comes only from measured skill; XP rewards showing up but never raises rank. That split keeps the game honest: you can't grind your way to a higher title, and you're still rewarded on slow days.

### Skill model

- **Key mastery (0–5 stars):** each key's speed and accuracy over its last 50 presses. Shown as colour on the on-screen keyboard.
- **Skill rating:** net 타/분 on the 1-minute rank test, counted only at or above that rank's accuracy floor. Rank uses your best 3 of the last 10 tests, so one bad day doesn't drop you.

| Rank | Requirement |
| --- | --- |
| 새싹 Sprout | Stage 1 passed |
| 잎새 Leaf | Stage 4 passed (every unshifted key) |
| 꽃 Bloom | All 33 inputs unlocked + 100 타/분 at 95% |
| 나무 Tree | 150 타/분 at 96% |
| 숲 Forest | 200 타/분 at 96% |
| 산 Mountain | 300 타/분 at 97% |
| 하늘 Sky | 400 타/분 at 97% |

### Adaptive difficulty

- Drills are mostly mastered keys, with the newest or weakest key weighted 2–3× so it appears in most words.
- When you hit your speed target, it moves up 10%.
- Game speed is tuned to your rating so you clear roughly 70–80% of rounds: hard enough to stretch, easy enough to keep playing.

### Rewards

- **XP:** points per correct keystroke, a bonus for rounds at 97%+ accuracy, nothing for rounds under 85%. Mashing fast doesn't pay.
- **Daily goal and streak:** a streak counts days you met your goal (default 10 minutes), with one free skip per week.
- **Badges:** first syllable, home row cleared, each stage cleared, 7- and 30-day streaks, first zero-error sentence, new personal best.

### Game modes

| Mode | How it plays | Unlocks at |
| --- | --- | --- |
| Adaptive practice | The core drill loop | Start |
| Daily challenge | Same text all day; compare against your earlier days | Sprout |
| Falling words | Words drop from the top; type each before it lands. The classic Korean typing-tutor game format | Leaf |
| Sprint | 60 seconds for top net speed; doubles as the rank test | Leaf |
| Ghost race | Race a replay of your own best run | Bloom |
| Perfect run | One sentence, zero errors; a single slip restarts it | Bloom |

## Progress tracking

Every keystroke is stored raw, so any stat can be recomputed later; the dashboard leads with weekly trends. Each keystroke record holds: time, expected jamo, typed jamo, physical key, milliseconds since the previous press, right or wrong, session and mode.

| Metric | How it's computed | Shown in |
| --- | --- | --- |
| Net speed (타/분) | Correct jamo keystrokes ÷ minutes. Shift isn't counted; ㅘ and 닭's ㄺ count as two. | Trend chart, rank test |
| Accuracy (%) | Correct first tries ÷ all first tries | Trend chart, every round |
| Key mastery | Speed and accuracy over each key's last 50 presses | Keyboard heatmap |
| Key-pair speed | Median time between two specific keys, e.g. ㄴ→ㅏ | Slowest-pairs list, drill targeting |
| Practice time | Minutes per day with active typing | Practice calendar, streak |
| Personal bests | Top score per mode | Records list, ghost race |

### Views

- **Trend:** speed and accuracy per day with a 7-day average line.
- **Keyboard heatmap:** the layout coloured by key mastery, weakest keys obvious at a glance.
- **Slowest pairs:** the 10 slowest key transitions, each with a "drill this" button.
- **Practice calendar:** one square per day, shaded by minutes.
- **Forecast:** sessions left to the next rank, projected from your recent trend (keybr does a similar lesson forecast).
- **Weekly card:** minutes practiced, speed change, keys unlocked, streak.

Other Korean typing tests may count 타수 differently, so compare scores inside the app. Export and import (JSON) cover backups and moving devices.

## Screens

Seven screens cover the app; the practice screen is where you spend most of your time, so it gets the most care.

| Screen | What it shows | Main actions |
| --- | --- | --- |
| Home | Rank badge, streak, today's goal ring, next key to unlock | Continue practice, start daily challenge |
| Practice | Target line; your input coloured per jamo; on-screen keyboard with next key and finger lit (fades with mastery); live speed, accuracy, round timer | Type, pause, restart round |
| Round summary | Speed, accuracy, XP, keys that improved, any key unlocked, slowest pair | Next round, drill slowest pair |
| Lesson map | Stages 1–10 as a path, stars per stage | Jump to an unlocked stage, retake a stage test |
| Games | Mode cards; locked ones show what unlocks them | Start a mode |
| Progress | Trend chart, keyboard heatmap, slowest pairs, calendar, forecast | Change date range, drill a weak key |
| Settings | Target speed, accuracy floor, daily goal, hint level, stop-on-error, sound, theme | Export or import data, reset progress |

## Technical design

The one decision that shapes everything: read physical keys and assemble Hangul in the app, instead of relying on the operating system's Korean input method. It works with the OS left in English, gives every press its own timestamp, and avoids IME composition events, which bundle keystrokes and behave differently across browsers.

**Every keystroke feeds the stats that choose your next drill.** Data flow behind the practice screen; all of it runs in your browser.

```text
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ Key capture         │──▶│ 2-set map           │──▶│ Checker             │──▶│ Display             │
│ keydown listener    │   │ physical key +      │   │ typed vs expected   │   │ es-hangul assemble  │
│ reads event.code    │   │ Shift to one jamo   │   │ jamo, timed in ms   │   │ rebuilds syllables  │
└─────────────────────┘   └─────────────────────┘   └─────┬───────────────┘   └─────────────────────┘
                                                          │         ▲
                                                          │         └────────────────────┐
                                         every keystroke  │           expected jamo      │
                                                          │                              │
                                                          ▼                              │
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ╔══════════╧══════════╗
│ Dashboard + games   │◀──│ Stats engine        │◀──│ Local database      │   ║ Drill generator     ║
│ trends, heatmap     │   │ key mastery, pair   │   │ IndexedDB (Dexie)   │   ║ picks the next text ║
│ rank, XP, streak    │   │ speed, skill rating │   │ keystrokes, sessions│   ║ splits it into jamo ║
└─────────────────────┘   └──────────┬──────────┘   └─────────────────────┘   ╚═════════════════════╝
                                     │                                                   ▲
                                     └───────────── weak keys + unlocked set ────────────┘
```

The top row turns a keypress into a checked jamo on screen; the bottom row logs it, updates your stats, and loops back to choose what you type next.

### Key decisions

1. **Key capture.** The practice area is a focusable element, not a text box. A `keydown` listener reads `event.code` (for example `KeyK`) plus Shift and maps it to a jamo through a 2-set lookup table.
2. **Expected sequence.** Target text is split into jamo with [es-hangul](https://github.com/toss/es-hangul)'s `disassemble`, so 과 becomes ㄱ ㅗ ㅏ. Each keystroke is checked against the next expected jamo.
3. **Display.** The typed jamo are rebuilt into syllables with es-hangul's `assemble` after every press, which handles compound vowels and the jumping final. Backspace removes one jamo, like a real input method. Edge cases (ㅢ, double finals, a jumping double final) get unit tests.
4. **Storage.** Keystroke logs outgrow `localStorage` quickly, so data lives in IndexedDB through the Dexie library. No server in v1; everything stays in your browser, with JSON export for backup.
5. **Stack.** TypeScript, React and Vite: widely used, with plenty of beginner material. Hosted free as a static site and installable as an offline web app (PWA).

For reference, a Hangul syllable's Unicode code point comes from its three parts (initial 0–18, vowel 0–20, final 0–27, where 0 means no final):

```latex
\text{code} = \text{0xAC00} + (\text{initial} \times 21 + \text{vowel}) \times 28 + \text{final}
```

### Data model

| Store | Fields |
| --- | --- |
| keystrokes | id, sessionId, time, expected, typed, keyCode, msSincePrev, correct |
| sessions | id, mode, stage, startedAt, seconds, netSpeed, accuracy, xp |
| keyStats | jamo, last 50 times, last 50 results, stars |
| progress | unlockedKeys, stage, rank, xpTotal, streak, lastPracticeDay |
| achievements | badgeId, earnedAt |
| settings | targetSpeed, accuracyFloor, dailyGoal, hintLevel, stopOnError, sound, theme |

## Build plan

Five phases, each ending in an app you can actually use, so you're practising Korean while it's still being built. Phase 1 is small enough to be a good first coding project.

1. **Core typing loop.** Key capture, the 2-set map, jamo-by-jamo checking, live display, on-screen keyboard with the next key lit, fixed drills for stages 1–2, speed and accuracy per round.
   - Done when: you can run a stage 1 round and see your score.
2. **Adaptive engine and saving.** Per-key stats, the unlock rule, the drill generator weighted to weak keys, IndexedDB storage, stages 1–7.
   - Done when: keys unlock on their own and progress survives a page reload.
3. **Progress dashboard.** Trend chart, keyboard heatmap, slowest pairs, practice calendar.
   - Done when: a week of practice shows up as a trend.
4. **Game layer.** Ranks, XP, daily goal and streak, badges, sprint (rank test), falling words, daily challenge.
   - Done when: a sprint result moves your rank.
5. **Polish.** Stages 8–10 text, ghost race, perfect run, placement test, offline install, export and import, sound and themes.
   - Done when: you'd recommend it to another learner.

## Open decisions

- [ ] Build it yourself as a learning project, or have Claude build Phase 1 and you extend it?
- [ ] Which Korean word-frequency list to draw practice words from.
- [ ] Interface in English, Korean, or both; romanization hints on or off.
- [ ] Show an English meaning under each practice word, so typing doubles as vocabulary?
- [ ] Local-only for good, or add an account later to sync devices?
- [ ] Confirm the starting per-key target of 100 타/분.

## Sources

- [keybr.com README](https://github.com/aradzie/keybr.com): adaptive unlock and weak-key method
- [Learning: the importance of timing](https://theemotionallearner.com/2021/04/06/learning-the-importance-of-timing/): Baddeley's Post Office typing study
- [PC업무, 문자입력, 마우스 사용법](https://brunch.co.kr/@aideveloper/43): home position, accuracy first, 300 타/분 exam average
- [es-hangul](https://github.com/toss/es-hangul): Hangul assemble and disassemble library
