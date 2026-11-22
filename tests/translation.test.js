const test = require("node:test");
const assert = require("node:assert/strict");
const {translateWord, dictionaryUrl} = require("../translation.js");
function mockResponse(data, ok = true) {
  return {ok, json: async () => data};
}
test("Translation encodes Spanish accents, ñ and uses es|en", async () => {
  let url;
  const result = await translateWord("árboles", async (request) => {
    url = new URL(request);
    return mockResponse({responseStatus: 200, responseData: {translatedText: "trees"}});
  });
  assert.equal(result, "trees");
  assert.equal(url.searchParams.get("q"), "árboles");
  assert.equal(url.searchParams.get("langpair"), "es|en");
  assert.equal(dictionaryUrl("año"), "https://www.spanishdict.com/translate/a%C3%B1o");
});
test("Caches successful translations instead of repeating requests", async () => {
  let count = 0;
  const fetcher = async () => {
    count += 1;
    return mockResponse({responseStatus: 200, responseData: {translatedText: "house"}});
  };
  assert.equal(await translateWord("casa", fetcher), "house");
  assert.equal(await translateWord(" CASA ", fetcher), "house");
  assert.equal(count, 1);
});
test("Rejects unsupported input and failed or unavailable translations", async () => {
  await assert.rejects(() => translateWord("<script>", async () => mockResponse({})), /Invalid word/);
  await assert.rejects(() => translateWord("perro", async () => mockResponse({}, false)), /unavailable/);
  await assert.rejects(() => translateWord("gato", async () => mockResponse({responseStatus: 403, responseData: {translatedText: "x"}})), /not available/);
});
