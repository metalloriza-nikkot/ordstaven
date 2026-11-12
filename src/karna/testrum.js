// Testrummet för fritt skrivande (76.9, Teknik 41): ett tomt rum med Innehålls skrivuppgifter
// (content/testrum-skriv.json), på en egen sparplats. Det här bygger ett kapitel av uppgifterna, så att spelet
// visar dem som skrivpusslen i kapitel 2 (P11 med tangentbordet). Ingen text står här: allt han ser och hör kommer
// ur uppgifterna. Får inte importera Phaser eller röra DOM.

/** Kapitlets id (kap-90, ett nummer som inget äventyr använder), rummets och scenens id, sparplatsen och antalet fält. */
export const TESTRUM = { kapitel: 'kap-90', nummer: 90, rum: 'testrummet', scen: 'tr_skriv', plats: 'testrum', falt: 8 };

/**
 * Kapitlet i testrummet: ett rum utan karta och en scen med en skrivuppgift i taget, i filens ordning.
 * @param {{ meta?: any, uppgifter: any[] }} data Innehålls fil
 * @returns {any} ett kapitel i samma form som kap-*.json
 */
export function testrumKapitel(data) {
  const uppgifter = (data?.uppgifter || []).filter((u) => u && u.id && u.typ === 'P11_formel');
  return {
    format: 2,
    id: TESTRUM.kapitel,
    kapitel: TESTRUM.nummer,
    meta: { namn: 'Testrummet', version: data?.meta?.version ?? '0', testrum: true },
    rum: [{ id: TESTRUM.rum, namn: 'Testrummet', innehall: [] }],
    scener: [{ id: TESTRUM.scen, pass: 1, rum: TESTRUM.rum, steg: uppgifter.map((u) => ({ typ: 'pussel', pussel_id: u.id })) }],
    // lika många fält i varje uppgift (82.2): fälten får inte säga hur långt ordet är, eftersom uppgiften är att se
    // vilka ord han väljer själv. Fälten växer om han skriver fler bokstäver.
    pussel: uppgifter.map((u) => ({ ...structuredClone(u), antal_falt: TESTRUM.falt })),
    uppdrag: [],
    var_var_vi: [],
  };
}

/**
 * Äventyret i testrummet: samma talare och inställningar som äventyret, men bara testrummets kapitel och inga lås.
 * @param {any} aventyr
 */
export function testrumAventyr(aventyr) {
  return { ...aventyr, kapitel: [TESTRUM.kapitel], kapitel_last: undefined };
}
