// @ts-check
// Höjdnivåer i ett rum (A Link to the Past: trappor och stegar går man på riktigt). En upphöjd yta (kartans typ
// "yta" med egenskapen niva, t.ex. kullen med krönet) har kanter som inte går att gå över. Man kommer upp och ned
// bara på en förbindelse (kartans typ "trappa" eller "stege") som ligger över kanten. Hjälten är på en nivå i taget,
// och han når bara saker på sin egen nivå. Ren logik: inga beroenden utom fötternas mått.
import { FOT } from './vag.js';

/** @typedef {import('./rumslayout.js').Objekt} Objekt */
/** @typedef {{ x: number, y: number }} Punkt */

/**
 * @param {Objekt[]} objekt rummets objekt
 */
export function skapaNivaer(objekt) {
  const ytor = objekt.filter((o) => o.sort === 'yta' && !o.forbinder && (o.niva ?? 0) > 0);
  const forbindelser = objekt.filter((o) => o.sort === 'yta' && !!o.forbinder);
  const inne = (/** @type {Objekt} */ o, /** @type {number} */ x, /** @type {number} */ y) => x >= o.x && x <= o.x + o.b && y >= o.y && y <= o.y + o.h;
  /** Nivån i en punkt: den högsta ytan som innehåller den, annars marken (0). */
  const nivaI = (/** @type {number} */ x, /** @type {number} */ y) => ytor.reduce((n, o) => (inne(o, x, y) ? Math.max(n, o.niva ?? 0) : n), 0);
  const iForbindelse = (/** @type {number} */ x, /** @type {number} */ y) => forbindelser.some((o) => inne(o, x, y));
  /** Fötternas fyra hörn. @param {Punkt} p */
  const horn = (p) => [[p.x - FOT.b / 2, p.y - FOT.h], [p.x + FOT.b / 2, p.y - FOT.h], [p.x - FOT.b / 2, p.y], [p.x + FOT.b / 2, p.y]];
  const mitt = (/** @type {Punkt} */ p) => ({ x: p.x, y: p.y - FOT.h / 2 });

  return {
    /** Har rummet höjdnivåer? */
    finns: ytor.length > 0,
    /** Nivåerna i rummet, marken först. */
    nivaer: [0, ...new Set(ytor.map((o) => o.niva ?? 1))],
    /**
     * Får fötterna stå här när han är på nivån n? Alla fyra hörnen ska stå på nivån eller på en förbindelse.
     * @param {Punkt} p @param {number} n
     */
    tillaten(p, n) { return horn(p).every(([x, y]) => iForbindelse(x, y) || nivaI(x, y) === n); },
    /** Nivån där fötterna står (mitten av fötterna). @param {Punkt} p */
    nivaVid(p) { const m = mitt(p); return nivaI(m.x, m.y); },
    /** Förbindelsen (trappan, stegen) som fötterna står på, om någon. @param {Punkt} p */
    forbindelse(p) { const m = mitt(p); return forbindelser.find((o) => inne(o, m.x, m.y)) ?? null; },
    /** Nivån ett föremål står på (där dess nederkant är). En yta har sin egen nivå. @param {Objekt} o */
    nivaFor(o) { return o.sort === 'yta' && !o.forbinder ? (o.niva ?? 1) : nivaI(o.x + o.b / 2, o.y + o.h - 1); },
    /**
     * Punkten mitt på förbindelsen närmast en punkt: där en väg mellan två nivåer går.
     * @param {Punkt} p @returns {Punkt | null}
     */
    passage(p) {
      const f = [...forbindelser].sort((a, c) => Math.hypot(a.x + a.b / 2 - p.x, a.y + a.h / 2 - p.y) - Math.hypot(c.x + c.b / 2 - p.x, c.y + c.h / 2 - p.y))[0];
      return f ? { x: Math.round(f.x + f.b / 2), y: Math.round(f.y + f.h / 2 + FOT.h / 2) } : null;
    },
    forbindelser,
  };
}
