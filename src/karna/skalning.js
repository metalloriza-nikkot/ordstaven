// @ts-check
// Skalning av pixelvärlden. Skalan räknas i FYSISKA pixlar och är alltid ett heltal,
// så att varje spelpixel blir lika stor även när webbläsaren skalar (t.ex. Windows 125 %).

/** Ett rum är 320×192 pixlar (20×12 rutor à 16×16). */
export const RUM = Object.freeze({ bredd: 320, hojd: 192, ruta: 16 });

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

/** Rumsbredd (CSS-punkter) där stilguidens textmått gäller: textskalan t = bredd / 960, mellan 1 och 2,4. */
export const TEXT_BAS = 960;
/** Textskalan för ett rum som är så här brett i CSS-punkter. @param {number} cssBredd */
export const textskala = (cssBredd) => Math.max(1, Math.min(2.4, cssBredd / TEXT_BAS));
/**
 * Höjden (CSS-punkter) som textremsan under spelytan behöver: två rader uppläst text i 40 punkter × t
 * (radavstånd 1,35), porträttet eller molnets bild bredvid, och luft runt rutan. @param {number} t
 */
export const remsansHojd = (t) => Math.ceil(2 * 40 * 1.35 * t + 48);

/**
 * Texten under spelytan (beslut 36.2). Har fönstret plats för textremsan under spelytan ligger spelytan överst och
 * texten i remsan, så att den aldrig täcker världen. Räcker det inte blir spelytan ett helt steg mindre (en fysisk
 * pixel mindre skala), om den då fortfarande är minst tre gånger så stor (960 × 576 punkter). Annars ligger texten
 * över spelytan som förut (remsa = 0). Spelytan och remsan står tillsammans mitt i fönstret.
 * @param {{ bredd: number, hojd: number, dpr?: number }} fonster
 * @returns {ReturnType<typeof beraknaSkala> & { remsa: number }}
 */
export function beraknaSkalaMedRemsa({ bredd, hojd, dpr = 1 }) {
  const d = dpr > 0 ? dpr : 1;
  const hel = beraknaSkala({ bredd, hojd, dpr: d });
  for (const fysisk of [hel.fysisk, hel.fysisk - 1]) {
    if (fysisk < 1) break;
    const cssBredd = (RUM.bredd * fysisk) / d, cssHojd = (RUM.hojd * fysisk) / d;
    if (fysisk !== hel.fysisk && fysisk / d < 3) break;
    const remsa = remsansHojd(textskala(cssBredd));
    if (cssHojd + remsa > hojd + 1e-6) continue;
    const vanster = Math.round(((bredd - cssBredd) / 2) * d) / d;
    const topp = Math.round(((hojd - cssHojd - remsa) / 2) * d) / d;
    return { fysisk, cssSkala: fysisk / d, cssBredd, cssHojd, vanster, topp, remsa };
  }
  return { ...hel, remsa: 0 };
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

/**
 * Kameran (beslut 14): ett rum kan bli större än skärmen, och då visar skärmen en bit av världen. Kamerans läge är
 * världspunkten i skärmens övre vänstra hörn, i hela pixlar. Textlagret räknar alltid med den, så att en skylt eller
 * en pratbubbla sitter kvar på sitt föremål när kameran rör sig. I kapitel 1 ryms rummen på en skärm: läget är (0, 0).
 * @typedef {{ x: number, y: number }} Kamera
 */

/**
 * Världskoordinat → skärmkoordinat, via kameran.
 * @param {{ cssSkala: number, vanster: number, topp: number }} skala @param {Kamera} kamera
 * @param {number} x @param {number} y
 */
export function varldTillSkarm(skala, kamera, x, y) {
  return rumTillSkarm(skala, x - Math.round(kamera.x), y - Math.round(kamera.y));
}

/**
 * Skärmkoordinat → världskoordinat, via kameran. inne = trycket var inne i bilden av rummet.
 * @param {{ cssSkala: number, vanster: number, topp: number }} skala @param {Kamera} kamera
 * @param {number} x @param {number} y
 */
export function skarmTillVarld(skala, kamera, x, y) {
  const p = skarmTillRum(skala, x, y);
  return { x: p.x + Math.round(kamera.x), y: p.y + Math.round(kamera.y), inne: p.x >= 0 && p.y >= 0 && p.x < RUM.bredd && p.y < RUM.hojd };
}
