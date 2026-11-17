# Palabras Ocultas

A Spanish nine-letter word game for a classroom interactive whiteboard. It runs directly in modern browsers and requires no framework or build step.

## How to play

- Tap **Consonante** and **Vocal** until the nine letter slots are full. Vowels are gold; consonants are white. The two selection buttons disappear as soon as the board is full.
- Press **Empezar** to begin the countdown. The same button pauses, resumes and replays the clock. Use the cog in the top-right corner to set a duration between 10 and 120 seconds.
- Type a word or tap its letters, then press the large tick or Enter. Valid answers score one point for every letter. A word can score only once per round.
- The star and score show total points; accepted words appear as small chips below the answer field. Use the circular arrow for a new round and the fullscreen icon to fill the projector/whiteboard.

**Spanish spelling:** tile letters are accent-neutral. `A` also allows `á`, `N` also allows `ñ`, and so on. For example, `dia` can be accepted as `día`: the correct dictionary spelling appears on screen and scores normally. Letter multiplicity is still enforced; a tile cannot be reused unless it appears multiple times.

## Classroom display and UX

The layout is designed around a **16:9 landscape screen**, tested at **1920×1080**, **1600×900** and **1280×720** with no scrolling. Its simplified three-part composition deliberately avoids decorative cards, instructional headings and unused UI: large nine-letter board in the centre, two bold letter selection buttons that disappear after selection, and a clean lower play dock for countdown, answers and points. The deep navy/blue/cyan gradient is contrasted with vivid white, gold, mint and lime game pieces.

Small screens and portrait devices use a stacked 3×3 board with the timer, score and answer controls below. Focus indicators, labels for icon-only buttons, a native settings dialog, touch targets and reduced-motion preference are supported.

## Dictionary and limitations

Validation uses the external [Datamuse Spanish vocabulary](https://www.datamuse.com/api/) (`v=es`) via `dictionary.js`. The app seeks exact words, then suggestions, then accent/ñ wildcard matches. If the service is unavailable, the app reports an outage **without** marking an answer incorrect. Some genuine forms may still be missing from the vocabulary; check disputed answers with a teacher.

**Service change:** Datamuse's published API documentation says it will require API keys from **1 February 2027**. Plan a configured API-key proxy or locally hosted Spanish lexicon before then. Do **not** embed private API keys in browser JavaScript.

## Testing

Node.js 18 or later:

```sh
node --check game.js
node --check dictionary.js
node --test tests/dictionary.test.js
```

Interactive Chromium checks have covered selecting letters, timer start/pause/resume, settings, reset, accent-corrected scoring, duplicate prevention and letter-pool constraints. Visual screenshots have been reviewed at the screen resolutions above and a 390px portrait viewport.
