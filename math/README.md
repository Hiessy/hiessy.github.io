# Space Academy

A browser game for kids to practice math and letter recognition. No build step,
no dependencies — open `index.html` in any browser, or run `python serve.py`
from the project root (serves this folder at http://localhost:8123 with caching
disabled so edits always show up on reload).

## Game modes

- **🅰️ ABC Astronaut** — "what letter comes next?" sequences, 3 tap choices.
- **🚀 Math Cadet** — addition up to 10 (kindergarten).
- **🪐 Galaxy Ranger** — addition & subtraction up to 20 (1st/2nd grade).
- **👑 Universe Master** — + − × ÷ with bigger numbers (division always comes out even).

Extras: English/Spanish toggle, a side-view pixel-art street scene (night
skyline, brick wall with graffiti, streetlamp) where a human-proportioned
player on the left sinks a shot on the right for every correct answer — the
sport alternates between basketball and soccer on each rank-up. Streak effects
escalate: 3 in a row = fireball, 5 = the net burns off, 7 = fire + lightning,
and a perfect level (no misses between rank-ups) earns an explosion. Every
rank-up rewards a BONUS ROUND mini-game: tap the court when the sweeping bar
is green to take 3 shots, +2 points per make. Past the
first rank, a missed math answer keeps the same question for retry.
Also: progress bar that fills toward the next rank (resets on rank-up),
streak counter with score bonuses,
question difficulty that grows with rank (single digits → 20s → 30s → 50s → 99s),
a 30-step visual story that advances as you score, badge ranks with fanfare,
synthesized sound effects and background music (Web Audio, no audio files),
animated star background, on-screen numpad plus keyboard support.

## File layout

| File | What it contains |
|---|---|
| `index.html` | Markup only: start screen + game screen |
| `css/style.css` | All styling, animations, and mode show/hide rules |
| `js/translations.js` | EN/ES strings and the language toggle |
| `js/audio.js` | `playSound(type)` — synthesized click/correct/wrong/badge sounds |
| `js/music.js` | Synthesized background music loop + 🎵/🔇 toggle |
| `js/stories.js` | Story data (icon + EN/ES caption per step) — see "Creating a story" |
| `js/court.js` | Side-view street scene: urban background, sprites, fire tiers, explosion, bonus mini-game |
| `js/sheets.js` | Sprite-sheet loader/slicer — reads `assets/sheet_*.png`, falls back to pixel maps if absent |
| `assets/` | Drop AI-generated sprite sheets here (see `assets/README.md`) |
| `js/stars.js` | Self-contained background star field animation |
| `js/game.js` | Game state, question generation, difficulty scaling, basketball court, story, keyboard |

Script load order matters: `translations.js`, `audio.js`, `music.js`, and
`stories.js` define globals used by `game.js`, so keep them first in `index.html`.

## Creating a new story

Stories live in `js/stories.js`. Copy the `astronaut` object, give it a new key,
and write ~30 steps of `{ icon, en, es }` (one emoji + a short caption in both
languages). `pointsPerStep` sets the pacing — with 5, a 30-step story finishes
right at the 150-point Legend rank. Point `ACTIVE_STORY` at your new story to
play it.

## Difficulty scaling

The mission you pick decides *which* operations appear (mission 1: `+`,
mission 2: `+ −`, mission 3: `+ − × ÷`). Your current rank decides *how big*
the numbers are, via `TIER_MAX` in `js/game.js`: 9 → 12 → 20 → 30 → 50 → 99.

## Archive

`archive/` holds the older self-contained prototypes this game grew from
(`math_wiz.html` → `space_ranger_academy.html` → `full_game.html`). They are
kept for reference only and have known bugs that are fixed in the current
version (broken audio in `full_game.html`, a wrong-answer crash in
`space_ranger_academy.html`).
