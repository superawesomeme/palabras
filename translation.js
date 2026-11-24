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

  // Frequently used classroom nouns: the plural is explicitly reviewed rather
  // than being guessed from Spanish or English spelling rules.
  const classroomNouns = {
    rueda: ["wheel", "ruedas", "wheels"],
    coche: ["car", "coches", "cars"],
    autobús: ["bus", "autobuses", "buses"],
    bicicleta: ["bicycle", "bicicletas", "bicycles"],
    tren: ["train", "trenes", "trains"],
    barco: ["boat", "barcos", "boats"],
    avión: ["aeroplane", "aviones", "aeroplanes"],
    casa: ["house", "casas", "houses"],
    mesa: ["table", "mesas", "tables"],
    silla: ["chair", "sillas", "chairs"],
    puerta: ["door", "puertas", "doors"],
    ventana: ["window", "ventanas", "windows"],
    libro: ["book", "libros", "books"],
    lápiz: ["pencil", "lápices", "pencils"],
    papel: ["paper", "papeles", "papers"],
    calle: ["street", "calles", "streets"],
    ciudad: ["city", "ciudades", "cities"],
    pueblo: ["town", "pueblos", "towns"],
    escuela: ["school", "escuelas", "schools"],
    colegio: ["school", "colegios", "schools"],
    palabra: ["word", "palabras", "words"],
    nombre: ["name", "nombres", "names"],
    letra: ["letter", "letras", "letters"],
    pregunta: ["question", "preguntas", "questions"],
    respuesta: ["answer", "respuestas", "answers"],
    amigo: ["friend", "amigos", "friends"],
    amiga: ["friend", "amigas", "friends"],
    gato: ["cat", "gatos", "cats"],
    perro: ["dog", "perros", "dogs"],
    pájaro: ["bird", "pájaros", "birds"],
    flor: ["flower", "flores", "flowers"],
    árbol: ["tree", "árboles", "trees"],
    montaña: ["mountain", "montañas", "mountains"],
    playa: ["beach", "playas", "beaches"],
    río: ["river", "ríos", "rivers"],
    lago: ["lake", "lagos", "lakes"],
    isla: ["island", "islas", "islands"],
    nube: ["cloud", "nubes", "clouds"],
    zapato: ["shoe", "zapatos", "shoes"],
    camisa: ["shirt", "camisas", "shirts"],
    falda: ["skirt", "faldas", "skirts"],
    mano: ["hand", "manos", "hands"],
    pie: ["foot", "pies", "feet"],
    ojo: ["eye", "ojos", "eyes"],
    oreja: ["ear", "orejas", "ears"],
    brazo: ["arm", "brazos", "arms"],
    pierna: ["leg", "piernas", "legs"],
    cabeza: ["head", "cabezas", "heads"],
    nariz: ["nose", "narices", "noses"],
    corazón: ["heart", "corazones", "hearts"],
    semana: ["week", "semanas", "weeks"],
    mes: ["month", "meses", "months"],
    año: ["year", "años", "years"],
    hora: ["hour", "horas", "hours"],
    minuto: ["minute", "minutos", "minutes"],
    segundo: ["second", "segundos", "seconds"],
    manzana: ["apple", "manzanas", "apples"],
    pera: ["pear", "peras", "pears"],
    tomate: ["tomato", "tomates", "tomatoes"],
    patata: ["potato", "patatas", "potatoes"],
    plátano: ["banana", "plátanos", "bananas"],
    limón: ["lemon", "limones", "lemons"],
    zanahoria: ["carrot", "zanahorias", "carrots"],
    huevo: ["egg", "huevos", "eggs"],
    queso: ["cheese", "quesos", "cheeses"],
    canción: ["song", "canciones", "songs"],
    película: ["film", "películas", "films"],
    cuento: ["story", "cuentos", "stories"],
    juego: ["game", "juegos", "games"]
  };
  for (const [singular, [meaning, plural, pluralMeaning]] of Object.entries(classroomNouns)) {
    verified.set(singular, meaning);
    verified.set(plural, pluralMeaning);
  }
  // Single words with multiple very common senses should show the alternatives.
  for (const [word, translation] of Object.entries({
    banco: "bank / bench", bancos: "banks / benches",
    muñeca: "wrist / doll", muñecas: "wrists / dolls",
    cola: "tail / queue", colas: "tails / queues",
    mañana: "morning / tomorrow", mañanas: "mornings",
    tarde: "afternoon / late", tardes: "afternoons",
    llave: "key / tap", llaves: "keys / taps"
  })) verified.set(word, translation);

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

  // Strong, word-for-word memory matches are preferred over a generated
  // translation. In MyMemory, responseData.match can be LOW for perfectly
  // serviceable machine translation (its API enables MT by default).
  function matchingEntries(word, data) {
    if (!Array.isArray(data?.matches)) return [];
    return data.matches
      .filter(entry => typeof entry?.segment === "string" &&
        normaliseSpanish(entry.segment) === word && Number(entry.match) >= 0.98 &&
        (!entry.source || /^es(?:-|$)/i.test(entry.source)) &&
        (!entry.target || /^en(?:-|$)/i.test(entry.target)))
      .map(entry => ({
        text: cleanEnglish(entry.translation),
        quality: Number(entry.quality) || 0,
        match: Number(entry.match)
      }))
      .filter(entry => entry.text)
      .sort((a, b) => b.match - a.match || b.quality - a.quality);
  }

  function selectVerifiedMatch(word, data) {
    const term = normaliseSpanish(word);
    if (Number(data?.responseStatus) !== 200 || data?.quotaFinished === true) return null;
    const candidates = matchingEntries(term, data);
    if (candidates.length) {
      const best = candidates[0];
      const variants = new Set(candidates.map(entry =>
        entry.text.toLocaleLowerCase("en").replace(/[.!?]+$/, "").trim()));
      if (variants.size === 1) return best.text;
      // A mixture of "bank" and "bench" must not be presented as certainty.
      return null;
    }
    if (Array.isArray(data?.matches) && data.matches.length) return null;
    if (!(Number(data?.responseData?.match) >= 0.995)) return null;
    return cleanEnglish(data?.responseData?.translatedText);
  }

  function selectTranslation(word, data) {
    if (Number(data?.responseStatus) !== 200 || data?.quotaFinished === true) return null;
    const term = normaliseSpanish(word);
    const exact = selectVerifiedMatch(term, data);
    if (exact) return { text: exact, confidence: "verified" };

    // The first result is the provider's best-effort machine translation,
    // NOT proof of a dictionary entry. Show it as approximate, not verified.
    // This restores ordinary words when no human TM match exists.
    const primary = cleanEnglish(data?.responseData?.translatedText);
    if (primary) return { text: primary, confidence: "automatic" };
    return null;
  }

  async function translateWordDetailed(word, fetcher, signal) {
    const term = normaliseSpanish(word);
    if (!/^[a-záéíóúüñ]+$/iu.test(term) || term.length > 60) throw new Error("Invalid word");
    if (verified.has(term)) return { text: verified.get(term), confidence: "verified" };
    if (cache.has(term)) return cache.get(term);

    const get = fetcher || globalThis.fetch;
    if (typeof get !== "function") throw new Error("Translation service unavailable");
    const query = new URLSearchParams({q: term, langpair: "es|en", mt: "1"});
    const response = await get(SERVICE + "?" + query, {signal});
    if (!response.ok) throw new Error("Translation service unavailable");
    const data = await response.json();
    const selected = selectTranslation(term, data);
    if (!selected) throw new Error("Translation not available");
    cache.set(term, selected);
    return selected;
  }

  // Keep the existing string-returning method for external consumers.
  async function translateWord(word, fetcher, signal) {
    return (await translateWordDetailed(word, fetcher, signal)).text;
  }

  return { translateWord, translateWordDetailed, dictionaryUrl, selectVerifiedMatch, selectTranslation };
});
