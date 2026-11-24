/* Spanish-to-English classroom translations: vetted common words, cautious API fallback. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PalabrasTranslation = api;
})(typeof globalThis === "object" ? globalThis : null, function () {
  "use strict";

  const SERVICE = "https://api.mymemory.translated.net/get";
  const cache = new Map();
  const verified = new Map();

  // Carefully reviewed unambiguous classroom words. Adjective agreement does
  // not change the English colour/description; never derive noun/verb meanings.
  const genderedAdjectives = {
    amarill: "yellow", roj: "red", blanc: "white", negr: "black",
    morad: "purple", rosad: "pink", anaranjad: "orange",
    dorad: "golden", platead: "silver", clar: "light", oscur: "dark",
    pequeñ: "small", bonit: "pretty", guap: "good-looking",
    rápid: "fast", lent: "slow", nuev: "new", viej: "old",
    larg: "long", cort: "short", hermos: "beautiful"
  };
  for (const [stem, meaning] of Object.entries(genderedAdjectives)) {
    for (const suffix of ["o", "a", "os", "as"]) {
      verified.set(stem + suffix, meaning);
    }
  }
  const fixedWords = {
    azul: "blue", azules: "blue",
    verde: "green", verdes: "green",
    gris: "grey", grises: "grey",
    marrón: "brown", marrones: "brown",
    naranja: "orange", naranjas: "orange",
    violeta: "violet", violetas: "violet",
    turquesa: "turquoise", turquesas: "turquoise",
    celeste: "sky blue", celestes: "sky blue",
    rosa: "pink / rose", rosas: "pink / roses",
    cebolla: "onion", cebollas: "onions",
    día: "day", días: "days"
  };
  for (const [word, meaning] of Object.entries(fixedWords)) verified.set(word, meaning);

  function dictionaryUrl(word) {
    return "https://www.spanishdict.com/translate/" +
      encodeURIComponent(String(word).trim().normalize("NFC"));
  }

  function normaliseSpanish(word) {
    return String(word).trim().normalize("NFC").toLocaleLowerCase("es");
  }

  function cleanEnglish(value) {
    if (typeof value !== "string") return null;
    const text = value.trim().replace(/\s+/g, " ");
    if (!text || text.length > 100 || /[<>]/.test(text) ||
        /^(?:MYMEMORY WARNING|QUERY LENGTH LIMIT|QUOTA EXCEEDED|NO TRANSLATION|NOT AVAILABLE|NULL)/i.test(text)) {
      return null;
    }
    return text;
  }

  // A translation-memory hit for a different source phrase is NOT evidence for
  // the requested word. Do not automatically trust responseData.translatedText.
  function selectVerifiedMatch(word, data) {
    if (Number(data?.responseStatus) !== 200) return null;
    const candidates = (Array.isArray(data.matches) ? data.matches : [])
      .filter(entry => typeof entry?.segment === "string" &&
        normaliseSpanish(entry.segment) === word && Number(entry.match) >= 0.995)
      .map(entry => ({
        translation: cleanEnglish(entry.translation),
        match: Number(entry.match),
        quality: Number(entry.quality) || 0
      }))
      .filter(entry => entry.translation)
      .sort((a, b) => (b.match - a.match) || (b.quality - a.quality));

    if (candidates.length) {
      const best = candidates[0];
      // Equally ranked contradictory translations may reflect different parts
      // of speech or meanings. Don't silently choose one as definitive.
      const competing = candidates.some(other =>
        other.translation.toLocaleLowerCase("en") !== best.translation.toLocaleLowerCase("en") &&
        other.match >= best.match - 0.001 && other.quality >= best.quality - 2);
      return competing ? null : best.translation;
    }

    // A standalone primary result is usable only if the provider marks it as
    // an exact match AND there are no conflicting/off-target memory segments.
    if (Array.isArray(data.matches) && data.matches.length) return null;
    if (!(Number(data?.responseData?.match) >= 0.995)) return null;
    return cleanEnglish(data?.responseData?.translatedText);
  }

  async function translateWord(word, fetcher, signal) {
    const term = normaliseSpanish(word);
    if (!/^[a-záéíóúüñ]+$/iu.test(term) || term.length > 60) throw new Error("Invalid word");
    if (verified.has(term)) return verified.get(term);
    if (cache.has(term)) return cache.get(term);

    const get = fetcher || globalThis.fetch;
    if (typeof get !== "function") throw new Error("Translation service unavailable");
    const query = new URLSearchParams({q: term, langpair: "es|en"});
    const response = await get(SERVICE + "?" + query, {signal});
    if (!response.ok) throw new Error("Translation service unavailable");
    const data = await response.json();
    const translation = selectVerifiedMatch(term, data);
    if (!translation) throw new Error("No reliable translation found");
    cache.set(term, translation);
    return translation;
  }

  return { translateWord, dictionaryUrl, selectVerifiedMatch };
});
