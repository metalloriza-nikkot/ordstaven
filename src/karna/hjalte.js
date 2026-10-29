// @ts-check
// Hjältens lager (T2): formen är fast (spelarens figur). Huden och dräkten är palettbyten som väljs i början,
// hjälmdekoren och ryggsäcken är saker han hittar. Allt han hittar tas på direkt (granskningen av kapitel 1),
// och garderoben finns för att byta tillbaka. Ren logik på sparningens hjälte (spelare.hjalte).

/** Sakerna han kan ha på sig, i den ordning garderoben visar dem. */
export const LAGER = Object.freeze(['hjalmdekor', 'ryggsack']);

/** @param {any} hjalte */
function sakra(hjalte) {
  hjalte.lager = { hjalmdekor: null, ryggsack: null, ...(hjalte.lager || {}) };
  hjalte.garderob = hjalte.garderob || [];
  return hjalte;
}

/**
 * Hjälten får en sak. Den tas på direkt och läggs i garderoben (en gång).
 * @param {any} hjalte @param {'hjalmdekor' | 'ryggsack'} sort @param {string} id
 * @returns {boolean} om saken är ny (då glimtar pausknappen)
 */
export function geSak(hjalte, sort, id) {
  const h = sakra(hjalte);
  const ny = !h.garderob.some((/** @type {any} */ x) => x.sort === sort && x.id === id);
  if (ny) h.garderob.push({ sort, id });
  h.lager[sort] = id;
  return ny;
}

/**
 * Byt i garderoben: ta på en sak han har, eller ta av (null).
 * @param {any} hjalte @param {'hjalmdekor' | 'ryggsack'} sort @param {string | null} id @returns {boolean} om något ändrades
 */
export function bytLager(hjalte, sort, id) {
  const h = sakra(hjalte);
  if (id !== null && !h.garderob.some((/** @type {any} */ x) => x.sort === sort && x.id === id)) return false;
  if (h.lager[sort] === id) return false;
  h.lager[sort] = id;
  return true;
}

/** Det han har på sig. @param {any} hjalte @returns {{ hjalmdekor: string | null, ryggsack: string | null }} */
export const lagerFor = (hjalte) => sakra(hjalte).lager;
