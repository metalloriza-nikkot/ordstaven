// @ts-check
// Motståndaren i ordduellen som en figur (beslut 91.5, Stils halmdocka). Reglerna för vilken bild som visas,
// utan Phaser: scenen (scener/duellfigur.js) frågar här.
//
// Stils bilder heter <figur>_<läge>_<nr>_<utrustning> och <figur-utan-n>_sak_<sak>_<nr>:
//   lägena grund, ropar, forvirrad, backar, narmare, och vinsten (trillar, eller snurrar och sedan sitter);
//   utrustningen hel, eller utan_<sak>[_<sak>] för de saker som syns på figuren och har trillat av.
// Vilken sak som trillar av står i reaktionens text (vid_ratt.handling, "och dess hatt trillar av"), och vilken
// vinst i vid_vinst.handling ("trillar baklänges", "snurrar runt tre varv"). Texten är Innehålls, och här läses
// bara vilket av figurens egna namn den nämner.

/** Vikning så att texten hittar bildernas namn (halmstrå → halmstra). @param {string} s */
export const vik = (s) => String(s || '').toLocaleLowerCase('sv-SE').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e');

/**
 * Den av sakerna som texten nämner först, eller null. @param {string} text @param {string[]} saker
 * @returns {string | null}
 */
export function sakI(text, saker) {
  const t = vik(text);
  let bast = /** @type {string | null} */ (null), plats = Infinity;
  for (const s of saker) {
    const m = new RegExp(`(^|[^a-z])${s}`).exec(t);
    if (m && m.index < plats) { plats = m.index; bast = s; }
  }
  return bast;
}

/**
 * Utrustningen efter det som har trillat av: hel, eller den utrustning vars saker är de som syns på figuren och har
 * trillat av (halmstrået syns inte, och ändrar inget). Finns ingen sådan, den närmaste med färre saker.
 * @param {string[]} tappade i den ordning de trillade @param {string[]} utrustningar t.ex. hel, utan_hatt, utan_hatt_knapp
 * @returns {string}
 */
export function utrustningEfter(tappade, utrustningar) {
  const delar = (/** @type {string} */ u) => (u === 'hel' ? [] : u.replace(/^utan_/, '').split('_'));
  const synliga = new Set(utrustningar.flatMap(delar));
  const borta = tappade.filter((s) => synliga.has(s));
  for (let n = borta.length; n > 0; n--) {
    const vill = new Set(borta.slice(0, n));
    const u = utrustningar.find((x) => { const d = delar(x); return d.length === vill.size && d.every((s) => vill.has(s)); });
    if (u) return u;
  }
  return 'hel';
}

/**
 * Vinstens läge efter texten: snurrar (och sedan sitter) eller trillar, det som texten nämner och figuren har.
 * @param {string} text @param {string[]} lagen @returns {'snurrar' | 'trillar' | null}
 */
export function vinstLage(text, lagen) {
  const t = vik(text);
  if (lagen.includes('snurrar') && /snurra/.test(t)) return 'snurrar';
  if (lagen.includes('trillar')) return 'trillar';
  return null;
}

/**
 * Figurens bilder ur atlasens namn. @param {string} figur @param {string[]} ramar alla bildnamn i atlasen
 * @returns {{ lagen: string[], utrustningar: string[], saker: string[], sakPrefix: string } | null} null om figuren inte har grundställningen
 */
export function figurensBilder(figur, ramar) {
  const re = new RegExp(`^${figur}_([a-z]+)_(\\d\\d)_(hel|utan(?:_[a-z]+)+)$`);
  const lagen = new Set(), utrustningar = new Set();
  for (const r of ramar) { const m = re.exec(r); if (m) { lagen.add(m[1]); utrustningar.add(m[3]); } }
  if (!lagen.has('grund') || !utrustningar.has('hel')) return null;
  // sakerna: <något>_sak_<sak>_01 i samma atlas (halmdocka_sak_hatt_01)
  const sakRe = /^([a-z0-9_]+)_sak_([a-z]+)_01$/;
  const saker = new Set(); let sakPrefix = '';
  for (const r of ramar) { const m = sakRe.exec(r); if (m) { saker.add(m[2]); sakPrefix = m[1]; } }
  return { lagen: [...lagen].sort(), utrustningar: [...utrustningar].sort(), saker: [...saker].sort(), sakPrefix };
}
