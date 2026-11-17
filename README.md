# Palabras Ocultas

A Spanish nine-letter word game designed for a 16:9 classroom whiteboard. It uses plain HTML, CSS and JavaScript and needs no build step.

## Playing

1. Select nine letters with **Consonante** and **Vocal**. Each tile is touch/clickable, so learners can build answers on a whiteboard.
2. Press **Empezar** to start the configurable countdown. The same button pauses, resumes and repeats the timer.
3. Enter a word or tap its letters, then press the tick or Enter. Correct words score their length. Each word scores only once.
4. Use the circular-arrow button for a new round; use the cog to change the duration.

**Spanish spelling:** letter tiles are accent-neutral. A tile `A` can supply `a` or `á`; `E`/`É`, `I`/`Í`, `O`/`Ó`, `U`/`Ú`/`Ü`, and `N`/`Ñ` work the same way. For example, entering `dia` can be accepted as `día`, with the dictionary spelling shown on-screen. The same physical tile cannot be used twice unless the board contains it twice.

## Dictionary and limitations

Validation currently uses the [Datamuse Spanish vocabulary](https://www.datamuse.com/api/) (`v=es`). This is an **online** lookup; an unavailable connection is reported separately and does **not** mark an answer wrong. The lookup first seeks exact words, then Spanish suggestions, then accent/ñ wildcard matches. It can accept common inflected forms; it cannot guarantee every valid Spanish word is included. Teachers should treat contested answers as a dictionary coverage limitation rather than a definitive ruling.

**Service change:** Datamuse's published documentation says it will require API keys from **1 February 2027**. Before that date, plan either a configured API-key proxy (do not expose a private key in client JavaScript) or a locally hosted Spanish lexicon to preserve validation. The game remains usable as a letter-and-timer game without lookups, but checking words will show an availability warning.

## Run and test

Open `index.html` in a current browser or serve the directory from a static web host. No dependencies or build system are needed. Run the dictionary unit tests using Node.js 18 or later:

```sh
node --test tests/dictionary.test.js
```

The design is tuned for a 1920×1080 or 1280×720 landscape display and also rearranges on portrait/narrow screens. The settings dialog, keyboard navigation, prominent focus indicators and reduced-motion preference are supported.
