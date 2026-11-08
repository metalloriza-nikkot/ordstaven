// Lärandet vid varje pass början (F3, beslut 26.6 och 32.2): när ett pass börjar sparas en bild av
// lärandeprofilen, och när den vuxne sätter tillbaka sparningen till början av ett pass sätts lärandet tillbaka till
// bilden. Det som kom efter (nivåerna och historiken) försvinner, så att en vuxens spel aldrig flyttar ett barns nivå.
// Ren logik: inget Phaser, ingen DOM.

import { aventyrFor } from './sparning.js';

/** Delarna av lärandeprofilen som bilden tar (historiken klipps efter bildens tid i stället). */
const DELAR = /** @type {const} */ (['lasning', 'skrivning', 'ord', 'matte']);
const kopia = (/** @type {any} */ x) => JSON.parse(JSON.stringify(x ?? {}));

/**
 * Passets plats i äventyret, för att ordna passen: kapitlets nummer i äventyret och passet.
 * @param {string[]} kapitelOrdning aventyr.kapitel @param {string} kapitelId @param {number} pass
 */
export const passOrdning = (kapitelOrdning, kapitelId, pass) => kapitelOrdning.indexOf(kapitelId) * 1000 + pass;

/**
 * Är scenen den första i sitt pass (frivilliga scener räknas inte)? @param {any} kapitel @param {number} scenIndex
 */
export function forstaIPasset(kapitel, scenIndex) {
  const scen = kapitel?.scener?.[scenIndex];
  if (!scen || scen.frivillig) return false;
  return !kapitel.scener.slice(0, scenIndex).some((/** @type {any} */ s) => !s.frivillig && s.pass === scen.pass);
}

/**
 * Spara en bild av lärandet när ett pass börjar. En äldre bild av samma pass ersätts (passet spelas igen).
 * @param {{ tillstand: any, aventyrId: string, kapitelOrdning: string[], kapitelId: string, pass: number, nu: number }} a
 */
export function sparaPassbild({ tillstand, aventyrId, kapitelOrdning, kapitelId, pass, nu }) {
  const av = aventyrFor(tillstand, aventyrId);
  const larande = tillstand.spelare.larande || {};
  const ordning = passOrdning(kapitelOrdning, kapitelId, pass);
  /** @type {Record<string, any>} */
  const bild = {};
  for (const d of DELAR) bild[d] = kopia(larande[d]);
  const lista = (av.passbilder || []).filter((/** @type {any} */ b) => b.ordning !== ordning);
  lista.push({ kapitel: kapitelId, pass, ordning, tid: nu, larande: bild });
  lista.sort((/** @type {any} */ a, /** @type {any} */ b) => a.ordning - b.ordning);
  av.passbilder = lista;
}

/**
 * Sätt tillbaka lärandet till början av ett pass (menyn för vuxna).
 * - Finns en bild av passet: nivåerna blir bildens, och historiken efter bildens tid tas bort.
 * - Äventyrets första pass utan bild (en sparning från före bilderna): lärandet börjar om helt, eftersom inget var
 *   lärt när äventyret började.
 * - Annars står lärandet kvar ('ingen'), och den vuxne får veta det.
 * Bilderna av passen efter tas bort i alla tre fallen: de hör till det som har satts tillbaka.
 * @param {{ tillstand: any, aventyrId: string, kapitelOrdning: string[], kapitelId: string, pass: number, forstaPasset: boolean }} a
 * @returns {'bild' | 'borjan' | 'ingen'}
 */
export function aterstallLarande({ tillstand, aventyrId, kapitelOrdning, kapitelId, pass, forstaPasset }) {
  const av = aventyrFor(tillstand, aventyrId);
  const larande = (tillstand.spelare.larande = tillstand.spelare.larande || {});
  const ordning = passOrdning(kapitelOrdning, kapitelId, pass);
  const bild = (av.passbilder || []).find((/** @type {any} */ b) => b.ordning === ordning);
  av.passbilder = (av.passbilder || []).filter((/** @type {any} */ b) => b.ordning < ordning || b === bild);
  // på plats: läsmotorn håller en referens till lärandeprofilen
  if (bild) {
    for (const d of DELAR) larande[d] = kopia(bild.larande[d]);
    larande.historik = (larande.historik || []).filter((/** @type {any} */ h) => !(h.nar >= bild.tid));
    return 'bild';
  }
  if (forstaPasset) {
    for (const d of DELAR) larande[d] = {};
    larande.historik = [];
    return 'borjan';
  }
  return 'ingen';
}
