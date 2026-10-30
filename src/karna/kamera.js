// @ts-check
// Kameran (beslut 14 och 18.1). Ett område kan vara större än skärmen, högst ungefär 2×2 skärmar. Skärmen visar då
// en bit av det, och kameran följer hjälten inom områdets gränser. Den stannar vid kanterna, så att inget utanför
// området syns. Den rör sig i hela pixlar och har en mittzon: inom zonen kan hjälten gå utan att bilden rör sig.
// När en fråga ställs visar kameran hela valet (alla alternativ och skylten). Ren logik: inga beroenden.
import { RUM } from './skalning.js';

/** @typedef {{ x: number, y: number }} Punkt */
/** @typedef {{ bredd: number, hojd: number }} Storlek */
/** @typedef {{ x: number, y: number, b: number, h: number }} Ruta */

/**
 * Inställningarna. zon = hur långt (i pixlar) hjälten kan gå från skärmens mitt innan kameran följer med.
 * framat = förskjutning åt det håll han går, så att han ser mer av det som kommer (0 = ingen, beslut 18.1).
 * fart = hur fort kameran glider till ett val, i pixlar per sekund.
 * skylt = plats ovanför ett föremål som skylten behöver (skyltar står ovanför sina föremål).
 * kant = luft på sidorna, eftersom en skylt är bredare än en smal stig.
 */
export const KAMERA = Object.freeze({ zon: Object.freeze({ x: 32, y: 24 }), framat: 0, fart: 240, skylt: 30, kant: 12 });

/** Största område: ungefär 2×2 skärmar. */
export const STORSTA = Object.freeze({ bredd: RUM.bredd * 2, hojd: RUM.hojd * 2 });

/** Håll kameran inom områdets gränser, i hela pixlar. @param {Punkt} k @param {Storlek} s @returns {Punkt} */
export function inomGranserna(k, s) {
  return {
    x: Math.round(Math.max(0, Math.min(s.bredd - RUM.bredd, k.x))),
    y: Math.round(Math.max(0, Math.min(s.hojd - RUM.hojd, k.y))),
  };
}

/** Punkten kameran följer: mitt på hjälten (positionen är fötterna). @param {Punkt} fotter */
const mittPa = (fotter) => ({ x: fotter.x, y: fotter.y - 12 });

/**
 * Kameran med hjälten i mitten, utan glidning: när han kommer in i ett område.
 * @param {Punkt} fotter @param {Storlek} s @returns {Punkt}
 */
export function centrera(fotter, s) {
  const m = mittPa(fotter);
  return inomGranserna({ x: m.x - RUM.bredd / 2, y: m.y - RUM.hojd / 2 }, s);
}

/**
 * Kameran följer hjälten: den flyttar sig bara när han är utanför mittzonen, och bara så mycket som behövs.
 * @param {Punkt} k kamerans läge nu @param {Punkt} fotter @param {Storlek} s
 * @param {{ vand?: Punkt, framat?: number, zon?: Punkt }} [opt] vand = åt vilket håll han går (enhetsvektor)
 * @returns {Punkt}
 */
export function folj(k, fotter, s, opt = {}) {
  const zon = opt.zon ?? KAMERA.zon, framat = opt.framat ?? KAMERA.framat, v = opt.vand ?? { x: 0, y: 0 };
  const m = mittPa(fotter);
  const mal = { x: m.x + v.x * framat, y: m.y + v.y * framat };
  const c = { x: k.x + RUM.bredd / 2, y: k.y + RUM.hojd / 2 };
  if (mal.x - c.x > zon.x) c.x = mal.x - zon.x; else if (c.x - mal.x > zon.x) c.x = mal.x + zon.x;
  if (mal.y - c.y > zon.y) c.y = mal.y - zon.y; else if (c.y - mal.y > zon.y) c.y = mal.y + zon.y;
  return inomGranserna({ x: c.x - RUM.bredd / 2, y: c.y - RUM.hojd / 2 }, s);
}

/**
 * Rutan som ska synas när en fråga ställs: alla föremålen i valet, med plats för skyltarna ovanför. null om listan är tom.
 * @param {Ruta[]} rutor @returns {Ruta | null}
 */
export function omradeFor(rutor) {
  if (!rutor.length) return null;
  const x0 = Math.min(...rutor.map((r) => r.x - KAMERA.kant)), y0 = Math.min(...rutor.map((r) => r.y - KAMERA.skylt));
  const x1 = Math.max(...rutor.map((r) => r.x + r.b + KAMERA.kant)), y1 = Math.max(...rutor.map((r) => r.y + r.h));
  return { x: x0, y: y0, b: x1 - x0, h: y1 - y0 };
}

/**
 * Kameran när ett val ska synas: den flyttar sig så lite som möjligt för att hela rutan (och hjälten) ska synas.
 * Ryms inte allt på skärmen följer den hjälten som vanligt, och valet visas så långt det går.
 * @param {Punkt} k @param {Ruta} ruta @param {Punkt} fotter @param {Storlek} s @returns {{ k: Punkt, ryms: boolean }}
 */
export function visaRuta(k, ruta, fotter, s) {
  // hjälten ska alltid synas, med lite luft runt sig: han tas med i rutan
  const h = { x: fotter.x - 24, y: fotter.y - 40, b: 48, h: 48 };
  const x0 = Math.min(ruta.x, h.x), y0 = Math.min(ruta.y, h.y);
  const x1 = Math.max(ruta.x + ruta.b, h.x + h.b), y1 = Math.max(ruta.y + ruta.h, h.y + h.h);
  const ryms = x1 - x0 <= RUM.bredd && y1 - y0 <= RUM.hojd;
  if (!ryms) return { k: folj(k, fotter, s), ryms };
  // minsta flytt: håll det som redan syns kvar, skjut bara så att kanterna kommer med
  const nx = Math.min(Math.max(k.x, x1 - RUM.bredd), x0);
  const ny = Math.min(Math.max(k.y, y1 - RUM.hojd), y0);
  return { k: inomGranserna({ x: nx, y: ny }, s), ryms };
}

/**
 * Ett steg mot målet, högst max pixlar i varje led (kameran glider till valet i stället för att hoppa).
 * @param {Punkt} k @param {Punkt} mal @param {number} max @returns {Punkt}
 */
export function narmare(k, mal, max) {
  const d = Math.max(1, Math.round(max));
  const steg = (/** @type {number} */ a, /** @type {number} */ b) => (Math.abs(b - a) <= d ? b : a + Math.sign(b - a) * d);
  return { x: steg(k.x, mal.x), y: steg(k.y, mal.y) };
}

/** Ryms ett område på en skärm (då står kameran alltid i 0, 0)? @param {Storlek} s */
export const enSkarm = (s) => s.bredd <= RUM.bredd && s.hojd <= RUM.hojd;
