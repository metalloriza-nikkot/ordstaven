// @ts-check
// Framskrivning ord för ord (beslut 13.3: aldrig bokstav för bokstav). Ren logik: vilket ord rösten är på,
// och när varje ord ska visas när rösten inte säger det själv. Används av provsidan för textgrammatiken.

const BOKSTAV = /[A-Za-zÅÄÖåäöÉé]+/g;

/** Var varje ord börjar i texten (teckenindex). @param {string} text @returns {number[]} */
export function ordStarter(text) {
  return [...String(text).matchAll(BOKSTAV)].map((m) => m.index ?? 0);
}

/**
 * Ordet rösten är på, från röstens teckenindex (onboundary). -1 före första ordet.
 * @param {number[]} starter från ordStarter @param {number} teckenIndex @returns {number}
 */
export function ordVid(starter, teckenIndex) {
  let i = -1;
  for (let k = 0; k < starter.length && starter[k] <= teckenIndex; k++) i = k;
  return i;
}

/**
 * Uppskattad tid för en text, samma som rösten använder när ingen röst finns (rost.js).
 * @param {string} text @returns {number} ms
 */
export function uppskattadTid(text) {
  return 500 + String(text).split(/\s+/).filter(Boolean).length * 380;
}

/**
 * När varje ord börjar (ms från start), när rösten inte säger det. Tiden fördelas efter ordens längd
 * (ett långt ord tar längre tid att säga), och första ordet kommer direkt.
 * @param {string} text @param {number} [totalMs] hela tiden, annars uppskattadTid
 * @returns {number[]}
 */
export function ordTider(text, totalMs = uppskattadTid(text)) {
  const ord = String(text).match(BOKSTAV) || [];
  if (!ord.length) return [];
  const vikt = ord.map((o) => o.length + 2);
  const summa = vikt.reduce((a, b) => a + b, 0);
  // sista ordet ska hinna sägas: fördela tiden fram till ca 85 % av helheten
  const tid = Math.max(0, totalMs) * 0.85;
  const tider = [];
  let t = 0;
  for (let i = 0; i < ord.length; i++) { tider.push(Math.round(t)); t += (vikt[i] / summa) * tid; }
  return tider;
}
