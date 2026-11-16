// @ts-check
// Krockarna i loggen (beslut 97.6): när hjälten går mot ett hinder med piltangenterna i mer än ungefär en sekund
// skriver loggen en rad med hindrets id. Då syns ett "osynligt hinder" i loggen. Ingen Phaser, ingen DOM.
import { FOT } from './vag.js';
import { FIGUR } from './rorelse.js';

/** Hur länge han ska ha gått mot hindret innan det loggas. */
export const KROCK_MS = 1000;

/** @typedef {{ x: number, y: number, b: number, h: number, id?: string }} Ruta */

/**
 * Vilket hinder står i vägen om fötterna flyttas en bit åt hållet? Rummets kant heter `kanten`.
 * @param {{ x: number, y: number }} pos fötterna
 * @param {{ x: number, y: number }} riktning piltangenterna (-1, 0 eller 1 per led)
 * @param {Ruta[]} rutor hindren, med id
 * @param {{ bredd: number, hojd: number }} storlek rummet
 * @param {number} [steg] hur långt fram det provas (px)
 * @returns {string | null}
 */
export function hinderFramfor(pos, riktning, rutor, storlek, steg = 3) {
  const l = Math.hypot(riktning.x, riktning.y);
  if (!l) return null;
  const p = { x: pos.x + (riktning.x / l) * steg, y: pos.y + (riktning.y / l) * steg };
  const v = p.x - FOT.b / 2, h = p.x + FOT.b / 2, o = p.y - FOT.h, n = p.y;
  for (const r of rutor) if (h > r.x && v < r.x + r.b && n > r.y && o < r.y + r.h) return r.id ?? 'hinder';
  if (p.x < FIGUR.bredd / 2 || p.x > storlek.bredd - FIGUR.bredd / 2 || p.y < FIGUR.hojd || p.y > storlek.hojd) return 'kanten';
  return null;
}

/**
 * Räknar hur länge han har gått mot samma hinder utan att komma framåt, och säger till en gång per hinder och försök.
 * @param {number} [grans] ms
 */
export function krockVakt(grans = KROCK_MS) {
  let tid = 0, /** @type {string | null} */ mot = null, /** @type {string | null} */ loggad = null;
  return {
    /**
     * @param {number} dtMs
     * @param {boolean} forsoker han håller en piltangent
     * @param {number} andel hur stor del av steget han kom (0 = stod still)
     * @param {string | null} hinder hindret framför honom
     * @returns {string | null} hindret att logga, en gång när gränsen passeras
     */
    steg(dtMs, forsoker, andel, hinder) {
      // han kom fram (eller gled längs hindret): räkningen börjar om
      if (!forsoker || andel > 0.25 || !hinder) { tid = 0; mot = null; if (!forsoker) loggad = null; return null; }
      if (hinder !== mot) { mot = hinder; tid = 0; }
      tid += dtMs;
      if (tid >= grans && loggad !== hinder) { loggad = hinder; return hinder; }
      return null;
    },
  };
}
