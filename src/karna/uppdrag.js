// @ts-check
// Uppdragslappen (beslut 37.3, 40.1, 47 och 48, 10d *Uppdragslappen*): kapitlets uppdrag och var i berättelsen de står.
// Lappen visar rubriken, bilden, en bock per gjort steg och en tom ring per steg som är kvar. Delstegen har ingen
// text på lappen (47.2): de styr bara bockarna, ringarna och när stämpeln kommer.
// Allt räknas ur var berättelsen är (scen och steg), så att lappen alltid stämmer, också efter en omstart, ett hopp i
// INSTÄLLNINGAR eller en framspolning. Inget om lappen sparas, utom vilka påminnelser som har kommit i passet.
// Rör inte DOM.

/**
 * @typedef {[number, number]} Pos scenens och stegets index i kapitlet
 * @typedef {{ text: string, klart: any, upplast?: boolean, visas?: string, ersatter?: { scen: string, text: string }[] }} UppdragsSteg
 * @typedef {{ id: string, rubrik: string, bild: string, pass: number, steg: UppdragsSteg[], stampel: { scen: string, efter: any } }} Uppdrag
 * @typedef {{ u: Uppdrag, start: Pos, steg: { s: UppdragsSteg, pos: Pos }[], stampel: Pos }} KompileratUppdrag
 */

/** Jämför två lägen i kapitlet. @param {Pos} a @param {Pos} b */
export const jamfor = (a, b) => (a[0] - b[0]) || (a[1] - b[1]);

/** Stegets nyckel i `klart` eller `stampel.efter` → stämmer steget? @type {Record<string, (st: any, v: string) => boolean>} */
const MATCHAR = {
  ga_till: (st, v) => st.typ === 'ga_till' && st.mal === v,
  pussel: (st, v) => st.typ === 'pussel' && st.pussel_id === v,
  bara: (st, v) => st.typ === 'bara' && (st.bild === v || st.till === v),
  las_skylt: (st, v) => st.typ === 'las_skylt' && st.foremal === v,
  vantar_pa: (st, v) => st.vantar_pa === v,
  replik: (st, v) => st.typ === 'replik' && st.text === v,
  bild: (st, v) => st.typ === 'mellanscen' && st.bild === v,
};

/**
 * Steget i en scen som en hänvisning (`{ ga_till: "dorr_hallen" }`) pekar på.
 * @param {any} kapitel @param {string} scenId @param {any} hanv
 * @returns {Pos | null}
 */
export function hittaSteg(kapitel, scenId, hanv) {
  const si = kapitel.scener.findIndex((/** @type {any} */ s) => s.id === scenId);
  if (si < 0 || !hanv) return null;
  const nyckel = Object.keys(MATCHAR).find((k) => k in hanv);
  if (!nyckel) return null;
  const ti = kapitel.scener[si].steg.findIndex((/** @type {any} */ st) => MATCHAR[nyckel](st, hanv[nyckel]));
  return ti < 0 ? null : [si, ti];
}

/**
 * Kapitlets uppdrag med lägena utlästa. Ett uppdrag vars steg inte går att hitta i kapitlet hoppas över (kontrollen
 * säger fel om det i innehållet; i ett provkapitel finns kanske inte scenerna).
 * - Uppdraget **börjar** vid första stegets eget steg, alltså efter att berättelsen har ställt frågan, och aldrig
 *   före förra uppdragets stämpel. Fältet `ersatter` används inte (beslut 47.1).
 * - Ett steg är **gjort** när berättelsen har passerat det steg som står i `klart`.
 * - **Stämpeln** kommer när berättelsen har passerat steget i `stampel.efter`.
 * @param {any} kapitel
 * @returns {{ lista: KompileratUppdrag[], fel: string[] }}
 */
export function kompileraUppdrag(kapitel) {
  /** @type {KompileratUppdrag[]} */
  const lista = [];
  const fel = [];
  /** @type {Pos} */
  let efterForra = [0, 0];
  for (const u of /** @type {Uppdrag[]} */ (kapitel.uppdrag || [])) {
    const steg = u.steg.map((s) => ({ s, pos: hittaSteg(kapitel, s.klart?.scen, s.klart) }));
    const stampel = hittaSteg(kapitel, u.stampel?.scen, u.stampel?.efter);
    const saknas = steg.filter((x) => !x.pos).map((x) => x.s.text);
    if (saknas.length || !stampel) { fel.push(`${u.id}: ${saknas.length ? 'stegen ' + saknas.join(', ') : 'stämpeln'} finns inte i kapitlet`); continue; }
    /** @type {Pos} */
    let start = /** @type {Pos} */ (steg[0].pos);
    if (jamfor(start, efterForra) < 0) start = efterForra;
    lista.push({ u, start, steg: /** @type {any} */ (steg), stampel });
    efterForra = [stampel[0], stampel[1] + 1];
  }
  return { lista, fel };
}

/**
 * Lappen just nu: uppdraget som pågår, de gjorda stegen, steget han gör nu och hur många steg som är kvar (en tom
 * ring per steg, beslut 48.2). Ett steg som visas med påminnelsen räknas inte förrän påminnelsen har kommit, annars
 * avslöjar ringen att det finns något mer att göra.
 * @param {KompileratUppdrag[]} lista @param {Pos} pos var berättelsen är (steget som pågår eller kommer)
 * @param {Set<string>} [paminda] steg med `visas: med_paminnelse` vars påminnelse har kommit (`<uppdrag>/<steg>`)
 * @param {{ alla: Set<number>, klara: Set<number> } | null} [grenar] navets grenar (scenernas index): grenarna tas i
 *   valfri ordning, så ett steg i en annan gren är gjort när grenen är klar, inte när berättelsen står efter det
 * @returns {{ k: KompileratUppdrag, gjorda: UppdragsSteg[], nu: UppdragsSteg | null, nuIndex: number, kvar: number } | null}
 */
export function lappenNu(lista, pos, paminda = new Set(), grenar = null) {
  const k = lista.find((x) => jamfor(x.start, pos) <= 0 && jamfor(pos, x.stampel) <= 0);
  if (!k) return null;
  const gjorda = [];
  let nu = null, nuIndex = -1, kvar = 0, forstaKvar = true;
  for (let i = 0; i < k.steg.length; i++) {
    const { s, pos: p } = k.steg[i];
    const gjort = grenar && grenar.alla.has(p[0]) && p[0] !== pos[0] ? grenar.klara.has(p[0]) : jamfor(p, pos) < 0;
    if (gjort) { gjorda.push(s); continue; }
    const synligt = s.visas !== 'med_paminnelse' || paminda.has(`${k.u.id}/${i}`);
    if (synligt) kvar++;
    // steget han gör nu är det första som inte är gjort, om det syns
    if (forstaKvar && synligt) { nu = s; nuIndex = i; }
    forstaKvar = false;
  }
  return { k, gjorda, nu, nuIndex, kvar };
}

/** Uppdragen som är klara (stämplade) före ett läge, i ordning. @param {KompileratUppdrag[]} lista @param {Pos} pos */
export const klaraFore = (lista, pos) => lista.filter((x) => jamfor(x.stampel, pos) < 0).map((x) => x.u);

/**
 * Rummet där ett uppdragssteg görs (133.9): rummet för scenen där steget är klart (`klart.scen`). null om det inte går
 * att säga, och då står steget i molnet som förut.
 * @param {any} steg uppdragets steg @param {any} kapitel @returns {string | null}
 */
export function stegetsRum(steg, kapitel) {
  const k = steg?.klart;
  if (!k) return null;
  const sc = (kapitel?.scener || []).find((/** @type {any} */ x) => x.id === k.scen);
  return sc?.rum ?? null;
}

/**
 * Verben som en rad i molnet börjar med (125.2): molnet säger alltid en uppgift med verb och mål. Kontrollen och
 * molnet använder samma lista.
 */
export const VERB_I_MOLNET = new Set(['GÅ', 'LÄS', 'VÄLJ', 'HITTA', 'TA', 'SKRIV', 'HÄMTA', 'TÄND', 'LÄGG', 'ÖPPNA', 'VIFTA', 'HUGG', 'KOM', 'SKYDDA',
  'LÄMNA', 'SÄTT', 'PACKA', 'TRYCK', 'RÄDDA', 'KRAMA', 'FÖLJ', 'DRA', 'LYFT', 'LYS', 'SAMLA', 'LOSSA', 'ÅK', 'BLÅS', 'LETA', 'HOPPA', 'MATA',
  'GE', 'KLÄTTRA', 'SPRING', 'SIMMA', 'ROPA', 'VÄCK', 'BÄR', 'FLYG', 'TITTA', 'LYSSNA', 'STRYK', 'KRYP', 'SÖK', 'BYGG', 'SPÅRA', 'NOSA', 'HJÄLP']);

/**
 * Börjar texten med ett verb ur listan (efter platshållarna)? Versalerna räknas med svensk regel.
 * @param {string | null | undefined} text
 */
export function borjarMedVerb(text) {
  if (!text) return false;
  const forsta = text.replace(/\{(unge|hjalte)\}/gi, '').trim().split(/[\s,.!?:;]+/)[0] || '';
  return VERB_I_MOLNET.has(forsta.toLocaleUpperCase('sv-SE'));
}

/**
 * Vad molnet visar för bokens steg i ett rum (133.9 och 135.7): steget först i det rum där det görs. I rummen före
 * står stegets `pa_vagen` (ett gå-steg, GÅ GENOM GROTTAN) om datan har ett. Annars står berättelsens egen
 * instruktion, men bara om den börjar med ett verb (sort `instruktion`), och annars inget.
 * @param {any} steg @param {any} kapitel @param {string | null | undefined} rum
 * @returns {{ sort: 'steget' | 'pa_vagen' | 'inget', text: string | null }}
 */
export function molnetForSteg(steg, kapitel, rum) {
  const dar = stegetsRum(steg, kapitel);
  if (!dar || !rum || dar === rum) return { sort: 'steget', text: steg?.text ?? null };
  if (typeof steg.pa_vagen === 'string' && steg.pa_vagen) return { sort: 'pa_vagen', text: steg.pa_vagen };
  return { sort: 'inget', text: null };
}

/** Stegtyperna där molnet visar en instruktion medan han går (135.7): mål, bära, ungen och navet. */
const GAR_STEG = new Set(['ga_till', 'bara', 'nav']);

/**
 * Berättelsens instruktion före ett steg, som motorn tar den (`instruktionFore` i spel.js): den närmaste upplästa
 * repliken bakåt i scenen, förbi mellanscener, visa_ui och ljud. En replik som väntar på en handling hoppas över.
 * I navet efter en gren gäller den sista upplästa repliken i `mellan_grenar`. @param {any[]} steg @param {number} j
 */
function instruktionForeSteg(steg, j) {
  for (let i = j - 1; i >= 0; i--) {
    const x = steg[i];
    if (x.typ === 'replik') { if (x.vantar_pa) continue; return x.upplast && !x.kapitelrubrik ? x : null; }
    if (!['mellanscen', 'visa_ui', 'ljud'].includes(x.typ)) return null;
  }
  return null;
}

/**
 * Rummen där molnet visar berättelsens instruktion i stället för ett gå-steg (135.7). För varje steg där han går
 * (`ga_till`, `bara`, `nav`) och bokens steg görs i ett annat rum utan `pa_vagen`: vad molnet visar i stället.
 * `visas` är sant när instruktionen börjar med ett verb och alltså står i molnet, och falskt när molnet är tomt.
 * @param {any} kapitel
 * @returns {{ rum: string, scen: string, steg: number, typ: string, boken: string, stegetsRum: string, instruktion: string | null, visas: boolean }[]}
 */
export function molnetsInstruktioner(kapitel) {
  const { lista } = kompileraUppdrag(kapitel);
  if (!lista.length) return [];
  const ut = [];
  (kapitel.scener || []).forEach((/** @type {any} */ sc, i) => {
    (sc.steg || []).forEach((/** @type {any} */ st, j) => {
      if (!GAR_STEG.has(st.typ)) return;
      const nu = lappenNu(lista, [i, j])?.nu;
      if (!nu) return;
      const m = molnetForSteg(nu, kapitel, sc.rum);
      if (m.sort !== 'inget') return;
      const fore = instruktionForeSteg(sc.steg, j);
      const mellan = st.typ === 'nav' ? [...(st.mellan_grenar || [])].reverse().find((/** @type {any} */ x) => x.typ === 'replik' && x.upplast) : null;
      const rad = (/** @type {any} */ r, /** @type {string} */ typ) => ut.push({ rum: sc.rum, scen: sc.id, steg: j, typ, boken: nu.text,
        stegetsRum: /** @type {string} */ (stegetsRum(nu, kapitel)), instruktion: r?.text ?? null, visas: borjarMedVerb(r?.text) });
      rad(fore, st.typ);
      if (mellan) rad(mellan, 'nav efter en gren');
    });
  });
  return ut;
}
