const test = require("node:test");
const assert = require("node:assert/strict");
const {translateWord, dictionaryUrl, selectVerifiedMatch} = require("../translation.js");

function mockResponse(data, ok = true) {
  return {ok, json: async () => data};
}
function exact(word, translation, options = {}) {
  return {responseStatus: 200, responseData: {translatedText: translation, match: 1},
    matches: [{segment: word, translation, match: 1, quality: 80}], ...options};
}

test("amarilla/amarillas and other gendered colours always give the correct English colour", async () => {
  const noNetwork = () => {throw new Error("Verified words must not call an unreliable API");};
  for (const [word, expected] of Object.entries({
    amarillo: "yellow", amarilla: "yellow", amarillos: "yellow", amarillas: "yellow",
    roja: "red", rojos: "red", blancas: "white", verdes: "green",
    azules: "blue", marrones: "brown", cebolla: "onion", cebollas: "onions",
    día: "day", días: "days", rosa: "pink / rose"
  })) {
    assert.equal(await translateWord(word, noNetwork), expected, word);
  }
});

test("Correctly encodes accented Spanish and uses exact Spanish-to-English matches", async () => {
  let url;
  const result = await translateWord("árboles", async request => {
    url = new URL(request);
    return mockResponse(exact("árboles", "trees"));
  });
  assert.equal(result, "trees");
  assert.equal(url.searchParams.get("q"), "árboles");
  assert.equal(url.searchParams.get("langpair"), "es|en");
  assert.equal(dictionaryUrl("año"), "https://www.spanishdict.com/translate/a%C3%B1o");
});

test("A matching human dictionary segment beats an unrelated top-level response", async () => {
  const data = exact("montaña", "mountain");
  data.responseData = {translatedText: "onion", match: 0.4};
  data.matches.push({segment: "cebolla amarilla", translation: "yellow onion", match: 0.75, quality: 90});
  assert.equal(selectVerifiedMatch("montaña", data), "mountain");
});

test("Rejects misleading, low-confidence and unrelated API responses", async () => {
  const unrelated = exact("cebolla amarilla", "yellow onion");
  assert.equal(selectVerifiedMatch("morning", unrelated), null);
  const low = {responseStatus: 200, responseData: {translatedText: "onion", match: 0.5}, matches: []};
  assert.equal(selectVerifiedMatch("paloma", low), null);
  const unknownScore = {responseStatus: 200, responseData: {translatedText: "guess"}};
  assert.equal(selectVerifiedMatch("paloma", unknownScore), null);
  const unrelatedPrimary = exact("otra palabra", "word");
  unrelatedPrimary.responseData = {translatedText: "something", match: 1};
  assert.equal(selectVerifiedMatch("paloma", unrelatedPrimary), null);
  await assert.rejects(() => translateWord("paloma", async () => mockResponse(low)), /reliable/);
});

test("Ambiguous exact matches do not select an arbitrary meaning", async () => {
  const ambiguous = exact("banco", "bank");
  ambiguous.matches.push({segment: "banco", translation: "bench", match: 1, quality: 80});
  assert.equal(selectVerifiedMatch("banco", ambiguous), null);
});

test("High-confidence standalone responses can still be used when no memory matches are returned", () => {
  assert.equal(selectVerifiedMatch("guitarra", {
    responseStatus: 200, responseData: {translatedText: "guitar", match: 1}, matches: []
  }), "guitar");
  assert.equal(selectVerifiedMatch("guitarra", {
    responseStatus: 200, responseData: {translatedText: "guessed", match: 0.98}, matches: []
  }), null);
});

test("Caches only successful external translations", async () => {
  let count = 0;
  const fetcher = async () => {
    count += 1;
    return mockResponse(exact("casa", "house"));
  };
  assert.equal(await translateWord("casa", fetcher), "house");
  assert.equal(await translateWord(" CASA ", fetcher), "house");
  assert.equal(count, 1);
});

test("Rejects unsupported input, warnings, failed services and unverified translations", async () => {
  await assert.rejects(() => translateWord("<script>", async () => mockResponse({})), /Invalid word/);
  await assert.rejects(() => translateWord("perro", async () => mockResponse({}, false)), /unavailable/);
  await assert.rejects(() => translateWord("gato", async () => mockResponse({responseStatus: 403, responseData: {translatedText: "cat", match: 1}})), /reliable/);
  assert.equal(selectVerifiedMatch("árbol", exact("árbol", "MYMEMORY WARNING: quota exceeded")), null);
});
