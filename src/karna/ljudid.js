// @ts-check
// Ljudens id (10c v0.5). Innehållet skriver Stils id direkt (`tut`, `kastrull`), eller ett av de äldre namnen nedan.
// Delas av ljudet i spelet (src/grans/ljud.js) och innehållskontrollen (verktyg/innehall/kontroll.js).

/** Gråboxens namn och innehållets äldre ljud-id → Stils id (10c v0.5, *Gråboxens namn byts så här*). */
export const EFFEKT_FOR = /** @type {Record<string, string>} */ ({
  allmant: 'kruka', fagel: 'vingflax', fest: 'fest_mellan', bricka: 'bricka_1',
  apa_gnaller: 'apa_gnall', ekorre_not: 'kras', mage_kurrar: 'mage', klaffen_tick: 'klick',
});

/** Ljud-id → inspelat ljud. 'unge' (ungen reagerar) tar ett av de tre lätena. */
export const INSPELAT_FOR = /** @type {Record<string, string | string[]>} */ ({
  fagel_late: 'herr_skata_skratt', skata: 'herr_skata_skratt',
  unge_forsta_late: 'unge_late_01', unge_langtan: 'unge_late_02', unge_svarar: 'unge_late_03',
  unge: ['unge_late_01', 'unge_late_02', 'unge_late_03'],
  // mammas rop i k1s13 (beslut 64.6): ungens längtande läte, långsammare och ca 6 dB svagare (INSPELAT_SPELAS)
  mammas_rop: 'unge_late_02',
});

/** Inspelade ljud som spelas på ett eget sätt: playbackRate och förstärkning i dB. */
export const INSPELAT_SPELAS = /** @type {Record<string, { fart: number, db: number }>} */ ({
  mammas_rop: { fart: 0.7, db: -6 },
});

/** Högst så många ljud i en reaktions `ljud` (de spelas efter varandra). */
export const MAX_LJUD_I_REAKTION = 3;

/**
 * Alla id som innehållet får använda: Stils effekter (nycklarna i ljud.json) och namnen ovan.
 * @param {Iterable<string>} effekter Stils id
 */
export function kandaLjud(effekter) {
  return new Set([...effekter, ...Object.keys(EFFEKT_FOR), ...Object.keys(INSPELAT_FOR)]);
}

/** En reaktions `ljud` som lista (strängen blir en lista med ett id). @param {unknown} x @returns {string[]} */
export function ljudLista(x) {
  if (typeof x === 'string') return x ? [x] : [];
  return Array.isArray(x) ? x.filter((y) => typeof y === 'string' && y).slice(0, MAX_LJUD_I_REAKTION) : [];
}
