const test = require("node:test");
const assert = require("node:assert/strict");
const {translateWord, translateWordDetailed, dictionaryUrl, selectVerifiedMatch, selectTranslation} = require("../translation.js");

function mockResponse(data, ok = true) {
  return {ok, json: async () => data};
}
function exact(word, translation, options = {}) {
  return {responseStatus: 200, responseData: {translatedText: translation, match: 1},
    matches: [{segment: word, translation, match: 1, quality: 80}], ...options};
}

test("Common colour forms and everyday singular/plural words are reviewed and available offline", async () => {
  const noNetwork = () => { throw new Error("Reviewed word must not call the network"); };
  const cases = {
    amarillo: "yellow", amarilla: "yellow", amarillos: "yellow", amarillas: "yellow",
    roja: "red", verdes: "green", azules: "blue", cebolla: "onion",
    rueda: "wheel", ruedas: "wheels", árbol: "tree", árboles: "trees",
    pie: "foot", pies: "feet", flor: "flower", flores: "flowers",
    día: "day", días: "days", naranja: "orange", rosa: "pink / rose",
    banco: "bank / bench", mañana: "morning / tomorrow"
  };
  for (const [word, value] of Object.entries(cases)) {
    assert.deepEqual(await translateWordDetailed(word, noNetwork), {text: value, confidence: "verified"}, word);
  }
});

test("Exact human memory match is marked verified; primary machine result is not substituted", async () => {
  const data = exact("montaña", "mountain");
  data.responseData = {translatedText: "onion", match: 0.4};
  data.matches.push({segment: "cebolla amarilla", translation: "yellow onion", match: 0.75, quality: 90});
  assert.deepEqual(selectTranslation("montaña", data), {text: "mountain", confidence: "verified"});
  assert.equal(selectVerifiedMatch("montaña", data), "mountain");
});

test("Ordinary machine translations are shown, not discarded due to low or missing match scores", async () => {
  const data = {responseStatus: 200, responseData: {translatedText: "wheels", match: 0.49}, matches: []};
  assert.deepEqual(selectTranslation("ruedas", data), {text: "wheels", confidence: "automatic"});
  const noScore = {responseStatus: 200, responseData: {translatedText: "living"}};
  assert.deepEqual(selectTranslation("viviendo", noScore), {text: "living", confidence: "automatic"});
  const results = await translateWordDetailed("caminando", async url => {
    assert.equal(new URL(url).searchParams.get("mt"), "1");
    return mockResponse({responseStatus: 200,responseData:{translatedText:"walking",match:0.39},matches:[]});
  });
  assert.deepEqual(results, {text: "walking",confidence: "automatic"});
});

test("Off-target memory does not masquerade as verified, but can display the primary result as approximate", () => {
  const data = {responseStatus: 200, responseData: {translatedText: "sailing", match: 0.51},
    matches: [{segment: "barco", translation: "boat", match: 0.8, quality: 90}]};
  assert.equal(selectVerifiedMatch("navegando", data), null);
  assert.deepEqual(selectTranslation("navegando", data), {text:"sailing",confidence:"automatic"});
});

test("Conflicting human matches are not falsely labelled verified", () => {
  const ambiguous = exact("banco", "bank");
  ambiguous.matches.push({segment: "banco", translation: "bench", match: 1, quality: 80});
  assert.equal(selectVerifiedMatch("banco", ambiguous), null);
  assert.deepEqual(selectTranslation("banco", ambiguous), {text: "bank", confidence: "automatic"});
});

test("Unavailable, invalid and quota responses are not accepted as translations", async () => {
  assert.equal(selectTranslation("gato",{responseStatus:403,responseData:{translatedText:"cat",match:1}}),null);
  assert.equal(selectTranslation("gato",{responseStatus:200,quotaFinished:true,responseData:{translatedText:"cat",match:1}}),null);
  assert.equal(selectTranslation("gato",{responseStatus:200,responseData:{translatedText:"MYMEMORY WARNING: quota exceeded"}}),null);
  assert.equal(selectTranslation("gato",{responseStatus:200,responseData:{translatedText:"<script>alert(1)</script>"}}),null);
  await assert.rejects(()=>translateWord("<script>", async()=>mockResponse({})), /Invalid word/);
  await assert.rejects(()=>translateWord("perrera", async()=>mockResponse({},false)), /unavailable/);
  await assert.rejects(()=>translateWord("cargando", async()=>mockResponse({responseStatus:500,responseData:{translatedText:"loading"}})), /not available/);
});

test("API query correctly encodes Spanish accents and uses es|en", async () => {
  let url;
  const result = await translateWordDetailed("murciélagos", async request => {
    url=new URL(request);
    return mockResponse(exact("murciélagos","bats"));
  });
  assert.equal(result.text, "bats");
  assert.equal(result.confidence, "verified");
  assert.equal(url.searchParams.get("q"),"murciélagos");
  assert.equal(url.searchParams.get("langpair"),"es|en");
  assert.equal(dictionaryUrl("año"), "https://www.spanishdict.com/translate/a%C3%B1o");
});

test("Cache returns both verified and approximate results without refetching", async () => {
  let count=0;
  const fetcher=async()=>{
    count++;
    return mockResponse({responseStatus:200,responseData:{translatedText:"house",match:.6},matches:[]});
  };
  assert.equal(await translateWord("caserón",fetcher),"house");
  assert.deepEqual(await translateWordDetailed(" CASERÓN ",fetcher),{text:"house",confidence:"automatic"});
  assert.equal(count,1);
});
