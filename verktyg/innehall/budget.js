// Budgeten per pass och kapitel (beslut 76.3, briefen §4 och 08), från kapitel 2. Kontrollen varnar, den stoppar
// inget: ett pass får vara annorlunda om ledningen har bestämt det. Ren logik på kapitlets data.
//
// Per pass: minst ett läsval och en vila, högst två skrivuppgifter och aldrig två i rad, högst tre repliker innan han
// gör något, och aldrig fler än fem passiva steg i rad. Varje gren i ett nav har en egen uppgift.
// Per kapitel: högst en ny figur som talar, minst en frivillig formel, baronen talar, och ett ögonblick med mamma.
// Läsvalen: rätt svar är aldrig det enda udda (alternativen är korsade, eller ett alternativ har inget av dragen).
// Det som inte går att läsa ur datan (en hemlighet, att baronen läser fel, att det som lovas löses in) prövas inte.

/** Läsval: han läser och väljer. */
const LASVAL = new Set(['P1_las_och_valj', 'P28_packa']);
/** Skrivuppgifter: han skriver eller stavar ett ord (P15 stavar med brickor, men avgör ingen läsning, 76.3). */
const SKRIV = new Set(['P11_formel', 'P12_dop', 'P15_raddning']);
/** Vila: leta, hugga, para ihop (P26), kodlåset (P9). */
const VILA = new Set(['P26_krukorna', 'P9_kodlas']);
/** Steg där han inte gör något själv. */
const PASSIVA = new Set(['replik', 'mellanscen', 'ljud', 'visa_foremal', 'ge_sak', 'unge_tillagg', 'visa_ui', 'musik', 'ge_grad', 'bok']);

/** Gränserna (76.3). */
export const BUDGET = Object.freeze({ maxSkriv: 2, maxReplikerFore: 3, maxPassivaIRad: 5, maxNyaFigurer: 1 });

/**
 * Tokenerna i ett alternativs id (utan siffror och utan det som alla alternativ har), för regeln om det udda svaret.
 * @param {string} id @param {Set<string>} gemensamma
 */
function drag(id, gemensamma) {
  const BOJT = /** @type {Record<string, string>} */ ({ stort: 'stor', stora: 'stor', litet: 'liten', lilla: 'liten', runda: 'rund', runt: 'rund', gammal: 'gammalt', gamla: 'gammalt', unga: 'ungt', ung: 'ungt' });
  return new Set(String(id).split('_').filter((t) => !/^\d+$/.test(t)).map((t) => BOJT[t] || t).filter((t) => !gemensamma.has(t)));
}

/**
 * Är rätt svar det enda udda? Ja om distraktorerna är likadana, eller om varje distraktor delar ett drag med rätt svar
 * (mönstret mål (A,B) mot (A,inte B) och (inte A,B)): då går det att välja utan att läsa.
 * @param {{ id: string, ratt?: boolean }[]} alternativ @returns {boolean}
 */
export function rattArUdda(alternativ) {
  if (alternativ.length < 3) return false;
  const ratt = alternativ.find((a) => a.ratt);
  if (!ratt) return false;
  const alla = alternativ.map((a) => new Set(String(a.id).split('_')));
  const gemensamma = new Set([...alla[0]].filter((t) => alla.every((s) => s.has(t))));
  const m = drag(ratt.id, gemensamma);
  const andra = alternativ.filter((a) => a !== ratt).map((a) => drag(a.id, gemensamma));
  const nyckel = (/** @type {Set<string>} */ s) => [...s].sort().join('_');
  if (andra.every((s) => nyckel(s) === nyckel(andra[0]))) return true;
  return andra.every((s) => [...s].some((t) => m.has(t)));
}

/**
 * Budgetens varningar för ett kapitel.
 * @param {any} k kapitlet
 * @param {{ tidigareTalare?: Set<string> }} [opt] talarna i kapitlen före (en ny figur är en talare som inte fanns där)
 * @returns {string[]}
 */
export function budgetVarningar(k, { tidigareTalare = new Set() } = {}) {
  const ut = [];
  const pussel = new Map((k.pussel || []).map((/** @type {any} */ p) => [p.id, p]));
  const typ = (/** @type {any} */ st) => (st.typ === 'pussel' ? pussel.get(st.pussel_id)?.typ ?? null : null);

  // ---- per pass: stegen i ordning, navets steg mellan grenarna där de står, frivilliga scener inte med
  /** @type {Map<number, { lasval: number, vila: number, skriv: number, uppgifter: string[], replikerIRad: number, passivaIRad: number, varnat: Set<string> }>} */
  const pass = new Map();
  const nytt = () => ({ lasval: 0, vila: 0, skriv: 0, uppgifter: /** @type {string[]} */ ([]), replikerIRad: 0, passivaIRad: 0, varnat: new Set() });
  /** @param {any} st @param {string} plats @param {ReturnType<typeof nytt>} pp @param {number} nr */
  const steg = (st, plats, pp, nr) => {
    if (st.typ === 'nav') { (st.mellan_grenar || []).forEach((/** @type {any} */ x, /** @type {number} */ i) => steg(x, `${plats} mellan_grenar ${i + 1}`, pp, nr)); return; }
    if (PASSIVA.has(st.typ)) {
      pp.passivaIRad++;
      if (st.typ === 'replik') pp.replikerIRad++;
      if (pp.replikerIRad === BUDGET.maxReplikerFore + 1) ut.push(`${k.id} ${plats}: fler än ${BUDGET.maxReplikerFore} repliker innan han gör något (76.3)`);
      if (pp.passivaIRad === BUDGET.maxPassivaIRad + 1) ut.push(`${k.id} ${plats}: fler än ${BUDGET.maxPassivaIRad} steg i rad där han inte gör något (76.3)`);
      return;
    }
    if (st.typ === 'sparpunkt') return;
    pp.replikerIRad = 0; pp.passivaIRad = 0;
    const t = typ(st);
    if (!t) return;
    const sort = LASVAL.has(t) ? 'las' : SKRIV.has(t) ? 'skriv' : VILA.has(t) ? 'vila' : 'annat';
    if (sort === 'las') pp.lasval++;
    if (sort === 'vila') pp.vila++;
    if (sort === 'skriv') {
      pp.skriv++;
      if (pp.uppgifter.at(-1) === 'skriv' && !pp.varnat.has('irad')) { pp.varnat.add('irad'); ut.push(`${k.id} ${plats}: två skrivuppgifter i rad i pass ${nr} (76.3)`); }
    }
    pp.uppgifter.push(sort);
  };
  for (const s of k.scener || []) {
    if (s.frivillig) continue;
    if (!pass.has(s.pass)) pass.set(s.pass, nytt());
    const pp = /** @type {ReturnType<typeof nytt>} */ (pass.get(s.pass));
    (s.steg || []).forEach((/** @type {any} */ st, /** @type {number} */ i) => {
      steg(st, `scen ${s.id} steg ${i + 1}`, pp, s.pass);
      // passets slut (sparpunkten med pass_slut, också i navet): nästa pass börjar
      const slut = st.typ === 'sparpunkt' && st.pass_slut;
      const iNavet = st.typ === 'nav' && (st.mellan_grenar || []).some((/** @type {any} */ x) => x.typ === 'sparpunkt' && x.pass_slut);
      if (slut || iNavet) { pp.replikerIRad = 0; pp.passivaIRad = 0; }
    });
  }
  for (const [nr, pp] of pass) {
    if (pp.lasval < 1) ut.push(`${k.id} pass ${nr}: inget läsval (minst ett, 76.3)`);
    if (pp.vila < 1) ut.push(`${k.id} pass ${nr}: ingen vila (leta, hugga, para ihop; minst en, 76.3)`);
    if (pp.skriv > BUDGET.maxSkriv) ut.push(`${k.id} pass ${nr}: ${pp.skriv} skrivuppgifter, högst ${BUDGET.maxSkriv} (76.3)`);
  }

  // ---- varje gren i ett nav har en egen uppgift
  for (const s of k.scener || []) for (const st of s.steg || []) {
    if (st.typ !== 'nav') continue;
    for (const g of st.grenar || []) {
      const gs = (k.scener || []).find((/** @type {any} */ x) => x.id === g.scen);
      if (gs && !(gs.steg || []).some((/** @type {any} */ x) => x.typ === 'pussel')) ut.push(`${k.id} scen ${s.id}: grenen ${g.scen} har ingen egen uppgift (76.3)`);
    }
  }

  // ---- per kapitel
  const talare = new Set();
  const allaSteg = (/** @type {any[]} */ lista) => lista.flatMap((st) => (st.typ === 'nav' ? [st, ...(st.mellan_grenar || [])] : [st]));
  const scenSteg = (k.scener || []).flatMap((/** @type {any} */ s) => allaSteg(s.steg || []));
  const rumSteg = (k.rum || []).flatMap((/** @type {any} */ r) => [...(r.frivilligt || []).flatMap((/** @type {any} */ f) => f.steg || []), ...(r.zoner || []).flatMap((/** @type {any} */ z) => z.steg || [])]);
  for (const st of [...scenSteg, ...rumSteg]) if (st.typ === 'replik' && st.talare) talare.add(st.talare);
  const nya = [...talare].filter((t) => !tidigareTalare.has(t) && t !== 'berattare');
  if (nya.length > BUDGET.maxNyaFigurer) ut.push(`${k.id}: ${nya.length} nya figurer som talar (${nya.join(', ')}), högst ${BUDGET.maxNyaFigurer} (76.3)`);
  const frivilligFormel = (k.scener || []).some((/** @type {any} */ s) => s.frivillig && (s.steg || []).some((/** @type {any} */ x) => typ(x) === 'P11_formel'))
    || rumSteg.some((/** @type {any} */ x) => typ(x) === 'P11_formel');
  if (!frivilligFormel) ut.push(`${k.id}: ingen frivillig formel (minst en, 76.3)`);
  if (!talare.has('baronen')) ut.push(`${k.id}: baronen talar inte (76.3)`);
  const text = (/** @type {any} */ st) => [st.text, st.beskrivning].flat().filter(Boolean).join(' ');
  if (![...scenSteg, ...rumSteg].some((st) => /mamma/i.test(text(st)))) ut.push(`${k.id}: inget ögonblick med mamma (76.3)`);

  // ---- läsvalen: rätt svar är aldrig det enda udda
  for (const p of k.pussel || []) {
    if (p.typ !== 'P1_las_och_valj') continue;
    for (const [niva, v] of Object.entries(p.varianter || {})) {
      if (rattArUdda(/** @type {any} */ (v).alternativ || [])) ut.push(`${k.id} pussel ${p.id} ${niva}: rätt svar är det enda udda (korsa alternativen, eller ett utan något av dragen, 76.3)`);
    }
  }
  return ut;
}

/** Talarna i ett kapitel (för nya figurer i nästa). @param {any} k @returns {Set<string>} */
export function talareI(k) {
  const ut = new Set();
  const ga = (/** @type {any[]} */ lista) => { for (const st of lista || []) { if (st.typ === 'replik' && st.talare) ut.add(st.talare); if (st.typ === 'nav') ga(st.mellan_grenar); } };
  for (const s of k.scener || []) ga(s.steg);
  for (const r of k.rum || []) { for (const f of r.frivilligt || []) ga(f.steg); for (const z of r.zoner || []) ga(z.steg); }
  return ut;
}
