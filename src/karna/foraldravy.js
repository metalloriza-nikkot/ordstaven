// @ts-check
// Den minimala föräldravyn (T4): hur det går per pusseltyp, ur lärandehistoriken. Visar andelen rätt på första
// försöket utan hjälp, och för läsvalen vad slumpen hade gett (granskningen, punkt 1 B), så att det syns om han
// läser eller gissar. Ren logik: historiken och kapitlens pussel skickas in.
import { valjVariant, tolkaNiva } from './lasmotor.js';

/** @typedef {{ pussel_id: string, typ: string, niva: string, ratt: boolean, antal_forsok?: number, hjalp_anvand?: boolean, tid?: number }} Forsok */

/**
 * @param {Forsok[]} historik lärandehistoriken (larande.historik)
 * @param {any[]} pussel alla kapitlens pussel (för antalet alternativ i läsvalen)
 * @returns {{ typ: string, slag: 'L' | 'S', antal: number, rattForsta: number, hjalp: number, slump: number | null, sekunder: number | null }[]}
 *   slump = andelen rätt på första försöket om han hade gissat (läsval), sekunder = mediantiden
 */
export function sammanfatta(historik, pussel) {
  const def = new Map(pussel.map((p) => [p.id, p]));
  /** @type {Map<string, { typ: string, slag: 'L' | 'S', antal: number, rattForsta: number, hjalp: number, slumpar: number[], tider: number[] }>} */
  const per = new Map();
  for (const h of historik) {
    const slag = /** @type {'L' | 'S'} */ (String(h.niva || '').startsWith('S') ? 'S' : 'L');
    const r = per.get(h.typ) ?? { typ: h.typ, slag, antal: 0, rattForsta: 0, hjalp: 0, slumpar: [], tider: [] };
    r.antal++;
    if (h.ratt && !h.hjalp_anvand) r.rattForsta++;
    if (h.hjalp_anvand) r.hjalp++;
    if (Number.isFinite(h.tid)) r.tider.push(/** @type {number} */ (h.tid));
    // läsval: slumpen hade gett 1 av antalet alternativ i varianten han fick
    const p = def.get(h.pussel_id);
    // varianten han fick: den högsta som inte är över nivån (som när pusslet valdes)
    let n = 0;
    try { if (p?.varianter && /^L/.test(h.niva)) n = valjVariant(p.varianter, tolkaNiva(h.niva).tal)[1]?.alternativ?.length ?? 0; } catch (e) { n = 0; }
    if (p?.typ === 'P1_las_och_valj' && n) r.slumpar.push(1 / n);
    per.set(h.typ, r);
  }
  const median = (/** @type {number[]} */ x) => { if (!x.length) return null; const s = [...x].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  return [...per.values()].map((r) => ({
    typ: r.typ, slag: r.slag, antal: r.antal, rattForsta: r.rattForsta, hjalp: r.hjalp,
    slump: r.slumpar.length ? r.slumpar.reduce((a, b) => a + b, 0) / r.slumpar.length : null,
    sekunder: r.tider.length ? Math.round(/** @type {number} */ (median(r.tider)) / 100) / 10 : null,
  })).sort((a, b) => (a.slag === b.slag ? b.antal - a.antal : a.slag === 'L' ? -1 : 1));
}
