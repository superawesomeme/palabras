# Palabras Ocultas

A nine-letter Spanish word game designed for interactive classroom whiteboards and 16:9 screens. No JavaScript framework or build step is required.

## Playing

- Choose nine letters with **Consonante** and **Vocal**, or select **Auto**. Auto starts a fresh round and generates a shuffled nine-letter Spanish word from a hand-curated set of 600 nine-letter, frequency-screened, classroom-oriented words. Letters appear one by one, with an animated press on the corresponding consonant/vowel control. The source word is not revealed. The 100 most recently selected Auto words are remembered in the same browser between lessons (where local storage is available) to prevent immediate repetition.
- Press **Empezar** for the countdown (pause, resume and replay are available); change the duration (10–120 seconds) from Settings.
- Enter a word using the keyboard or tap the letter tiles, then press the green tick or Enter. Accepted words appear as chips with their **individual word-length score**; there is no running score because this is a group/classroom game.
- The animated SVG robot replaces the old scoreboard and feedback line. It reacts happily with **¡Correcto!**, sadly with **¡Incorrecto!**, and also reports duplicates, dictionary outages and timer expiry. The speech bubble remains readable even if speech synthesis is unavailable.
- The robot can also **speak Spanish aloud** using the browser's speech synthesis API. This is enabled by default and can be switched off in Settings. Audio availability and voice quality depend on the device/browser's installed voices.
- Choose **Resolver** after nine letters have been selected to reveal five longer, varied words from the local educational vocabulary, with their letter counts. If the timer is running, revealing the answers pauses it. Tap Resolver again to hide the robot's suggestions. Learners' accepted words remain visible in their own area throughout. Robot answers appear in the former Consonante/Vocal/Auto row, on pale muted-blue tiles with dark-blue words and yellow scores. Starting another guess also hides the suggestions.
- New round/reset interrupts Auto safely. Use the fullscreen icon for a classroom projector or whiteboard.

## Spanish spelling and dictionary

Letters are accent-neutral: `A` can make `á`, `N` can make `ñ`, and `U` can make `ü`. The application accepts unaccented input where the Spanish dictionary returns the appropriately accented spelling, showing the canonical form for example `dia` → `día`. Each letter tile can only be used as many times as it appears.

The live answer checker uses [Datamuse Spanish vocabulary](https://www.datamuse.com/api/) (`v=es`). It checks exact spellings, suggestions and wildcard accent/ñ variants. If the dictionary cannot be reached, it retains the typed answer for a retry rather than declaring it wrong.

**Solver scope:** `vocabulary.js` contains an offline, manually selected educational vocabulary of approximately 6,400 unique spellings and 600 nine-letter source words. Resolver ranks matches by word length, prioritises different word families to avoid near-duplicate plurals/forms, and returns up to five. These are the **highest-scoring diverse matches within this frequency-screened educational bank**, not a mathematically exhaustive list of every Spanish dictionary word. Words are chosen to be useful for B1/B2 learning; the list has not been independently CEFR-certified or individually dictionary-verified. Arbitrary manually chosen letter racks may yield fewer than five suggestions. Future expansion can improve coverage.

**API notice:** Datamuse's documentation has announced that API keys will be required from 1 February 2027. A proxy or locally hosted Spanish lexicon will be needed to protect any API key. Do not place secret API keys in browser JavaScript.

## Presentation

The robot's pale-blue suggestions occupy the former selection-button space, leaving the pupils' original blue answer chips visible. The game uses a deep navy/blue/cyan gradient, oversized letter tiles, generous spacing, touch-friendly controls, an animated teal robot and a muted creator credit on a seamlessly dark footer. Its robot is an **inline SVG with lightweight CSS animation**, not either of the optional GLB models, so it runs without Three.js/WebGL downloads and stays sharp on whiteboards. Reduced-motion preferences are respected. Portrait screens switch to a stacked board.

## Tests

Run Node 22+ checks:

```sh
node --check game.js
node --check dictionary.js
node --check vocabulary.js
node --test tests/dictionary.test.js tests/vocabulary.test.js
```

For browser regression testing, install Playwright and its Chromium browser, then run:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/ui.cjs
```

GitHub Actions runs both suites and uploads screenshots of whiteboard, laptop and portrait viewports on each push/PR.

## Vocabulary provenance and licence

The 600-word Auto rotation contains the existing 24 manually selected nine-letter Spanish seeds plus **576 further words selected from a high-frequency Spanish corpus**, using automated length/letter checks, correction of known accent errors and exclusion of names and unsuitable examples. The larger offline solver bank also draws on the **Spanish OpenSubtitles2018 frequency data** from [Hermit Dave's FrequencyWords](https://github.com/hermitdave/FrequencyWords).

The original frequency-list **content** is licensed under **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)** (the upstream MIT licence covers code). Attribution and modifications are documented in [VOCABULARY-ATTRIBUTION.md](./VOCABULARY-ATTRIBUTION.md). The application does not retrieve the corpus at runtime.

**Frequency is not a CEFR certification**: despite selecting high-frequency and familiar candidates, no 600-word list can guarantee that every learner at B1 knows every form. Teacher review is advised when selecting puzzle material and evaluating disputed answers.
