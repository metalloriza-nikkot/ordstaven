// @ts-check
// Ljudning: ett ord delas i bokstavsljud och sedan hela ordet. Porterad från TURBO-RACE (04w_words.js, soundOut).
// Bokstavens ljud, inte namnet, så som barn lär sig i skolan. Helord ljudas aldrig (LJUS, småord, lista 5).
import { versaler } from './text.js';

export const BOKSTAVSLJUD = Object.freeze({
  A: 'a', B: 'bö', C: 'sss', D: 'dö', E: 'e', F: 'fff', G: 'gö', H: 'hö', I: 'i', J: 'jjj', K: 'kö', L: 'lll',
  M: 'mmm', N: 'nnn', O: 'o', P: 'pö', Q: 'kö', R: 'rrr', S: 'sss', T: 'tö', U: 'u', V: 'vvv', W: 'vvv',
  X: 'ks', Y: 'y', Z: 'sss', Å: 'å', Ä: 'ä', Ö: 'ö', É: 'e',
});

/**
 * Delarna som läses upp i tur och ordning, och vilken bokstav som ska lysa (index, eller "alla").
 * @param {string} ord @param {{ helord?: boolean }} [opt]
 * @returns {{ text: string, lyser: number | 'alla' }[]}
 */
export function ljudningsdelar(ord, { helord = false } = {}) {
  const rent = ord.replace(/[^A-Za-zÅÄÖåäöÉé]/g, '');
  if (!rent) return [];
  const helt = { text: rent.toLocaleLowerCase('sv-SE') + '!', lyser: /** @type {'alla'} */ ('alla') };
  if (helord) return [helt];
  const delar = [...versaler(rent)].map((ch, i) => ({ text: BOKSTAVSLJUD[/** @type {keyof BOKSTAVSLJUD} */ (ch)] || ch.toLocaleLowerCase('sv-SE'), lyser: i }));
  return [...delar, helt];
}

/**
 * Säkerhetsnät: längsta tid en ljudning får visas, även om rösten hänger sig (lärdom från TURBO-RACE v16.3).
 * @param {{ text: string }[]} delar
 */
export function maxtidMs(delar) {
  return 4000 + delar.reduce((s, d) => s + 1800 + d.text.length * 140, 0);
}
