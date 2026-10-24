// @ts-check
// Skalning av pixelvärlden. Skalan räknas i FYSISKA pixlar och är alltid ett heltal,
// så att varje spelpixel blir lika stor även när webbläsaren skalar (t.ex. Windows 125 %).

/** Ett rum är 320×192 pixlar (20×12 rutor à 16×16). */
export const RUM = Object.freeze({ bredd: 320, hojd: 192, ruta: 16 });

/**
 * Plats som hålls fri nertill på pekskärm för bokstavstangentbordet (CSS-pixlar):
 * tre rader à 64 + mellanrum + marginal. Reserveras från start så att rummet inte
 * byter storlek när tangentbordet visas.
 */
export const TANGENTBORD_HOJD = 216;

/**
 * @param {{ bredd: number, hojd: number, dpr?: number, reservNere?: number }} fonster
 *   bredd/hojd i CSS-pixlar, dpr = devicePixelRatio, reservNere = CSS-pixlar som hålls fria nertill (tangentbord)
 * @returns {{ fysisk: number, cssSkala: number, cssBredd: number, cssHojd: number, vanster: number, topp: number }}
 */
export function beraknaSkala({ bredd, hojd, dpr = 1, reservNere = 0 }) {
  const d = dpr > 0 ? dpr : 1;
  const tillgHojd = Math.max(0, hojd - reservNere);
  // Liten marginal mot avrundningsfel (t.ex. 1279.9999 i stället för 1280).
  const eps = 1e-6;
  const fysisk = Math.max(1, Math.floor(Math.min((bredd * d) / RUM.bredd, (tillgHojd * d) / RUM.hojd) + eps));
  const cssBredd = (RUM.bredd * fysisk) / d;
  const cssHojd = (RUM.hojd * fysisk) / d;
  // Placera rummet på hela fysiska pixlar, centrerat i den tillgängliga ytan.
  const vanster = Math.round(((bredd - cssBredd) / 2) * d) / d;
  const topp = Math.round((Math.max(0, tillgHojd - cssHojd) / 2) * d) / d;
  return { fysisk, cssSkala: fysisk / d, cssBredd, cssHojd, vanster, topp };
}

/**
 * Skärmkoordinat (CSS-pixlar, relativt fönstret) → rumskoordinat.
 * @param {{ cssSkala: number, vanster: number, topp: number }} skala
 * @param {number} x @param {number} y
 */
export function skarmTillRum(skala, x, y) {
  return { x: (x - skala.vanster) / skala.cssSkala, y: (y - skala.topp) / skala.cssSkala };
}

/**
 * Rumskoordinat → skärmkoordinat (för pratbubblor i textlagret).
 * @param {{ cssSkala: number, vanster: number, topp: number }} skala
 * @param {number} x @param {number} y
 */
export function rumTillSkarm(skala, x, y) {
  return { x: skala.vanster + x * skala.cssSkala, y: skala.topp + y * skala.cssSkala };
}
