/* Spanish word matching, kept independent of the page so it can be tested. */
(function (root, factory) {
  const dictionary = factory();
  if (typeof module === "object" && module.exports) module.exports = dictionary;
  if (root) root.PalabrasDictionary = dictionary;
})(typeof globalThis === "object" ? globalThis : null, function () {
  "use strict";

  const API = "https://api.datamuse.com";
  const SPANISH_WORD = /^[a-záéíóúüñ]+$/iu;
  const cache = new Map();

  function foldSpanish(value) {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  }

  function canMakeWord(word, letters) {
    const available = foldSpanish(letters.join("")).split("");
    for (const letter of foldSpanish(word)) {
      const position = available.indexOf(letter);
      if (position === -1) return false;
      available.splice(position, 1);
    }
    return true;
  }

  function spellingPatterns(word) {
    const base = foldSpanish(word);
    const nMasked = base.replace(/n/g, "?");
    const patterns = new Set();
    if (nMasked !== base) patterns.add(nMasked);
    // One stressed vowel, optionally combined with one or more ñ characters.
    // Datamuse's ? matches the actual accented letter, not just plain ASCII.
    for (let i = 0; i < base.length; i += 1) {
      if ("aeiou".includes(base[i])) {
        patterns.add(nMasked.slice(0, i) + "?" + nMasked.slice(i + 1));
      }
    }
    patterns.delete(base);
    return [...patterns];
  }

  function findMatchingWord(results, original) {
    const folded = foldSpanish(original);
    const matches = results
      .map((entry) => entry && entry.word)
      .filter((word) => typeof word === "string" && SPANISH_WORD.test(word) && foldSpanish(word) === folded);
    return matches.find((word) => word.toLocaleLowerCase("es") === original.toLocaleLowerCase("es")) || matches[0] || null;
  }

  async function requestWords(endpoint, params, fetchImpl, timeoutMs) {
    const query = new URLSearchParams({ ...params, v: "es" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${API}/${endpoint}?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Dictionary request failed");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected dictionary response");
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function lookupSpanishWord(input, options = {}) {
    const original = String(input).trim().normalize("NFC").toLocaleLowerCase("es");
    if (!SPANISH_WORD.test(original)) return { status: "invalid" };
    if (cache.has(original) && !options.fetchImpl) return cache.get(original);

    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeoutMs = options.timeoutMs || 5500;
    if (typeof fetchImpl !== "function") return { status: "unavailable" };

    try {
      const exact = await requestWords("words", { sp: original, max: "100" }, fetchImpl, timeoutMs);
      let spelling = findMatchingWord(exact, original);
      if (!spelling) {
        const suggestions = await requestWords("sug", { s: original, max: "100" }, fetchImpl, timeoutMs);
        spelling = findMatchingWord(suggestions, original);
      }
      if (!spelling) {
        for (const pattern of spellingPatterns(original)) {
          const candidates = await requestWords("words", { sp: pattern, max: "1000" }, fetchImpl, timeoutMs);
          spelling = findMatchingWord(candidates, original);
          if (spelling) break;
        }
      }
      const result = spelling ? { status: "valid", word: spelling.normalize("NFC") } : { status: "invalid" };
      if (!options.fetchImpl) cache.set(original, result);
      return result;
    } catch (error) {
      // A network outage must never cost a pupil a valid answer.
      return { status: "unavailable" };
    }
  }

  return { foldSpanish, canMakeWord, spellingPatterns, findMatchingWord, lookupSpanishWord };
});
