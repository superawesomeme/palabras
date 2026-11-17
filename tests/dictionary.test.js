const test = require('node:test');
const assert = require('node:assert/strict');
const { foldSpanish, canMakeWord, spellingPatterns, lookupSpanishWord } = require('../dictionary.js');

const words = ['día', 'mañana', 'señor', 'árbol', 'pingüino', 'enseñó', 'canción', 'casa', 'sí'];
function dictionaryFetch(url) {
  const parsed = new URL(url);
  const query = parsed.searchParams;
  assert.equal(query.get('v'), 'es');
  let matches = [];
  if (parsed.pathname === '/words') {
    const pattern = query.get('sp');
    const regex = new RegExp('^' + pattern.replace(/\?/g, '.') + '$', 'iu');
    matches = words.filter((word) => regex.test(word));
  } else if (parsed.pathname === '/sug') {
    matches = []; // Exercise the fallback spelling-pattern searches.
  }
  return Promise.resolve({ ok: true, json: async () => matches.map((word) => ({word})) });
}
const check = (word) => lookupSpanishWord(word, {fetchImpl: dictionaryFetch});

test('accent and ñ equivalence for the nine-tile letter pool', () => {
  assert.equal(foldSpanish('ÁÉÍÓÚÜÑ'), 'aeiouun');
  assert.equal(canMakeWord('DÍA', ['D','I','A']), true);
  assert.equal(canMakeWord('AÑO', ['A','N','O']), true);
  assert.equal(canMakeWord('PINGÜINO', 'PINGUINO'.split('')), true);
  assert.equal(canMakeWord('DÍÍA', ['D','I','A']), false); // Cannot reuse a letter.
  assert.equal(canMakeWord('CASA', ['C','A','S']), false);
});
test('Spanish corrections use genuine dictionary spellings', async () => {
  for (const [typed, corrected] of [['dia','día'],['manana','mañana'],['senor','señor'],['arbol','árbol'],['pinguino','pingüino'],['enseno','enseñó'],['cancion','canción']]) {
    assert.deepEqual(await check(typed), {status:'valid', word:corrected}, typed);
  }
});
test('exact words stay as entered and nonsense remains invalid', async () => {
  assert.deepEqual(await check('casa'), {status:'valid', word:'casa'});
  assert.deepEqual(await check('zzzzz'), {status:'invalid'});
  assert.deepEqual(await check('dos palabras'), {status:'invalid'});
});
test('network failure never marks a word as incorrect', async () => {
  const result = await lookupSpanishWord('dia', {fetchImpl: async () => {throw new Error('offline');}});
  assert.deepEqual(result, {status:'unavailable'});
});
test('patterns can match accents and ñ simultaneously', () => {
  assert.ok(spellingPatterns('enseno').includes('e?se??'));
});
