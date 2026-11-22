"use strict";

const { foldSpanish, canMakeWord, lookupSpanishWord } = globalThis.PalabrasDictionary;
const { chooseAutoWord, shuffleLetters, findSolutions } = globalThis.PalabrasVocabulary;
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
const autoBtn = byId("auto-btn");
const solveBtn = byId("solve-btn");
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
const guessList = byId("guess-list");
const solutionPanel = byId("solution-panel");
const solutionList = byId("solution-list");
const robotFigure = byId("robot-figure");
const robotBubble = byId("robot-bubble");
const robotMessage = byId("robot-message");
const robotDetail = byId("robot-detail");
const voiceToggle = byId("voice-toggle");
const settingsPanel = byId("settings-panel");
const durationInput = byId("duration-input");
const durationOutput = byId("duration-output");

let selectedLetters = [];
let acceptedWords = new Set();
let autoPicking = false;
let lastAutoWord = "";
let solutionsShown = false;
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

function speakRobot(message) {
  if (!voiceToggle.checked || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  try {
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = "es-ES";
    speech.rate = .96;
    speech.pitch = 1.12;
    const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith("es"));
    if (voice) speech.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  } catch (_) {
    // Visual and accessible speech bubbles always work without audio support.
  }
}

function setFeedback(message, tone = "neutral", detail = "") {
  robotMessage.textContent = message;
  robotDetail.textContent = detail;
  robotBubble.dataset.visible = String(Boolean(message));
  robotBubble.dataset.tone = tone === "success" ? "happy" : tone === "error" ? "sad" : "neutral";
  const mood = tone === "success" ? "happy" : tone === "error" ? "sad" : tone === "checking" ? "thinking" : "idle";
  robotFigure.dataset.mood = "idle";
  void robotFigure.offsetWidth;
  robotFigure.dataset.mood = mood;
  robotFigure.setAttribute("aria-label", message ? `Robot: ${message} ${detail}` : "Robot del juego");
  if (tone === "success" || tone === "error") speakRobot(message);
}

function closeSolutions() {
  solutionsShown = false;
  solutionPanel.hidden = true;
  guessList.hidden = false;
  solveBtn.setAttribute("aria-expanded", "false");
}

function toggleSolutions() {
  if (selectedLetters.length !== maxLetters) return;
  if (solutionsShown) {
    closeSolutions();
    setFeedback("");
    return;
  }
  if (timerState === "running") toggleTimer();
  const solutions = findSolutions(selectedLetters);
  solutionList.replaceChildren();
  for (const {word, score} of solutions) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = word.toLocaleUpperCase("es");
    const length = document.createElement("b");
    length.textContent = String(score);
    length.setAttribute("aria-label", `${score} letras`);
    item.append(label, length);
    solutionList.append(item);
  }
  solutionsShown = true;
  solutionPanel.hidden = false;
  guessList.hidden = true;
  solveBtn.setAttribute("aria-expanded", "true");
  if (!solutions.length) {
    setFeedback("No encuentro palabras", "neutral", "Prueba con otra combinación");
  } else {
    setFeedback("¡A resolver!", "success", `${solutions.length} palabras B1/B2`);
    // Speech bubbles are the primary announcement; voice is optional.
    speakRobot(solutions.map(item => item.word).join(", "));
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function chooseAutomaticLetters() {
  if (autoPicking || selectedLetters.length === maxLetters) return;
  resetRound(); // Auto always generates a fresh nine-letter puzzle.
  autoPicking = true;
  const activeRound = roundId;
  const word = chooseAutoWord(Math.random, lastAutoWord);
  lastAutoWord = word;
  const letters = shuffleLetters(word);
  renderBoard();
  setFeedback("Pensando…", "checking");
  for (const letter of letters) {
    if (roundId !== activeRound) return;
    const button = "AEIOU".includes(letter) ? vowelBtn : consonantBtn;
    button.classList.add("simulated-press");
    await wait(145);
    if (roundId !== activeRound) { button.classList.remove("simulated-press"); return; }
    addLetter(letter);
    button.classList.remove("simulated-press");
    await wait(125);
  }
  if (roundId !== activeRound) return;
  autoPicking = false;
  renderBoard();
  setFeedback("");
}

function renderBoard() {
  const previous = [...board.children];
  board.replaceChildren();
  for (let i = 0; i < maxLetters; i += 1) {
    if (i < selectedLetters.length) {
      const tile = previous[i]?.classList.contains("tile") && previous[i].textContent === selectedLetters[i]
        ? previous[i] : document.createElement("button");
      const isNewTile = !tile.classList.contains("tile");
      tile.type = "button";
      tile.className = "tile";
      tile.textContent = selectedLetters[i];
      tile.dataset.kind = "AEIOU".includes(selectedLetters[i]) ? "vowel" : "consonant";
      tile.title = `Añadir ${selectedLetters[i]} a la palabra`;
      tile.setAttribute("aria-label", `Añadir letra ${selectedLetters[i]}`);
      if (isNewTile) tile.addEventListener("click", () => {
        if (wordInput.disabled || wordInput.value.length >= maxLetters) return;
        closeSolutions();
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
  consonantBtn.disabled = complete || autoPicking;
  vowelBtn.disabled = complete || autoPicking;
  autoBtn.disabled = complete || autoPicking;
  autoBtn.dataset.thinking = String(autoPicking);
  layout.dataset.autopick = String(autoPicking);
  solveBtn.disabled = !complete || autoPicking;
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
    setFeedback("¡Tiempo!", "neutral", "Puedes seguir comprobando palabras");
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


function resetRound() {
  roundId += 1; // Ignore dictionary responses from the previous round.
  validationPending = false;
  autoPicking = false;
  selectedLetters = [];
  acceptedWords = new Set();
  timerState = "ready";
  stopTimer();
  remainingMs = clockDuration * 1000;
  wordInput.value = "";
  guessList.replaceChildren();
  solutionList.replaceChildren();
  closeSolutions();
  consonantBtn.classList.remove("simulated-press");
  vowelBtn.classList.remove("simulated-press");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  renderBoard();
  renderClock();
  setFeedback("");
}

// Keep a newer answer intact if it was typed during an asynchronous lookup.
function clearSubmittedWord(original) {
  if (wordInput.value.trim().normalize("NFC").toLocaleLowerCase("es") === original) {
    wordInput.value = "";
  }
  wordInput.focus();
}

wordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (validationPending || selectedLetters.length !== maxLetters) return;
  const original = wordInput.value.trim().normalize("NFC").toLocaleLowerCase("es");
  if (!original) return;
  if (!/^[a-záéíóúüñ]+$/iu.test(original)) {
    setFeedback("¡Incorrecto!", "error", "Escribe una sola palabra");
    clearSubmittedWord(original);
    return;
  }
  if (!canMakeWord(original, selectedLetters)) {
    setFeedback("¡Incorrecto!", "error", "Letras no disponibles");
    clearSubmittedWord(original);
    return;
  }
  const key = foldSpanish(original);
  if (acceptedWords.has(key)) {
    setFeedback("¡Repetida!", "neutral", "Ya está en la lista");
    clearSubmittedWord(original);
    return;
  }
  const checkingRound = roundId;
  validationPending = true;
  submitBtn.disabled = true;
  setFeedback("Pensando…", "checking");
  const result = await lookupSpanishWord(original);
  if (checkingRound !== roundId) return;
  validationPending = false;
  submitBtn.disabled = false;
  if (result.status === "unavailable") {
    setFeedback("Sin conexión", "neutral", "Inténtalo otra vez");
    return;
  }
  if (result.status !== "valid") {
    setFeedback("¡Incorrecto!", "error", "No aparece en el diccionario");
    clearSubmittedWord(original);
    return;
  }
  const correct = result.word.toLocaleLowerCase("es");
  acceptedWords.add(key);
  addAcceptedWord(correct, original);
  closeSolutions();
  setFeedback("¡Correcto!", "success", correct === original ? "" : correct.toLocaleUpperCase("es"));
  clearSubmittedWord(original);
});

wordInput.addEventListener("input", () => {
  closeSolutions();
  if (!validationPending) setFeedback("");
});
consonantBtn.addEventListener("click", () => addLetter(weightedRandomLetter(consonants, consonantFrequencies)));
vowelBtn.addEventListener("click", () => addLetter(weightedRandomLetter(vowels, vowelFrequencies)));
autoBtn.addEventListener("click", chooseAutomaticLetters);
solveBtn.addEventListener("click", toggleSolutions);
startBtn.addEventListener("click", toggleTimer);
byId("reset-btn").addEventListener("click", resetRound);
byId("settings-toggle").addEventListener("click", () => settingsPanel.showModal());
const fullscreenBtn = byId("fullscreen-btn");
fullscreenBtn.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (_) {
    setFeedback("Pantalla completa", "neutral", "No disponible en este navegador");
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
