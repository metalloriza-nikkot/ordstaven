// @ts-check
// SALDO-listan för "är det ett ord?" i skrivpusslen (beslut 76.2 och 77.2). Den hämtas först när ett skrivpussel
// öppnas, en gång per session, och förcachas av service workern så att den fungerar utan nät. Listan är
// prefixkodad (verktyg/ordlista/saldo.py) och packas upp i karna/skrivord.js.
// SALDO: Språkbanken Text, Göteborgs universitet, CC BY 4.0 (assets/LICENSER.md).

import { avkodaOrdlista } from '../karna/skrivord.js';
import ordUrl from '../../assets/ordlista/ord.txt?url';
import sparrUrl from '../../assets/ordlista/sparr.txt?url';

/** @type {Promise<{ ord: Set<string>, sparr: Set<string> } | null> | null} */
let laddar = null;

/**
 * Hämta listan (en gång). Ger null om den inte gick att hämta: då avgör spelets egna ordlistor, som förut.
 * @returns {Promise<{ ord: Set<string>, sparr: Set<string> } | null>}
 */
export function laddaOrdlista() {
  laddar ??= (async () => {
    try {
      const [o, s] = await Promise.all([ordUrl, sparrUrl].map(async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(String(r.status)); return r.text(); }));
      return { ord: avkodaOrdlista(o), sparr: avkodaOrdlista(s) };
    } catch {
      laddar = null; // försök igen nästa gång ett skrivpussel öppnas
      return null;
    }
  })();
  return laddar;
}
