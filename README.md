# Palabras Ocultas

A nine-letter Spanish word game designed for interactive classroom whiteboards and 16:9 screens. No JavaScript framework or build step is required.

## Playing

- Choose nine letters with **Consonante** and **Vocal**, or select **Auto**. Auto starts a fresh round and generates a shuffled nine-letter Spanish word from a bank of **600 distinct, nine-letter Spanish words**, frequency-screened against a Spanish subtitle corpus and manually adjusted for classroom suitability. The previous **100 Auto selections** are remembered in the same browser and avoided until the pool needs recycling. Letters appear one by one, with an animated press on the corresponding consonant/vowel control. The source word is not revealed.
- Press **Empezar** for the countdown (pause, resume and replay are available); change the duration (10–120 seconds) from Settings.
- Enter a word using the keyboard or tap the letter tiles, then press the green tick or Enter. Accepted words appear as chips with their **individual word-length score**; there is no running score because this is a group/classroom game.
- The animated SVG robot replaces the old scoreboard and feedback line. It reacts happily with **¡Correcto!**, sadly with **¡Incorrecto!**, and also reports duplicates, dictionary outages and timer expiry. The speech bubble remains readable even if speech synthesis is unavailable.
- The robot can also **speak Spanish aloud** using the browser's speech synthesis API. This is enabled by default and can be switched off in Settings. Audio availability and voice quality depend on the device/browser's installed voices.
- Choose **Resolver** after nine letters have been selected to reveal five longer, varied words from the local educational vocabulary, with their letter counts. The robot's suggestions appear in the former Consonante/Vocal/Auto row, **separately from pupils' guesses**, in pale blue tiles with dark text and yellow numbers; pupils' answers remain blue with white text and green scores below the entry field. If the timer is running, Resolver pauses it. Tap Resolver again to hide its suggestions.
- New round/reset interrupts Auto safely. Use the fullscreen icon for a classroom projector or whiteboard.

## Spanish spelling and dictionary

Letters are accent-neutral: `A` can make `á`, `N` can make `ñ`, and `U` can make `ü`. The application accepts unaccented input where the Spanish dictionary returns the appropriately accented spelling, showing the canonical form for example `dia` → `día`. Each letter tile can only be used as many times as it appears.

The live answer checker uses [Datamuse Spanish vocabulary](https://www.datamuse.com/api/) (`v=es`). It checks exact spellings, suggestions and wildcard accent/ñ variants. If the dictionary cannot be reached, it retains the typed answer for a retry rather than declaring it wrong.

**Solver scope:** `vocabulary.js` contains approximately **6,426 unique candidate spellings** and **600 nine-letter Auto source words**. The word list combines a hand-selected classroom starter set with frequency-screened Spanish subtitle vocabulary. A small exclusion list removes unsuitable adult terms and unrelated names/English words from Resolver suggestions. Resolver ranks matches by word length, prioritises different word families to avoid near-duplicate plurals/forms, and returns up to five. These are the **highest-scoring diverse matches within this curated bank**, not a mathematically exhaustive list of every Spanish dictionary word. The Auto bank targets familiar B1/B2 topics and frequent Spanish forms, but frequency alone does **not** guarantee a word is B1/B2; it is not an independently CEFR-certified list. Teachers can flag unsuitable entries for further review. Arbitrary manually chosen letter racks may yield fewer than five suggestions. Future expansion can improve coverage.

**Vocabulary provenance:** Expanded vocabulary is derived from [Hermit Dave's FrequencyWords](https://github.com/hermitdave/FrequencyWords) Spanish OpenSubtitles frequency list. Observe the source's CC BY-SA 4.0 attribution and share-alike requirements when reusing this list.

**API notice:** Datamuse's documentation has announced that API keys will be required from 1 February 2027. A proxy or locally hosted Spanish lexicon will be needed to protect any API key. Do not place secret API keys in browser JavaScript.

## Presentation

The game uses a deep navy/blue/cyan gradient, oversized letter tiles, generous spacing, touch-friendly controls, an animated teal robot and a muted creator credit on a seamlessly dark footer. Its robot is an **inline SVG with lightweight CSS animation**, not either of the optional GLB models, so it runs without Three.js/WebGL downloads and stays sharp on whiteboards. Reduced-motion preferences are respected. Portrait screens switch to a stacked board.

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

## Favicon and in-game translations

- The browser favicon is **`favicon.svg`**, a transparent golden tile with the white sparkle from the game logo. The blue background is intentionally absent.
- Click any accepted pupil word or any of the five Resolver words to open a keyboard-operable **translation modal** without leaving the game. The Spanish word remains visible in the heading, and the English translation is displayed below.
- Translations check a reviewed **classroom glossary** first (including `amarilla` → `yellow`, `ruedas` → `wheels` and `cebolla` → `onion`). For other words the app asks the key-free **MyMemory Spanish-to-English API** (`es|en`, machine translation enabled). It prefers unambiguous exact translation-memory matches; when those are absent it **displays the provider’s best-effort translation** with the discreet label **Traducción automática · puede variar según el contexto** and an optional dictionary link. This avoids rejecting ordinary words merely because MyMemory’s match score is low, without falsely labelling a machine guess as verified. If the service fails or returns no usable translation, the modal offers the dictionary link. The selected word (not student personal data) is sent to MyMemory; successful translations are cached per session. Word-level translations, especially conjugations and ambiguous words, cannot be guaranteed correct without context.
- The popup remains minimal: Spanish word, English meaning and close button. Only approximate online results show a short confidence note and a dictionary lookup link.
- The whole game uses **Source Sans 3**, a humanist sans-serif comparable in feel to Aptos. The variable WOFF2 webfont is **self-hosted** at `assets/fonts/SourceSans3-variable.woff2`, loaded via `@font-face` and preloaded by the page. It does not depend on the font being installed on a classroom PC or on third-party font servers. Its SIL Open Font License is in `assets/fonts/OFL.md`. A generic sans-serif is only a fallback for an exceptional font-loading failure. The extra-heavy 900–1000 CSS weights have been reduced to 750–800 to keep the game modern and less chunky. Translations may still be approximate for conjugated verbs and words with several meanings.
