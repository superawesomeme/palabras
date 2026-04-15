const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
const consonantFrequencies = [2, 1, 4, 3, 1, 1, 1, 1, 4, 1, 5, 2, 1, 6, 6, 3, 3, 1, 1, 1, 1];
const vowels = "AEIOU";
const vowelFrequencies = [12, 12, 10, 9, 5];

const maxLetters = 9;
let selectedLetters = [];
let clockDuration = 30;
let timeLeft = clockDuration;
let countdownId = null;
let isRunning = false;
let startTime = null;
let lastSecond = null;
let guesses = [];

const letterBoard = document.getElementById("letter-board");
const consonantBtn = document.getElementById("consonant-btn");
const vowelBtn = document.getElementById("vowel-btn");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const wordForm = document.getElementById("word-form");
const wordInput = document.getElementById("word-input");
const guessList = document.getElementById("guess-list");
const submitBtn = document.getElementById("submit-btn");
const clockLabel = document.getElementById("clock-label");
const clockHand = document.getElementById("clock-hand");
const elapsedRing = document.getElementById("elapsed-ring");
const clockSvg = document.getElementById("clock-svg");
const dotsGroup = document.getElementById("clock-dots");
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const closeSettings = document.getElementById("close-settings");
const durationInput = document.getElementById("duration-input");
const durationOutput = document.getElementById("duration-output");

function weightedRandomLetter(letters, frequencies) {
  const total = frequencies.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < letters.length; i += 1) {
    roll -= frequencies[i];
    if (roll < 0) {
      return letters[i];
    }
  }
  return letters[letters.length - 1];
}

function addLetter(letter) {
  if (selectedLetters.length >= maxLetters) return;
  selectedLetters.push(letter);
  const tile = document.createElement("div");
  tile.className = "tile pop-in";
  tile.textContent = letter;
  tile.style.cursor = "pointer";
  tile.addEventListener("click", () => {
    wordInput.value += letter.toLowerCase();
    setSubmitState("Comprobar");
  });
  letterBoard.appendChild(tile);
  setTimeout(() => tile.classList.remove("pop-in"), 430);
  if (selectedLetters.length >= maxLetters) {
    consonantBtn.disabled = true;
    vowelBtn.disabled = true;
  }
}

function normalizeAccents(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ñÑ]/g, (match) => (match === "ñ" ? "n" : "N"))
    .replace(/[üÜ]/g, (match) => (match === "ü" ? "u" : "U"));
}

function usesOnlyAvailableLetters(word, availableLetters) {
  const normalizedWord = normalizeAccents(word.toUpperCase()).split("");
  const normalizedPool = availableLetters.map((letter) => normalizeAccents(letter.toUpperCase()));
  const pool = [...normalizedPool];

  for (const letter of normalizedWord) {
    const idx = pool.indexOf(letter);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  return true;
}

async function isValidSpanishWord(word) {
  try {
    const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&v=es&md=d&max=1`;
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    return data.length > 0 && data[0].word?.toLowerCase() === word.toLowerCase();
  } catch (error) {
    return false;
  }
}

function setSubmitState(text, className = "") {
  submitBtn.textContent = text;
  submitBtn.classList.remove("correct", "incorrect", "bad");
  if (className) submitBtn.classList.add(className);
}

function triggerShake() {
  document.body.classList.remove("shake");
  void document.body.offsetWidth;
  document.body.classList.add("shake");
  setTimeout(() => document.body.classList.remove("shake"), 500);
}

function addGuessToList(word, correct) {
  const score = correct ? word.length : 0;
  const guess = {
    word: word.toUpperCase(),
    correct,
    score
  };
  guesses.push(guess);

  const item = document.createElement("li");
  item.textContent = `${guess.correct ? "✅" : "❌"} ${guess.word} — ${guess.score} pts`;
  guessList.appendChild(item);
}

function createCircleDots() {
  dotsGroup.innerHTML = "";
  const radius = 102;
  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2;
    const x = 120 + Math.cos(angle) * radius;
    const y = 120 + Math.sin(angle) * radius;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x.toFixed(2));
    dot.setAttribute("cy", y.toFixed(2));
    dot.setAttribute("r", i % 5 === 0 ? "2.7" : "1.45");
    dot.setAttribute("fill", "rgba(255,255,255,0.78)");
    dotsGroup.appendChild(dot);
  }
}

function updateClockHand(progress) {
  const angle = progress * 360;
  clockHand.style.transform = `rotate(${angle}deg)`;
}

function updateElapsedSector(progress) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  elapsedRing.style.strokeDasharray = `${circumference}`;
  elapsedRing.style.strokeDashoffset = `${circumference * (1 - progress)}`;
}

function updateClockLabel(seconds) {
  clockLabel.textContent = `${seconds}s`;
}

function resetClockDisplay() {
  timeLeft = clockDuration;
  lastSecond = timeLeft;
  updateClockLabel(timeLeft);
  updateClockHand(0);
  updateElapsedSector(0);
}

function countdown() {
  if (!isRunning) return;
  const progress = Math.min(1, (Date.now() - startTime) / (clockDuration * 1000));
  const secondsLeft = Math.max(0, Math.ceil(clockDuration * (1 - progress)));
  timeLeft = secondsLeft;

  if (secondsLeft !== lastSecond) {
    lastSecond = secondsLeft;
    updateClockLabel(secondsLeft);
    startBtn.textContent = `${secondsLeft}s`;
  }

  updateClockHand(progress);
  updateElapsedSector(progress);

  if (progress >= 1) {
    cancelAnimationFrame(countdownId);
    countdownId = null;
    isRunning = false;
    startBtn.textContent = "¡Tiempo!";
    clockSvg.classList.add("timeout-glow");
    wordInput.focus();
    return;
  }

  countdownId = requestAnimationFrame(countdown);
}

function startCountdown() {
  if (isRunning || selectedLetters.length !== maxLetters) return;
  clockSvg.classList.remove("timeout-glow");
  isRunning = true;
  startTime = Date.now();
  timeLeft = clockDuration;
  lastSecond = timeLeft;
  startBtn.textContent = `${timeLeft}s`;
  updateClockLabel(timeLeft);
  updateClockHand(0);
  updateElapsedSector(0);
  cancelAnimationFrame(countdownId);
  countdownId = requestAnimationFrame(countdown);
}

function toggleSettings(open) {
  settingsPanel.classList.toggle("open", open);
  settingsPanel.setAttribute("aria-hidden", String(!open));
}

consonantBtn.addEventListener("click", () => addLetter(weightedRandomLetter(consonants, consonantFrequencies)));
vowelBtn.addEventListener("click", () => addLetter(weightedRandomLetter(vowels, vowelFrequencies)));
startBtn.addEventListener("click", startCountdown);
resetBtn.addEventListener("click", () => {
  selectedLetters = [];
  guesses = [];
  letterBoard.innerHTML = "";
  guessList.innerHTML = "";
  consonantBtn.disabled = false;
  vowelBtn.disabled = false;
  cancelAnimationFrame(countdownId);
  countdownId = null;
  isRunning = false;
  startTime = null;
  startBtn.textContent = "Inicio";
  clockSvg.classList.remove("timeout-glow");
  resetClockDisplay();
  wordInput.value = "";
  setSubmitState("Comprobar");
});
settingsToggle.addEventListener("click", () => toggleSettings(true));
closeSettings.addEventListener("click", () => toggleSettings(false));

durationInput.addEventListener("input", () => {
  clockDuration = Number(durationInput.value);
  durationOutput.textContent = `${clockDuration}s`;
  cancelAnimationFrame(countdownId);
  countdownId = null;
  isRunning = false;
  startTime = null;
  startBtn.textContent = "Inicio";
  clockSvg.classList.remove("timeout-glow");
  resetClockDisplay();
});

wordInput.addEventListener("input", () => setSubmitState("Comprobar"));

wordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const word = wordInput.value.trim();
  if (!word) return;

  if (!usesOnlyAvailableLetters(word, selectedLetters)) {
    setSubmitState("¡Letras inválidas!", "bad");
    triggerShake();
    return;
  }

  const validWord = await isValidSpanishWord(word);
  if (validWord) {
    setSubmitState("¡Palabra válida!", "correct");
  } else {
    setSubmitState("¡Palabra inválida!", "incorrect");
    triggerShake();
  }

  addGuessToList(word, validWord);
});

createCircleDots();
resetClockDisplay();
