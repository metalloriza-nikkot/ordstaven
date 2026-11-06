// @ts-check
// Uppdragslappen (beslut 37.3, 40.1, 47 och 48, 10d *Uppdragslappen*): kapitlets uppdrag och var i berättelsen de står.
// Lappen visar rubriken, bilden, en bock per gjort steg och en tom ring per steg som är kvar. Delstegen har ingen
// text på lappen (47.2): de styr bara bockarna, ringarna och när stämpeln kommer.
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
 * @returns {{ k: KompileratUppdrag, gjorda: UppdragsSteg[], nu: UppdragsSteg | null, nuIndex: number, kvar: number } | null}
 */
export function lappenNu(lista, pos, paminda = new Set()) {
  const k = lista.find((x) => jamfor(x.start, pos) <= 0 && jamfor(pos, x.stampel) <= 0);
  if (!k) return null;
  const gjorda = [];
  let nu = null, nuIndex = -1, kvar = 0, forstaKvar = true;
  for (let i = 0; i < k.steg.length; i++) {
    const { s, pos: p } = k.steg[i];
    if (jamfor(p, pos) < 0) { gjorda.push(s); continue; }
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
