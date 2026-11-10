// @ts-check
// Musiken följer platsen och stämningen, inte kapitlet (beslut 64.5). Datan säger vilken slinga som spelar var:
// kapitlet har en, ett rum (område) kan ha en egen, en scen kan ha ett undantag, och steget `musik` byter mitt i
// en scen. Räddningen spelar alltid `raddning`. Den här modulen väljer slingan och planerar pausen, utan ljud.

/** Stils sex slingor (10c v0.5). Byns slinga läggs till när Stil har gjort den. */
export const SLINGOR = /** @type {const} */ (['meny', 'spel', 'natten', 'skogen', 'raddning', 'lagerelden', 'byn']);
/** Slingan när datan inte säger något: Farfars hus på dagen, och inne i spelet där inget annat är bestämt. */
export const STANDARD = 'spel';
/** Räddningen (P15) spelar alltid den här, och tonar tillbaka till platsens slinga när den är klar. */
export const RADDNING = 'raddning';

/**
 * Det sista steget `musik` i scenen till och med steget som pågår, eller undefined om scenen inte har något där.
 * Så gäller bytet också när spelet startas om efter det (FORTSÄTT mitt i scenen).
 * @param {any} scen @param {number | undefined} stegIndex
 * @returns {string | null | undefined}
 */
export function stegetsMusik(scen, stegIndex) {
  if (!scen || !Array.isArray(scen.steg) || stegIndex === undefined) return undefined;
  for (let i = Math.min(stegIndex, scen.steg.length - 1); i >= 0; i--) {
    const st = scen.steg[i];
    if (st && st.typ === 'musik') return st.slinga ?? null;
  }
  return undefined;
}

/**
 * Slingan som ska spela inne i spelet. Ordningen: räddningen, steget `musik` i scenen, scenens `musik`, rummets
 * `musik` (i kapitlets `rum`), kapitlets `musik`, och sist `spel`. null betyder tyst (en scen eller ett steg kan
 * vilja tystnad). Menyerna (meny) väljs inte här.
 * @param {{ kapitel?: any, scen?: any, rumId?: string | null, stegIndex?: number, raddning?: boolean }} lage
 * @returns {string | null}
 */
export function musikFor({ kapitel, scen, rumId, stegIndex, raddning }) {
  if (raddning) return RADDNING;
  const steg = stegetsMusik(scen, stegIndex);
  if (steg !== undefined) return steg;
  if (scen && scen.musik !== undefined) return scen.musik;
  const rum = rumId && Array.isArray(kapitel?.rum) ? kapitel.rum.find((/** @type {any} */ r) => r.id === rumId) : null;
  if (rum && rum.musik !== undefined) return rum.musik;
  if (kapitel && kapitel.musik !== undefined) return kapitel.musik;
  return STANDARD;
}

/** Pausen (beslut 64.5, Stil 10c): efter två varv tonas slingan ut och vilar 20–40 s. Inte för räddningen. */
export const VARV_FORE_PAUS = 2;
export const PAUS_S = /** @type {const} */ ([20, 40]);
/** Hur lång tid slingan tonas ut före pausen (sekunder). */
export const TONA_UT_FORE_PAUS_S = 2.5;

/**
 * Planen för en slinga som startar: hur länge den spelar, hur länge den tonas ut på slutet och hur länge den vilar.
 * null = ingen paus (räddningen, eller en slinga utan längd).
 * @param {string} namn @param {number} varvS ett varv i sekunder (loopEnd − loopStart) @param {number} [slump] 0–1
 * @returns {{ spelaS: number, tonaUtS: number, vilaS: number } | null}
 */
export function pausPlan(namn, varvS, slump = Math.random()) {
  if (namn === RADDNING || !(varvS > 0)) return null;
  const s = Math.min(1, Math.max(0, slump));
  return { spelaS: VARV_FORE_PAUS * varvS, tonaUtS: Math.min(TONA_UT_FORE_PAUS_S, varvS / 4), vilaS: PAUS_S[0] + (PAUS_S[1] - PAUS_S[0]) * s };
}
