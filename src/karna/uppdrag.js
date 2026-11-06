// @ts-check
// Uppdragslappen (beslut 37.3 och 40.1, 10d *Uppdragslappen*): kapitlets uppdrag och var i berättelsen de står.
// Allt räknas ur var berättelsen är (scen och steg), så att lappen alltid stämmer, också efter en omstart, ett hopp i
// menyn för vuxna eller en framspolning. Inget om lappen sparas, utom vilka påminnelser som har kommit i passet.
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
 * - Uppdraget **börjar** när berättelsen har ställt frågan: vid den första repliken som lappen ersätter i första
 *   steget, annars vid första stegets eget steg, och aldrig före förra uppdragets stämpel.
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
    const forsta = /** @type {Pos} */ (steg[0].pos);
    const ersatt = (steg[0].s.ersatter || []).map((e) => ersattPos(kapitel, e)).filter((p) => p && jamfor(p, forsta) <= 0);
    /** @type {Pos} */
    let start = ersatt.length ? /** @type {Pos} */ (ersatt.sort(jamfor)[0]) : forsta;
    if (jamfor(start, efterForra) < 0) start = efterForra;
    lista.push({ u, start, steg: /** @type {any} */ (steg), stampel });
    efterForra = [stampel[0], stampel[1] + 1];
  }
  return { lista, fel };
}

/**
 * Var en replik som lappen ersätter står: i en scen, eller som instruktionen i ett pussel (scen = pusslets id),
 * och då vid pusslets steg. @param {any} kapitel @param {{ scen: string, text: string }} e @returns {Pos | null}
 */
function ersattPos(kapitel, e) {
  const viaScen = hittaSteg(kapitel, e.scen, { replik: e.text });
  if (viaScen) return viaScen;
  for (let si = 0; si < kapitel.scener.length; si++) {
    const ti = kapitel.scener[si].steg.findIndex((/** @type {any} */ st) => st.typ === 'pussel' && st.pussel_id === e.scen);
    if (ti >= 0) return [si, ti];
  }
  return null;
}

/**
 * Lappen just nu: uppdraget som pågår, de gjorda stegen och steget han gör nu.
 * @param {KompileratUppdrag[]} lista @param {Pos} pos var berättelsen är (steget som pågår eller kommer)
 * @param {Set<string>} [paminda] steg med `visas: med_paminnelse` vars påminnelse har kommit (`<uppdrag>/<steg>`)
 * @returns {{ k: KompileratUppdrag, gjorda: UppdragsSteg[], nu: UppdragsSteg | null, nuIndex: number } | null}
 */
export function lappenNu(lista, pos, paminda = new Set()) {
  const k = lista.find((x) => jamfor(x.start, pos) <= 0 && jamfor(pos, x.stampel) <= 0);
  if (!k) return null;
  const gjorda = [];
  let nu = null, nuIndex = -1;
  for (let i = 0; i < k.steg.length; i++) {
    const { s, pos: p } = k.steg[i];
    if (jamfor(p, pos) < 0) { gjorda.push(s); continue; }
    if (s.visas !== 'med_paminnelse' || paminda.has(`${k.u.id}/${i}`)) { nu = s; nuIndex = i; }
    break;
  }
  return { k, gjorda, nu, nuIndex };
}

/** Uppdragen som är klara (stämplade) före ett läge, i ordning. @param {KompileratUppdrag[]} lista @param {Pos} pos */
export const klaraFore = (lista, pos) => lista.filter((x) => jamfor(x.stampel, pos) < 0).map((x) => x.u);

/**
 * Ersätter lappen en replik i en scen (eller instruktionen i ett pussel)? Bara när lappen syns.
 * @param {any} kapitel @param {string} scenEllerPussel scenens eller pusslets id @param {string} text repliken
 */
export function ersatts(kapitel, scenEllerPussel, text) {
  return (kapitel.uppdrag || []).some((/** @type {Uppdrag} */ u) => u.steg.some((s) => (s.ersatter || []).some((e) => e.scen === scenEllerPussel && e.text === text)));
}

/**
 * Det steg i lappen som ett steg i berättelsen gör klart, om det är det steg han gör nu (molnet behövs då inte).
 * @param {ReturnType<typeof lappenNu>} lapp @param {Pos} pos
 */
export const lappenSagerVad = (lapp, pos) => !!lapp && lapp.nuIndex >= 0 && jamfor(lapp.k.steg[lapp.nuIndex].pos, pos) === 0;
