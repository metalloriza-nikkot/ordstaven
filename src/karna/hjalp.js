// @ts-check
// Hjälpens timing. Läsningen ska vara den snabbaste vägen: hjälp som pekar på svaret (ungen lutar sig mot rätt
// dörr, nosar på rätt låda) får inte komma så tidigt att det lönar sig att vänta i stället för att läsa.
// Hjälp som upprepar frågan (tankebubblan blinkar, Farfar ropar igen) får komma som förut.
// Ren logik: tiden kommer in som argument.

/** Tidigast efter första felet, eller efter 4 sekunder per alternativ och minst 12 sekunder. */
export const PEKNING = Object.freeze({ minMs: 12000, perAlternativMs: 4000 });

/**
 * Millisekunder tills hjälp som pekar på svaret får komma. 0 = nu.
 * @param {{ antalAlternativ: number, antalFel: number, sedanStartMs: number }} lage
 * @param {{ minMs: number, perAlternativMs: number }} [regel]
 */
export function pekningOmMs({ antalAlternativ, antalFel, sedanStartMs }, regel = PEKNING) {
  if (antalFel > 0) return 0;
  const tidigast = Math.max(regel.minMs, regel.perAlternativMs * antalAlternativ);
  return Math.max(0, Math.round(tidigast - sedanStartMs));
}

/**
 * Vilken hjälp har kommit sedan pusslet började? Till loggen: kom en knuff eller en pekning före valet?
 * @param {() => number} nu millisekunder
 */
export function skapaHjalpSpar(nu) {
  const start = nu();
  let knuff = false, pekning = false;
  return {
    /** Millisekunder sedan pusslet började. */
    sedanStart: () => nu() - start,
    /** En knuff kom. @param {boolean} pekar om den pekade på svaret */
    knuff(pekar) { knuff = true; if (pekar) pekning = true; },
    /** Ungen pekar på svaret (efter flera fel). */
    pekning() { pekning = true; },
    /** @returns {{ knuff_fore: boolean, pekning_fore: boolean }} */
    fore: () => ({ knuff_fore: knuff, pekning_fore: pekning }),
  };
}

/** Knufftiden på läsplattan följer textmängden (granskningen av kapitel 1): ca 11 sekunder per mening, minst 9. */
export const KNUFFTID = Object.freeze({ minMs: 9000, perMeningMs: 11000 });

/**
 * Hur många meningar en text har: varje rad som slutar med punkt, utrop eller fråga räknas, och en rad med
 * flera ord utan skiljetecken räknas som en. Enstaka ord (BÄR, FILT) räknas inte.
 * @param {string | string[] | null | undefined} text
 */
export function antalMeningar(text) {
  if (!text) return 0;
  let n = 0;
  for (const rad of Array.isArray(text) ? text : [text]) {
    const delar = rad.split(/[.!?…]+/).map((d) => d.trim()).filter(Boolean);
    for (const d of delar) if (d.split(/\s+/).length > 1) n++;
  }
  return n;
}

/**
 * Millisekunder tills en knuff på läsplattan får komma: 11 s per mening i lästexten och i alternativen, minst 9 s.
 * @param {{ text?: string | string[] | null, alternativ?: { ord?: string }[] }} plattan
 * @param {{ minMs: number, perMeningMs: number }} [regel]
 */
export function knufftidMs({ text, alternativ = [] }, regel = KNUFFTID) {
  const n = antalMeningar(text) + alternativ.reduce((s, a) => s + antalMeningar(a.ord), 0);
  return Math.max(regel.minMs, n * regel.perMeningMs);
}
