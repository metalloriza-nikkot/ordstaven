// @ts-check
// Formeln med tangentbordet (P11 med "skriv": "tangentbord", kapitel 2, schema 2.31). Han skriver ett helt ord,
// och ordet bedöms: en formel (eller en form som godtas), nästan rätt (också nära stavning, 76.2), ett ord som passar
// men inte hjälper, ett vanligt ord, eller inget ord alls. Bara det som inte är ett ord får "pff" (beslut 63). Ren logik.
import { versaler } from './text.js';

/** Högst så många bokstäver i ett ord han skriver (fälten växer till dess). */
export const MAX_BOKSTAVER = 10;

/**
 * @typedef {{ sort: 'formel', ord: string, formel: any }
 *   | { sort: 'nastan', ord: string, nastan: any, mal?: string, skiljer?: number }
 *   | { sort: 'rimligt', ord: string, rimligt: any }
 *   | { sort: 'ord', ord: string }
 *   | { sort: 'sparrat', ord: string }
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

/** Vokaler han förväxlar (läspedagogen V6): Å och Ä, O som Å (SOV, KOM), E och Ä. */
const VOKALPAR = [['Å', 'Ä'], ['Å', 'O'], ['E', 'Ä']];
const KONSONANT = /^[BCDFGHJKLMNPQRSTVWXZ]$/;

/**
 * Nära stavning (76.2, A4): ordet han skrev skiljer sig från målordet på ett sätt som är typiskt när man stavar efter
 * ljudet. Ger platsen i målordet där bokstaven skiljer, eller -1.
 * - enkel eller dubbel konsonant: SIMA för SIMMA, FLOTE för FLOTTE, FLYGG för FLYG;
 * - vokalerna Å/Ä, Å/O och E/Ä på en plats: SVÅRD för SVÄRD;
 * - stum bokstav före J först i ordet: JUS för LJUS, JÄLP för HJÄLP (LJ, HJ, DJ, GJ).
 * @param {string} skrivet @param {string} mal @returns {number}
 */
export function naraStavning(skrivet, mal) {
  const a = [...versaler(skrivet)], m = [...versaler(mal)];
  if (!a.length || a.join('') === m.join('')) return -1;
  // en dubbel konsonant i målordet som han skrev enkel
  if (a.length === m.length - 1) {
    for (let i = 1; i < m.length; i++) {
      if (m[i] === m[i - 1] && KONSONANT.test(m[i]) && [...m.slice(0, i), ...m.slice(i + 1)].join('') === a.join('')) return i;
    }
    // stum bokstav före J först i ordet
    if (/^[LHDG]J/.test(m.join('')) && m.slice(1).join('') === a.join('')) return 0;
  }
  // en konsonant han dubblade som är enkel i målordet
  if (a.length === m.length + 1) {
    for (let i = 1; i < a.length; i++) {
      if (a[i] === a[i - 1] && KONSONANT.test(a[i]) && [...a.slice(0, i), ...a.slice(i + 1)].join('') === m.join('')) return i - 1;
    }
  }
  // en vokal han förväxlade
  if (a.length === m.length) {
    const olika = m.map((c, i) => (c === a[i] ? -1 : i)).filter((i) => i >= 0);
    if (olika.length === 1) { const i = olika[0]; if (VOKALPAR.some(([x, y]) => (m[i] === x && a[i] === y) || (m[i] === y && a[i] === x))) return i; }
  }
  return -1;
}

/**
 * Bedöm ordet han har skrivit.
 * @param {any} pussel ett P11 @param {string} skrivet @param {{ has(w: string): boolean }} ord riktiga ord (kandaOrd och SALDO)
 * @param {{ has(w: string): boolean } | null} [sparr] grova ord som aldrig får "BRA ORD!" (77.2)
 * @returns {Bedomning}
 */
export function bedomOrd(pussel, skrivet, ord, sparr = null) {
  const w = versaler(String(skrivet || '').trim());
  const formler = pussel.formler?.length ? pussel.formler : [{ ord: pussel.svar }];
  for (const f of formler) if ([f.ord, ...(f.godtas || [])].some((x) => versaler(x) === w)) return { sort: 'formel', ord: versaler(f.ord), formel: f };
  const n = (pussel.nastan || []).find((/** @type {any} */ x) => versaler(x.ord) === w);
  if (n) return { sort: 'nastan', ord: w, nastan: n };
  const r = (pussel.rimliga || []).find((/** @type {any} */ x) => versaler(x.ord) === w);
  if (r) return { sort: 'rimligt', ord: w, rimligt: r };
  // nära stavning av en formel eller en form som godtas (76.2, A4): "nästan", och förebilden visar bokstaven
  for (const f of formler) for (const mal of [f.ord, ...(f.godtas || [])]) {
    const i = naraStavning(w, mal);
    if (i >= 0) return { sort: 'nastan', ord: w, nastan: { auto: true }, mal: versaler(mal), skiljer: i };
  }
  // ett grovt ord (spärrlistan, 77.2) får aldrig "BRA ORD!": det är ett vanligt försök, och ordet visas inte igen
  if (sparr?.has(w)) return { sort: 'sparrat', ord: '' };
  if (ord.has(w)) return { sort: 'ord', ord: w };
  return { sort: 'fel', ord: w };
}

/** Siffrorna i den prefixkodade ordlistan (verktyg/ordlista/saldo.py): hur många tecken raden delar med raden före. */
const PREFIX = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Packa upp den prefixkodade ordlistan (SALDO, 77.2): varje rad börjar med hur många tecken den delar med raden
 * före, och sedan resten av ordet. @param {string} text @returns {Set<string>}
 */
export function avkodaOrdlista(text) {
  const ut = new Set();
  let forra = '';
  for (const rad of text.split('\n')) {
    if (!rad || rad.startsWith('#')) continue;
    const n = PREFIX.indexOf(rad[0]);
    if (n < 0) continue;
    forra = forra.slice(0, n) + rad.slice(1);
    ut.add(forra);
  }
  return ut;
}
