// @ts-check
// Formeln med tangentbordet (P11 med "skriv": "tangentbord", kapitel 2, schema 2.31). Han skriver ett helt ord,
// och ordet bedöms: en formel (eller en form som godtas), nästan rätt, ett ord som passar men inte hjälper, ett
// vanligt ord, eller inget ord alls. Bara det som inte är ett ord får "pff" (beslut 63). Ren logik.
import { versaler } from './text.js';

/** Högst så många bokstäver i ett ord han skriver (fälten växer till dess). */
export const MAX_BOKSTAVER = 10;

/**
 * @typedef {{ sort: 'formel', ord: string, formel: any }
 *   | { sort: 'nastan', ord: string, nastan: any }
 *   | { sort: 'rimligt', ord: string, rimligt: any }
 *   | { sort: 'ord', ord: string }
 *   | { sort: 'fel', ord: string }} Bedomning
 */

/**
 * Orden som räknas som riktiga ord (vanligt_svar i stället för "pff"): ordlistornas ord, och alla formler och ord
 * som kapitlen nämner i en formel (formler, godtas, nastan och rimliga), i versaler.
 * @param {any} ordlistor @param {any[]} [kapitel]
 * @returns {Set<string>}
 */
export function kandaOrd(ordlistor, kapitel = []) {
  const ut = new Set((ordlistor?.ord || []).map((/** @type {any} */ o) => versaler(o.ord)));
  for (const k of kapitel) for (const p of k?.pussel || []) {
    if (p.typ !== 'P11_formel') continue;
    for (const f of p.formler || []) { ut.add(versaler(f.ord)); for (const g of f.godtas || []) ut.add(versaler(g)); }
    for (const r of p.rimliga || []) ut.add(versaler(r.ord));
  }
  return ut;
}

/**
 * Fälten han skriver i: formelns längd från början, och de växer när han skriver fler bokstäver.
 * @param {any} pussel @param {string} skrivet
 */
export const antalFalt = (pussel, skrivet) => Math.min(MAX_BOKSTAVER, Math.max([...versaler(pussel.svar || '')].length, [...skrivet].length));

/**
 * Bedöm ordet han har skrivit.
 * @param {any} pussel ett P11 @param {string} skrivet @param {Set<string>} ord riktiga ord (kandaOrd)
 * @returns {Bedomning}
 */
export function bedomOrd(pussel, skrivet, ord) {
  const w = versaler(String(skrivet || '').trim());
  const formler = pussel.formler?.length ? pussel.formler : [{ ord: pussel.svar }];
  for (const f of formler) if ([f.ord, ...(f.godtas || [])].some((x) => versaler(x) === w)) return { sort: 'formel', ord: versaler(f.ord), formel: f };
  const n = (pussel.nastan || []).find((/** @type {any} */ x) => versaler(x.ord) === w);
  if (n) return { sort: 'nastan', ord: w, nastan: n };
  const r = (pussel.rimliga || []).find((/** @type {any} */ x) => versaler(x.ord) === w);
  if (r) return { sort: 'rimligt', ord: w, rimligt: r };
  if (ord.has(w)) return { sort: 'ord', ord: w };
  return { sort: 'fel', ord: w };
}
