/* Palabras Ocultas: key-free browser translation, independent of SpanishDict scraping. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PalabrasTranslation = api;
})(typeof globalThis === "object" ? globalThis : null, function () {
  "use strict";
  const cache = new Map();
  const SERVICE = "https://api.mymemory.translated.net/get";
  function dictionaryUrl(word) {
    return "https://www.spanishdict.com/translate/" + encodeURIComponent(String(word).trim().normalize("NFC"));
  }
  async function translateWord(word, fetcher, signal) {
    const term = String(word).trim().normalize("NFC").toLocaleLowerCase("es");
    if (!/^[a-záéíóúüñ]+$/iu.test(term) || term.length > 60) throw new Error("Invalid word");
    if (cache.has(term)) return cache.get(term);
    const query = new URLSearchParams({q: term, langpair: "es|en"});
    const get = fetcher || fetch;
    const response = await get(SERVICE + "?" + query, {signal});
    if (!response.ok) throw new Error("Translation service unavailable");
    const data = await response.json();
    const text = data?.responseData?.translatedText;
    if (Number(data?.responseStatus) !== 200 || typeof text !== "string" || !text.trim() ||
        /^(?:MYMEMORY WARNING|QUERY LENGTH LIMIT|QUOTA EXCEEDED)/i.test(text.trim())) {
      throw new Error("Translation not available");
    }
    const translation = text.trim();
    cache.set(term, translation);
    return translation;
  }
  return {translateWord, dictionaryUrl};
});