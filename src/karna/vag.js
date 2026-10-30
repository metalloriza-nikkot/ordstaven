// @ts-check
// Kollision och vägsökning i ett rum. Figurerna kolliderar med fötterna (en låg ruta vid fötterna),
// så att huvudet kan skymma saker bakom, som i spel snett uppifrån. Ett tryck på golvet eller ett objekt
// ger en väg runt hindren (A* på ett rutnät à 4 pixlar, sedan rakare med fri sikt).
import { RUM } from './skalning.js';
import { FIGUR } from './rorelse.js';

/** Fötternas ruta, centrerad i x, med nederkanten på positionen. */
export const FOT = Object.freeze({ b: 12, h: 6 });
const STEG = 4;
const MIN = { x: FIGUR.bredd / 2, y: FIGUR.hojd };

/** @typedef {{ x: number, y: number, b: number, h: number }} Ruta */
/** @typedef {{ x: number, y: number }} Punkt */

/**
 * En stig som syns skär igenom hindren den ligger över: hålet i häcken bakom stenen (kapitel 1). Utan stigen är
 * häcken hel. Varje hinder som en öppning överlappar delas i upp till fyra rutor runt öppningen.
 * @param {Ruta[]} hinder @param {Ruta[]} oppningar @returns {Ruta[]}
 */
export function skarIgenom(hinder, oppningar) {
  let ut = hinder.map((r) => ({ x: r.x, y: r.y, b: r.b, h: r.h }));
  for (const o of oppningar) {
    /** @type {Ruta[]} */
    const nya = [];
    for (const r of ut) {
      const x0 = Math.max(r.x, o.x), x1 = Math.min(r.x + r.b, o.x + o.b), y0 = Math.max(r.y, o.y), y1 = Math.min(r.y + r.h, o.y + o.h);
      if (x0 >= x1 || y0 >= y1) { nya.push(r); continue; }
      if (y0 > r.y) nya.push({ x: r.x, y: r.y, b: r.b, h: y0 - r.y }); // ovanför öppningen
      if (y1 < r.y + r.h) nya.push({ x: r.x, y: y1, b: r.b, h: r.y + r.h - y1 }); // nedanför
      if (x0 > r.x) nya.push({ x: r.x, y: y0, b: x0 - r.x, h: y1 - y0 }); // till vänster
      if (x1 < r.x + r.b) nya.push({ x: x1, y: y0, b: r.x + r.b - x1, h: y1 - y0 }); // till höger
    }
    ut = nya;
  }
  return ut;
}

/**
 * @param {Ruta[]} hinder
 * @param {(p: Punkt) => boolean} [tillaten] en regel till för var fötterna får stå (höjdnivåerna: kanten på kullen)
 * @param {{ bredd: number, hojd: number }} [S] områdets storlek (en skärm, eller större när kameran följer hjälten)
 */
export function skapaHinder(hinder, tillaten = () => true, S = RUM) {
  const MAX = { x: S.bredd - FIGUR.bredd / 2, y: S.hojd };
  /** Är punkten (fötterna) fri? @param {Punkt} p */
  const fri = (p) => {
    if (p.x < MIN.x - 0.01 || p.x > MAX.x + 0.01 || p.y < MIN.y - 0.01 || p.y > MAX.y + 0.01) return false;
    if (!tillaten(p)) return false;
    const v = p.x - FOT.b / 2, h = p.x + FOT.b / 2, o = p.y - FOT.h, n = p.y;
    for (const r of hinder) if (h > r.x && v < r.x + r.b && n > r.y && o < r.y + r.h) return false;
    return true;
  };

  /** Fri sikt mellan två punkter (provas varannan pixel). @param {Punkt} a @param {Punkt} b */
  const sikt = (a, b) => {
    const l = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(l / 2));
    for (let i = 1; i <= n; i++) if (!fri({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n })) return false;
    return true;
  };

  const kol = Math.floor((MAX.x - MIN.x) / STEG) + 1, rad = Math.floor((MAX.y - MIN.y) / STEG) + 1;
  const punkt = (/** @type {number} */ i) => ({ x: MIN.x + (i % kol) * STEG, y: MIN.y + Math.floor(i / kol) * STEG });
  const index = (/** @type {Punkt} */ p) => {
    const c = Math.max(0, Math.min(kol - 1, Math.round((p.x - MIN.x) / STEG)));
    const r = Math.max(0, Math.min(rad - 1, Math.round((p.y - MIN.y) / STEG)));
    return r * kol + c;
  };
  /** @type {boolean[]} */
  const ledig = Array.from({ length: kol * rad }, (_, i) => fri(punkt(i)));

  /** Närmaste fria punkt (för mål som ligger i ett hinder). @param {Punkt} p */
  function narmasteFria(p) {
    if (fri(p)) return p;
    let bast = null, d = Infinity;
    for (let i = 0; i < ledig.length; i++) {
      if (!ledig[i]) continue;
      const q = punkt(i), dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (dd < d) { d = dd; bast = q; }
    }
    return bast ?? p;
  }

  /**
   * Väg från a till b runt hindren. Tom lista om målet inte går att nå.
   * @param {Punkt} fran @param {Punkt} till @returns {Punkt[]} punkter att gå till i tur och ordning
   */
  function vag(fran, till) {
    const mal = narmasteFria(till);
    if (sikt(fran, mal)) return [mal];
    const start = index(fran), slut = index(mal);
    const g = new Map([[start, 0]]), forra = new Map();
    const h = (/** @type {number} */ i) => { const p = punkt(i), q = punkt(slut); const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    /** @type {[number, number][]} öppna: [f, index] */
    const oppna = [[h(start), start]];
    const stangd = new Set();
    while (oppna.length) {
      let bi = 0; for (let k = 1; k < oppna.length; k++) if (oppna[k][0] < oppna[bi][0]) bi = k;
      const [, nu] = oppna.splice(bi, 1)[0];
      if (nu === slut) break;
      if (stangd.has(nu)) continue;
      stangd.add(nu);
      const c = nu % kol, r = Math.floor(nu / kol);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= kol || nr >= rad) continue;
        const ni = nr * kol + nc;
        if (!ledig[ni] && ni !== slut) continue;
        if (dr && dc && (!ledig[r * kol + nc] || !ledig[nr * kol + c])) continue; // inga hörn
        const ng = (g.get(nu) ?? 0) + (dr && dc ? 1.414 : 1) * STEG;
        if (ng < (g.get(ni) ?? Infinity)) { g.set(ni, ng); forra.set(ni, nu); oppna.push([ng + h(ni), ni]); }
      }
    }
    if (!forra.has(slut) && start !== slut) return [];
    // bygg vägen och gör den rakare: hoppa över punkter man ser förbi
    const rutt = [mal];
    for (let i = forra.get(slut); i !== undefined && i !== start; i = forra.get(i)) rutt.unshift(punkt(i));
    const rak = [];
    let fr = fran;
    for (let i = 0; i < rutt.length; i++) {
      let langst = i;
      for (let j = rutt.length - 1; j > i; j--) if (sikt(fr, rutt[j])) { langst = j; break; }
      rak.push(rutt[langst]); fr = rutt[langst]; i = langst;
    }
    return rak;
  }

  /**
   * Gå med piltangenterna: glid längs hindren i stället för att fastna.
   * @param {Punkt} pos @param {number} dx @param {number} dy
   */
  function glid(pos, dx, dy) {
    const hel = { x: pos.x + dx, y: pos.y + dy };
    if (fri(hel)) return hel;
    if (dx && fri({ x: pos.x + dx, y: pos.y })) return { x: pos.x + dx, y: pos.y };
    if (dy && fri({ x: pos.x, y: pos.y + dy })) return { x: pos.x, y: pos.y + dy };
    return pos;
  }

  return { fri, sikt, vag, glid, narmasteFria };
}
