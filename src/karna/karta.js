// @ts-check
// Tiled-kartor för rummen. Kartan säger VAR föremålen står, innehållet säger VAD som finns.
// Kartan innehåller bara id:n (objektets namn), aldrig text som spelaren ser.
// Ett objektlager med rutor: namn = föremålets id, typ = utgang, sak eller figur (frivilligt).
// Egenskaper: "till" (rummet en utgång leder till), "sida" (var hjälten ställer sig: under, over, vanster, hoger),
// "golv" (man går på det) och "visar" (pusslet vars alternativ föremålet visar, t.ex. lådorna eller krukorna).
// En punkt med namnet "start" är där hjälten står när rummet visas utan att hjälten kom genom en utgång.
import { RUM } from './skalning.js';

/** @typedef {import('./rumslayout.js').Objekt} Objekt */
/** @typedef {{ objekt: Objekt[], start: { x: number, y: number } | null }} Karta */

const UTGANG = /^(stege_|dorr_|grind|stig_)/;
const SIDOR = new Set(['under', 'over', 'vanster', 'hoger']);

/** Objektets id i rummets innehåll (ett id eller { id, syns_i }). @param {string | { id: string }} x */
export const innehallsId = (x) => (typeof x === 'string' ? x : x.id);

/**
 * Föremålen som syns i ett visst tillstånd av rummet.
 * @param {(string | { id: string, syns_i?: string[] })[]} innehall @param {string | null} tillstand
 */
export function synligaIds(innehall, tillstand) {
  return innehall.filter((x) => typeof x === 'string' || !x.syns_i || (tillstand !== null && x.syns_i.includes(tillstand))).map(innehallsId);
}

/** Sort efter id när kartan inte säger något. @param {string} id @returns {Objekt['sort']} */
export const sortFor = (id) => (UTGANG.test(id) ? 'utgang' : 'sak');

/**
 * Läs en Tiled-karta (JSON, .tmj).
 * @param {any} tmj
 * @returns {Karta}
 */
export function lasKarta(tmj) {
  if (!tmj || tmj.type !== 'map') throw new Error('inte en Tiled-karta');
  if (tmj.width * tmj.tilewidth !== RUM.bredd || tmj.height * tmj.tileheight !== RUM.hojd) {
    throw new Error(`kartan är ${tmj.width * tmj.tilewidth}×${tmj.height * tmj.tileheight}, rummet är ${RUM.bredd}×${RUM.hojd}`);
  }
  /** @type {Objekt[]} */
  const objekt = [];
  let start = null;
  for (const lager of tmj.layers || []) {
    if (lager.type !== 'objectgroup') continue;
    for (const o of lager.objects || []) {
      const egen = Object.fromEntries((o.properties || []).map((/** @type {any} */ p) => [p.name, p.value]));
      if (o.point || o.name === 'start') { if (o.name === 'start') start = { x: Math.round(o.x), y: Math.round(o.y) }; continue; }
      const typ = o.type || o.class || '';
      /** @type {Objekt} */
      const ut = {
        id: o.name,
        x: Math.round(o.x), y: Math.round(o.y), b: Math.round(o.width), h: Math.round(o.height),
        sort: typ === 'utgang' || typ === 'sak' || typ === 'figur' ? typ : sortFor(o.name),
      };
      if (egen.till) ut.till = String(egen.till);
      if (SIDOR.has(egen.sida)) ut.sida = egen.sida;
      if (egen.golv) ut.golv = true;
      if (egen.visar) ut.visar = String(egen.visar);
      objekt.push(ut);
    }
  }
  return { objekt, start };
}
