const test = require("node:test");
const assert = require("node:assert/strict");
const {AUTO_WORDS, WORDS, fold, canBuild, shuffleLetters, chooseAutoWord, findSolutions} = require("../vocabulary.js");

test("every auto seed is an accessible nine-letter word", () => {
  assert.equal(AUTO_WORDS.length, 600);
  for (const word of AUTO_WORDS) {
    assert.match(word, /^[a-záéíóúüñ]+$/i, word);
    assert.equal([...fold(word)].length, 9, word);
    assert.ok(canBuild(word, [...fold(word)]), word);
  }
});

test("shuffling does not add or lose letter tiles, including accents and ñ", () => {
  for (const word of AUTO_WORDS) {
    const tiles = shuffleLetters(word, () => .28);
    assert.equal(tiles.length, 9);
    assert.deepEqual(tiles.slice().sort(), [...fold(word).toUpperCase()].sort());
  }
  assert.equal(canBuild("compañero", [..."COMPANERO"]), true);
  assert.equal(canBuild("compañero", [..."COMPANERO".replace("O", "")]), false);
});

test("Auto respects a hundred recently used words across lessons", () => {
  const recent = AUTO_WORDS.slice(0, 100);
  for (const p of [0, .2, .5, .99]) {
    const next = chooseAutoWord(() => p, recent);
    assert.ok(!recent.includes(next));
  }
  assert.equal(new Set(AUTO_WORDS.map(fold)).size, 600);
});

test("Auto avoids repeating the immediately previous word", () => {
  for (const word of AUTO_WORDS) {
    const next = chooseAutoWord(() => .55, word);
    assert.notEqual(next, word);
    assert.ok(AUTO_WORDS.includes(next));
  }
});

test("Resolver returns five high-scoring familiar words for each Auto rack", () => {
  for (const seed of AUTO_WORDS) {
    const tiles = shuffleLetters(seed, () => .42);
    const suggestions = findSolutions(tiles);
    assert.equal(suggestions.length, 5, seed);
    assert.equal(new Set(suggestions.map(item => fold(item.word))).size, 5);
    for (const item of suggestions) {
      assert.ok(canBuild(item.word, tiles), seed + ": " + item.word);
      assert.equal(item.score, [...item.word].length);
      assert.ok(item.score <= 9);
    }
    assert.ok(suggestions.some(item => item.score === 9), seed);
    assert.ok(suggestions.every((item, i) => !i || item.score <= suggestions[i - 1].score), seed);
  }
});

test("Resolver handles arbitrary or empty racks safely", () => {
  assert.deepEqual(findSolutions([]), []);
  assert.deepEqual(findSolutions([..."ZZZZZZZZZ"]), []);
  assert.equal(canBuild("casa", [..."CSA"]), false);
  assert.equal(canBuild("día", [..."DIA"]), true);
  assert.ok(WORDS.length >= 500);
});
