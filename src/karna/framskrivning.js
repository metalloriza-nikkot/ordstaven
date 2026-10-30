// @ts-check
// Framskrivning och markering. Ren logik: vilket ord rösten är på, när varje ord sägs när rösten inte säger det
// själv, och rullningens takt. Beslut 21.2 ersätter 13.3: det som sägs rullas fram med ca 40 tecken per sekund
// (grans/rullning.js), det han ska läsa rullas aldrig. Provsidan använder samma funktioner.

/** Rullningens takt (beslut 21.2): en rad på ca 30 tecken står klar på under en sekund. */
export const RULLNING = Object.freeze({ teckenPerSek: 40 });

/** Hur lång tid det tar att rulla fram n tecken. @param {number} n @param {boolean} [ordVis] ett ord i taget (samma takt) @returns {number} ms */
export function teckenTid(n, ordVis = false) {
  void ordVis;
  return Math.ceil((Math.max(0, n) * 1000) / RULLNING.teckenPerSek);
}

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
