// Farfars "Var var vi?" när spelet startar igen (F2, brief 9a och 10e, Innehålls förslag i dokument 18).
// Kapitlets `var_var_vi` har en post per pass: ett ord att läsa med en bild, en kort påminnelse och en lång.
// Ren logik: inget Phaser, ingen DOM.

/** Lång tid: mer än så här många dygn sedan han spelade senast (Innehålls förslag, ledningen får ändra). */
export const LANG_TID_DAGAR = 3;
const DYGN_MS = 24 * 60 * 60 * 1000;

/**
 * Påminnelsen när spelet startar igen, eller null.
 * - Börjar han ett pass (den första scenen i passet, från dess första steg): passets påminnelse, kort eller lång
 *   efter hur länge sedan det var. Den ersätter scenens egen `vid_omstart`.
 * - Mitt i ett pass: efter lång tid den långa påminnelsen och sedan scenens `vid_omstart`. Efter kort tid ingen,
 *   bara `vid_omstart` som förut.
 * - Ett pass utan post (prologens första pass, eller innan Innehåll har skrivit texten): null, och scenens
 *   `vid_omstart` hörs som förut.
 * @param {{ kapitel: any, scenIndex: number, steg: number, senast: number | null, nu: number, dagar?: number }} a
 *   senast = när han spelade senast (ms), null om det inte går att veta
 * @returns {{ pass: number, lang: boolean, ord: { ord: string, bild?: string } | null, repliker: any[], ersatterOmstart: boolean } | null}
 */
export function varVarVi({ kapitel, scenIndex, steg, senast, nu, dagar = LANG_TID_DAGAR }) {
  const scen = kapitel?.scener?.[scenIndex];
  if (!scen || scen.frivillig) return null;
  const post = (kapitel.var_var_vi || []).find((/** @type {any} */ p) => p.pass === scen.pass);
  if (!post) return null;
  const lang = senast !== null && Number.isFinite(senast) && nu - senast > dagar * DYGN_MS;
  const forstaIPasset = !kapitel.scener.slice(0, scenIndex).some((/** @type {any} */ s) => !s.frivillig && s.pass === scen.pass);
  const passetBorjar = forstaIPasset && (steg ?? 0) === 0;
  if (!passetBorjar && !lang) return null;
  // allt läses upp (det är en påminnelse, inte en läsuppgift): bara ordet läser han själv
  const repliker = (lang ? post.lang : post.kort).map((/** @type {any} */ r) => ({ upplast: true, ...r, typ: 'replik' }));
  return { pass: scen.pass, lang, ord: post.ord ?? null, repliker, ersatterOmstart: passetBorjar };
}

/**
 * När han spelade senast, ur sparningen (tidpunkten när den sparades). null när den saknas eller är trasig.
 * @param {any} tillstand @returns {number | null}
 */
export function senastSpelad(tillstand) {
  const t = Date.parse(tillstand?.sparad ?? '');
  return Number.isFinite(t) ? t : null;
}
