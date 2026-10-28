// @ts-check
// Provsidan hämtar sina exempel ur innehållet (content/), aldrig ur koden: ändrar Innehåll en text syns det här.
// En källa pekar ut ett steg, ett pussel eller ett fält med id:n. Ren logik, inga beroenden.

/**
 * @typedef {{ kap?: string, scen?: string, pussel?: string, steg?: Record<string, any>, nr?: number, falt?: string, aventyr?: string }} Kalla
 * kap: kapitlets id. scen eller pussel: id i kapitlet. steg: egenskaper som steget ska ha (typ, talare …),
 * nr: vilket av stegen som passar (0 = första, -1 = sista). falt: sökväg med punkter i det som hittats
 * ("varianter.L2.text"). aventyr: ett fält i aventyr.json ("sparpunkt_fraga").
 */

/** @param {any} obj @param {string | undefined} sokvag */
export function falt(obj, sokvag) {
  if (!sokvag) return obj;
  return sokvag.split('.').reduce((o, k) => (o == null ? undefined : Array.isArray(o) && !/^\d+$/.test(k) ? o.find((x) => x && x.id === k) : o[k]), obj);
}

/** @param {any} st @param {Record<string, any>} villkor */
const passar = (st, villkor) => Object.entries(villkor).every(([k, v]) => st[k] === v);

/**
 * Hämta det en källa pekar på. Kastar ett fel med källan om den inte finns, så att provsidan (och testet)
 * säger till när innehållet har ändrats.
 * @param {Kalla} k @param {{ kapitel: any[], aventyr: any }} innehall
 */
export function hamta(k, { kapitel, aventyr }) {
  const fel = (/** @type {string} */ vad) => new Error(`${vad} saknas: ${JSON.stringify(k)}`);
  if (k.aventyr) { const v = falt(aventyr, k.aventyr); if (v === undefined) throw fel('fältet'); return v; }
  const kap = kapitel.find((x) => x.id === k.kap);
  if (!kap) throw fel('kapitlet');
  let obj;
  if (k.pussel) obj = kap.pussel.find((/** @type {any} */ p) => p.id === k.pussel);
  else if (k.scen) {
    const scen = kap.scener.find((/** @type {any} */ s) => s.id === k.scen);
    if (scen && k.steg) {
      const alla = scen.steg.filter((/** @type {any} */ st) => passar(st, /** @type {Record<string, any>} */ (k.steg)));
      obj = alla.at(k.nr ?? 0);
    } else obj = scen;
  }
  if (obj === undefined) throw fel(k.pussel ? 'pusslet' : 'scenen eller steget');
  const v = falt(obj, k.falt);
  if (v === undefined) throw fel('fältet');
  return v;
}
