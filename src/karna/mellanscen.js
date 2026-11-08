// @ts-check
// Mellanscenernas text för den vuxne (beslut 65). En mellanscen beskriver vad som händer. I gråboxen stod
// beskrivningen i en ruta, och regeln var att den försvinner när det som händer syns (granskningen A 9).
// Grind C kräver att spelet går att spela utan en vuxen, så i ett klart kapitel visas ingen beskrivning.

/**
 * Visar mellanscenen sin beskrivning i rutan? Bara när den inte har någon bild (Stils animation) och inte är
 * markerad `syns_redan` (det som händer syns redan: rummet, en animation eller nästa steg visar det).
 * Att varje `bild` finns prövar ett eget test (tillgangar.test.js).
 * @param {any} st ett steg
 */
export const visarBeskrivning = (st) => !!st && st.typ === 'mellanscen' && !!st.beskrivning && !st.bild && !st.syns_redan;

/**
 * Var mellanscenerna som visar sin beskrivning står: i scenerna och i rummens frivilliga föremål.
 * @param {any} kapitel @returns {{ plats: string, beskrivning: string }[]}
 */
export function beskrivningarSomVisas(kapitel) {
  /** @type {{ plats: string, beskrivning: string }[]} */
  const ut = [];
  const steg = (/** @type {any[]} */ lista, /** @type {string} */ plats) => (lista || []).forEach((st, i) => { if (visarBeskrivning(st)) ut.push({ plats: `${plats} steg ${i}`, beskrivning: st.beskrivning }); });
  for (const s of kapitel?.scener || []) steg(s.steg, s.id);
  for (const r of kapitel?.rum || []) for (const f of r.frivilligt || []) steg(f.steg, `rum ${r.id} frivilligt ${f.foremal}`);
  return ut;
}

/**
 * Samma för äventyrets egna steg (aventyr.json): SLUTA FÖR IDAG och slutrutan när nästa kapitel är låst.
 * @param {any} aventyr @returns {{ plats: string, beskrivning: string }[]}
 */
export function aventyretsBeskrivningar(aventyr) {
  /** @type {{ plats: string, beskrivning: string }[]} */
  const ut = [];
  const steg = (/** @type {any[]} */ lista, /** @type {string} */ plats) => (lista || []).forEach((st, i) => { if (visarBeskrivning(st)) ut.push({ plats: `${plats} steg ${i}`, beskrivning: st.beskrivning }); });
  steg(aventyr?.sluta_for_idag?.fore_ungen, 'sluta_for_idag.fore_ungen');
  steg(aventyr?.sluta_for_idag?.med_ungen, 'sluta_for_idag.med_ungen');
  steg(aventyr?.kapitel_last?.steg, 'kapitel_last');
  return ut;
}

/** Hur länge berättelsen väntar vid en mellanscen som redan syns (ms), så att det hinner synas. */
export const SYNS_REDAN_MS = 800;
