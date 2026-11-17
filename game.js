"use strict";

const { foldSpanish, canMakeWord, lookupSpanishWord } = globalThis.PalabrasDictionary;
const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
const consonantFrequencies = [2, 1, 4, 3, 1, 1, 1, 1, 4, 1, 5, 2, 1, 6, 6, 3, 3, 1, 1, 1, 1];
const vowels = "AEIOU";
const vowelFrequencies = [12, 12, 10, 9, 5];
const maxLetters = 9;
const circumference = 2 * Math.PI * 104;

const byId = (id) => document.getElementById(id);
const layout = byId("game-layout");
const board = byId("letter-board");
const progressLabel = byId("letter-progress");
const phaseHelp = byId("phase-help");
const roundState = byId("round-state");
const consonantBtn = byId("consonant-btn");
const vowelBtn = byId("vowel-btn");
const startBtn = byId("start-btn");
const startLabel = byId("start-label");
const startIconPath = byId("start-icon").querySelector("path");
const clockLabel = byId("clock-label");
const timerOrbit = byId("timer-orbit");
const clockRing = byId("elapsed-ring");
const timerHint = byId("timer-hint");
const durationBadge = byId("duration-badge");
const wordForm = byId("word-form");
const wordInput = byId("word-input");
const submitBtn = byId("submit-btn");
const feedback = byId("feedback");
const guessList = byId("guess-list");
const foundCount = byId("found-count");
const scoreValue = byId("score-value");
const scoreZone = document.querySelector(".score-zone");
const scoreSparkles = byId("score-sparkles");
const settingsPanel = byId("settings-panel");
const durationInput = byId("duration-input");
const durationOutput = byId("duration-output");

let selectedLetters = [];
let acceptedWords = new Set();
let points = 0;
let clockDuration = 30;
let remainingMs = clockDuration * 1000;
let deadline = 0;
let timerFrame = null;
let timerState = "ready"; // ready, running, paused, finished
let validationPending = false;
let roundId = 0;

function weightedRandomLetter(letters, frequencies) {
  const total = frequencies.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < letters.length; i += 1) {
    roll -= frequencies[i];
    if (roll < 0) return letters[i];
  }
  return letters[letters.length - 1];
}

function setFeedback(message, tone = "neutral") {
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}

function renderBoard() {
  board.replaceChildren();
  for (let i = 0; i < maxLetters; i += 1) {
    if (i < selectedLetters.length) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.textContent = selectedLetters[i];
      tile.dataset.kind = "AEIOU".includes(selectedLetters[i]) ? "vowel" : "consonant";
      tile.title = `Añadir ${selectedLetters[i]} a la palabra`;
      tile.setAttribute("aria-label", `Añadir letra ${selectedLetters[i]}`);
      tile.addEventListener("click", () => {
        if (wordInput.disabled || wordInput.value.length >= maxLetters) return;
        wordInput.value += tile.textContent.toLocaleLowerCase("es");
        setFeedback("");
        wordInput.focus();
      });
      board.append(tile);
    } else {
      const empty = document.createElement("div");
      empty.className = "tile-slot";
      empty.setAttribute("aria-hidden", "true");
      board.append(empty);
    }
  }
  const complete = selectedLetters.length === maxLetters;
  consonantBtn.disabled = complete;
  vowelBtn.disabled = complete;
  wordInput.disabled = !complete;
  submitBtn.disabled = !complete || validationPending;
  progressLabel.textContent = `${selectedLetters.length} / ${maxLetters}`;
  layout.dataset.phase = complete ? "playing" : "choosing";
  phaseHelp.textContent = complete ? "¡Listo! Forma palabras con estas letras." : "Elige nueve letras para empezar.";
  updateRoundStatus();
  updateTimerControls();
}

function addLetter(letter) {
  if (selectedLetters.length >= maxLetters) return;
  selectedLetters.push(letter);
  renderBoard();
  if (selectedLetters.length === maxLetters) setFeedback("");
}

function updateRoundStatus() {
  if (selectedLetters.length < maxLetters) roundState.textContent = "Preparar ronda";
  else if (timerState === "running") roundState.textContent = "En marcha";
  else if (timerState === "paused") roundState.textContent = "En pausa";
  else if (timerState === "finished") roundState.textContent = "¡Tiempo!";
  else roundState.textContent = "Listo para jugar";
}

function renderClock() {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  clockLabel.textContent = String(seconds);
  const fraction = Math.max(0, Math.min(1, remainingMs / (clockDuration * 1000)));
  clockRing.style.strokeDasharray = String(circumference);
  clockRing.style.strokeDashoffset = String(circumference * (1 - fraction));
  timerOrbit.classList.toggle("urgent", seconds <= 5 && timerState !== "ready");
  durationBadge.textContent = `${clockDuration} s`;
}

function updateTimerControls() {
  startBtn.disabled = selectedLetters.length !== maxLetters;
  const label = timerState === "running" ? "Pausar" : timerState === "paused" ? "Continuar" : timerState === "finished" ? "Repetir" : "Empezar";
  startLabel.textContent = label;
  startIconPath.setAttribute("d", timerState === "running" ? "M9 5v14M15 5v14" : timerState === "finished" ? "M4 11a8 8 0 1 1 2 5.4M4 5v6h6" : "m9 5 11 7-11 7V5Z");
  timerHint.textContent = selectedLetters.length < maxLetters ? "Completa las nueve letras." : timerState === "running" ? "¡Encuentra la palabra más larga!" : timerState === "paused" ? "Reloj en pausa." : timerState === "finished" ? "Se acabó el tiempo." : "Pulsa Empezar cuando quieras.";
  updateRoundStatus();
}

function stopTimer() {
  if (timerFrame !== null) cancelAnimationFrame(timerFrame);
  timerFrame = null;
}

function tick(now) {
  if (timerState !== "running") return;
  remainingMs = Math.max(0, deadline - now);
  renderClock();
  if (remainingMs === 0) {
    timerState = "finished";
    timerFrame = null;
    updateTimerControls();
    setFeedback("¡Tiempo! Puedes seguir comprobando las respuestas.");
    return;
  }
  timerFrame = requestAnimationFrame(tick);
}

function toggleTimer() {
  if (selectedLetters.length < maxLetters) return;
  if (timerState === "running") {
    remainingMs = Math.max(0, deadline - performance.now());
    stopTimer();
    timerState = "paused";
    renderClock();
  } else {
    if (timerState === "finished" || timerState === "ready") remainingMs = clockDuration * 1000;
    timerState = "running";
    deadline = performance.now() + remainingMs;
    stopTimer();
    timerFrame = requestAnimationFrame(tick);
  }
  updateTimerControls();
}

function updateScore() {
  foundCount.textContent = `${acceptedWords.size} ${acceptedWords.size === 1 ? "palabra" : "palabras"}`;
  scoreValue.textContent = String(points);
}

function addAcceptedWord(word, original) {
  const item = document.createElement("li");
  item.className = "guess-item";
  const name = document.createElement("strong");
  name.textContent = word.toLocaleUpperCase("es");
  const score = document.createElement("span");
  score.className = "guess-score";
  score.textContent = `+${Array.from(word).length}`;
  item.append(name, score);
  if (word.toLocaleLowerCase("es") !== original.toLocaleLowerCase("es")) {
    const corrected = document.createElement("small");
    corrected.textContent = `Corrección: ${original.toLocaleUpperCase("es")} → ${word.toLocaleUpperCase("es")}`;
    item.append(corrected);
  }
  guessList.prepend(item);
}


function celebrateScore() {
  scoreZone.classList.remove("score-bump");
  void scoreZone.offsetWidth;
  scoreZone.classList.add("score-bump");
  scoreSparkles.replaceChildren();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 9; i += 1) {
    const sparkle = document.createElement("span");
    const angle = (i / 9) * Math.PI * 2;
    sparkle.style.setProperty("--dx", `${Math.cos(angle) * (50 + (i % 3) * 18)}px`);
    sparkle.style.setProperty("--dy", `${Math.sin(angle) * (50 + (i % 3) * 18)}px`);
    scoreSparkles.append(sparkle);
  }
  setTimeout(() => scoreSparkles.replaceChildren(), 850);
}

function resetRound() {
  roundId += 1; // Ignore dictionary responses from the previous round.
  validationPending = false;
  selectedLetters = [];
  acceptedWords = new Set();
  points = 0;
  timerState = "ready";
  stopTimer();
  remainingMs = clockDuration * 1000;
  wordInput.value = "";
  guessList.replaceChildren();
  scoreSparkles.replaceChildren();
  scoreZone.classList.remove("score-bump");
  renderBoard();
  renderClock();
  updateScore();
  setFeedback("");
}

wordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (validationPending || selectedLetters.length !== maxLetters) return;
  const original = wordInput.value.trim().normalize("NFC").toLocaleLowerCase("es");
  if (!original) return;
  if (!/^[a-záéíóúüñ]+$/iu.test(original)) {
    setFeedback("Utiliza una sola palabra, sin espacios ni signos.", "warning");
    return;
  }
  if (!canMakeWord(original, selectedLetters)) {
    setFeedback("Esa palabra utiliza letras que no están disponibles.", "warning");
    return;
  }
  const key = foldSpanish(original);
  if (acceptedWords.has(key)) {
    setFeedback("Esa palabra ya está en la lista.", "warning");
    return;
  }
  const checkingRound = roundId;
  validationPending = true;
  submitBtn.disabled = true;
  setFeedback("Consultando el diccionario…");
  const result = await lookupSpanishWord(original);
  if (checkingRound !== roundId) return;
  validationPending = false;
  submitBtn.disabled = false;
  if (result.status === "unavailable") {
    setFeedback("No se puede consultar el diccionario. Inténtalo de nuevo; no se ha penalizado la palabra.", "warning");
    return;
  }
  if (result.status !== "valid") {
    setFeedback("No hemos encontrado esa palabra en el diccionario.", "error");
    return;
  }
  const correct = result.word.toLocaleLowerCase("es");
  acceptedWords.add(key);
  points += Array.from(correct).length;
  addAcceptedWord(correct, original);
  updateScore();
  celebrateScore();
  setFeedback(correct === original ? `¡Correcto! ${correct.toLocaleUpperCase("es")}` : `¡Correcto! La forma escrita es ${correct.toLocaleUpperCase("es")}.`, "success");
  if (wordInput.value.trim().toLocaleLowerCase("es") === original) wordInput.value = "";
  wordInput.focus();
});

wordInput.addEventListener("input", () => {
  if (!validationPending) setFeedback("");
});
consonantBtn.addEventListener("click", () => addLetter(weightedRandomLetter(consonants, consonantFrequencies)));
vowelBtn.addEventListener("click", () => addLetter(weightedRandomLetter(vowels, vowelFrequencies)));
startBtn.addEventListener("click", toggleTimer);
byId("reset-btn").addEventListener("click", resetRound);
byId("settings-toggle").addEventListener("click", () => settingsPanel.showModal());
const fullscreenBtn = byId("fullscreen-btn");
fullscreenBtn.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (_) {
    setFeedback("Pantalla completa no disponible en este navegador.", "warning");
  }
});
document.addEventListener("fullscreenchange", () => {
  const fullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.setAttribute("aria-label", fullscreen ? "Salir de pantalla completa" : "Pantalla completa");
  fullscreenBtn.title = fullscreen ? "Salir de pantalla completa" : "Pantalla completa";
});
byId("close-settings").addEventListener("click", () => settingsPanel.close());
settingsPanel.addEventListener("click", (event) => { if (event.target === settingsPanel) settingsPanel.close(); });
durationInput.addEventListener("input", () => {
  clockDuration = Number(durationInput.value);
  durationOutput.textContent = `${clockDuration} s`;
  stopTimer();
  timerState = "ready";
  remainingMs = clockDuration * 1000;
  renderClock();
  updateTimerControls();
});

resetRound();
