// @ts-check
// Säker lagring: localStorage när det går, annars minne (privat läge i Safari kan kasta fel).

/** @returns {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void, typ: string }} */
export function skapaLagring() {
  try {
    const ls = window.localStorage;
    const k = 'ordstaven__test';
    ls.setItem(k, '1'); ls.removeItem(k);
    return {
      typ: 'localStorage',
      getItem: (n) => ls.getItem(n),
      setItem: (n, v) => ls.setItem(n, v), // kan kasta vid full kvot, fångas av anroparen
      removeItem: (n) => ls.removeItem(n),
    };
  } catch (e) {
    /** @type {Map<string, string>} */
    const m = new Map();
    return {
      typ: 'minne',
      getItem: (n) => (m.has(n) ? /** @type {string} */ (m.get(n)) : null),
      setItem: (n, v) => { m.set(n, String(v)); },
      removeItem: (n) => { m.delete(n); },
    };
  }
}

/** Be webbläsaren att inte rensa spelets data (viktigt på iPad). */
export async function begarBestandigLagring() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (e) { /* stöds inte */ }
  return false;
}
