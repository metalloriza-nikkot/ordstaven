// @ts-check
// Pussellogiken: ett tillstånd per pussel, utan DOM och utan Phaser. Gränssnittet visar tillståndet
// och anropar funktionerna. Reglerna kommer från pusselkatalogen (dokument 08, avsnitt 6):
// efter 2 fel förenklas pusslet, efter 3 fel pekar ungen på det rätta, aldrig automatisk lösning.
import { valjVariant, lagreVariant } from './lasmotor.js';
import { versaler } from './text.js';

/** @typedef {{ handling?: string, reaktion?: string, replik?: any, fest?: string }} Handling */

/** Blanda en lista med en given slump (för testbarhet). @template T @param {T[]} lista @param {() => number} slump */
export function blanda(lista, slump = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(slump() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------------------------------------
// P1 läs och välj, P27 packa (flera rätt)
// ---------------------------------------------------------------------------------------------
/**
 * @param {any} pussel @param {{ niva: number, slump?: () => number }} opt
 */
export function skapaValj(pussel, { niva, slump = Math.random }) {
  const flera = pussel.typ === 'P27_packa';
  let [variantNyckel, variant] = valjVariant(pussel.varianter, niva);
  const s = {
    typ: pussel.typ,
    variantNyckel,
    text: variant.text ?? null,
    bild: variant.bild ?? null,
    /** @type {any[]} synliga alternativ, i blandad ordning */
    alternativ: blanda(variant.alternativ, slump),
    /** @type {Set<string>} valda (P27) */
    valda: new Set(),
    fel: 0,
    forsok: 0,
    forenklad: false,
    /** id som ungen pekar på efter 3 fel */
    pekar: /** @type {string | null} */ (null),
    klar: false,
  };
  const rattaKvar = () => s.alternativ.filter((a) => a.ratt && !s.valda.has(a.id));

  function forenkla() {
    s.forenklad = true;
    const lagre = lagreVariant(pussel.varianter, s.variantNyckel);
    if (lagre && !flera) {
      s.variantNyckel = lagre; variant = pussel.varianter[lagre];
      s.text = variant.text ?? null; s.bild = variant.bild ?? null;
      s.alternativ = blanda(variant.alternativ, slump);
      return;
    }
    // ta bort fel alternativ: ett i P1 (två kvar), två i P27
    const antal = flera ? 2 : 1;
    const fel = s.alternativ.filter((a) => !a.ratt);
    const bort = new Set(blanda(fel, slump).slice(0, Math.min(antal, Math.max(0, fel.length - (flera ? 0 : 1)))).map((a) => a.id));
    s.alternativ = s.alternativ.filter((a) => !bort.has(a.id));
  }

  return {
    s,
    /**
     * @param {string} id
     * @returns {{ resultat: 'ratt' | 'fel' | 'redan' | 'klar', reaktion: Handling | null, forenklad: boolean }}
     */
    valj(id) {
      if (s.klar) return { resultat: 'klar', reaktion: null, forenklad: false };
      const a = s.alternativ.find((x) => x.id === id);
      if (!a) throw new Error('okänt alternativ ' + id);
      if (flera && s.valda.has(id)) return { resultat: 'redan', reaktion: null, forenklad: false };
      s.forsok++;
      if (a.ratt) {
        if (flera) {
          s.valda.add(id);
          if (s.pekar === id) s.pekar = rattaKvar()[0]?.id ?? null;
          s.klar = rattaKvar().length === 0;
          return { resultat: s.klar ? 'klar' : 'ratt', reaktion: s.klar ? pussel.vid_ratt ?? null : null, forenklad: false };
        }
        s.klar = true;
        return { resultat: 'klar', reaktion: pussel.vid_ratt ?? null, forenklad: false };
      }
      s.fel++;
      let forenklad = false;
      if (pussel.forenkla && s.fel === pussel.forenkla.efter_fel && !s.forenklad) { forenkla(); forenklad = true; }
      if (s.fel >= 3) s.pekar = flera ? rattaKvar()[0]?.id ?? null : s.alternativ.find((x) => x.ratt)?.id ?? null;
      return { resultat: 'fel', reaktion: a.vid_valj ?? pussel.vid_fel ?? null, forenklad };
    },
    /** Löst på första försöket (P27: utan något fel). */
    get forstaForsoket() { return s.fel === 0; },
  };
}

// ---------------------------------------------------------------------------------------------
// P11 formel med brickor (S1–S2)
// ---------------------------------------------------------------------------------------------
/** @param {any} pussel @param {{ slump?: () => number }} [opt] */
export function skapaFormel(pussel, { slump = Math.random } = {}) {
  const svar = [...pussel.svar.replace(/ /g, '')];
  const brickor = (pussel.brickor || svar).map((b, i) => ({ id: i, bokstav: b }));
  const s = {
    svar: pussel.svar,
    /** brickorna i den ordning de visas */
    brickor: blanda(brickor, slump),
    /** @type {(number | null)[]} brickans id per plats */
    platser: svar.map(() => null),
    /** @type {boolean[]} plats som är låst (rätt och stannar) */
    last: svar.map(() => false),
    fel: 0,
    tips: /** @type {number | null} */ (null),
    klar: false,
  };
  const ledigaBrickor = () => s.brickor.filter((b) => !s.platser.includes(b.id));
  const forstaTomma = () => s.platser.findIndex((p) => p === null);
  const uppdateraTips = () => {
    if (!(pussel.forenkla && s.fel >= pussel.forenkla.efter_fel)) { s.tips = null; return; }
    const plats = forstaTomma();
    if (plats < 0) { s.tips = null; return; }
    s.tips = ledigaBrickor().find((b) => b.bokstav === svar[plats])?.id ?? null;
  };

  /** @returns {{ resultat: 'lagd' | 'klar' | 'fel' | 'ingen', reaktion: Handling | null }} */
  function kontrollera() {
    if (forstaTomma() >= 0) { uppdateraTips(); return { resultat: 'lagd', reaktion: null }; }
    const ratt = s.platser.map((id, i) => s.brickor.find((b) => b.id === id)?.bokstav === svar[i]);
    if (ratt.every(Boolean)) { s.klar = true; s.tips = null; return { resultat: 'klar', reaktion: pussel.vid_ratt ?? null }; }
    s.fel++;
    s.platser = s.platser.map((id, i) => (ratt[i] && pussel.ratt_bokstav_stannar !== false ? id : null));
    s.last = ratt.map((r) => r && pussel.ratt_bokstav_stannar !== false);
    uppdateraTips();
    return { resultat: 'fel', reaktion: pussel.vid_fel ?? null };
  }

  const ingen = () => ({ resultat: /** @type {'ingen'} */ ('ingen'), reaktion: null });

  return {
    s,
    /** Lägg en bricka på första lediga plats. @param {number} brickId */
    lagg(brickId) {
      if (s.klar) return ingen();
      const plats = forstaTomma();
      if (plats < 0 || s.platser.includes(brickId)) return ingen();
      s.platser[plats] = brickId;
      return kontrollera();
    },
    /**
     * Dra en bricka till en viss plats. Ligger det redan en bokstav där byter de plats
     * (eller går den gamla tillbaka till brickraden). Låsta platser går inte att ändra.
     * @param {number} brickId @param {number} plats
     */
    laggPa(brickId, plats) {
      if (s.klar || plats < 0 || plats >= s.platser.length || s.last[plats]) return ingen();
      const fran = s.platser.indexOf(brickId);
      if (fran >= 0 && s.last[fran]) return ingen();
      if (fran === plats) return ingen();
      const dar = s.platser[plats];
      s.platser[plats] = brickId;
      if (fran >= 0) s.platser[fran] = dar; // byt plats med bokstaven som låg där
      return kontrollera();
    },
    /** Ta tillbaka bokstaven på en plats till brickraden. @param {number} plats */
    taBort(plats) {
      if (s.klar || s.last[plats] || s.platser[plats] === null) return false;
      s.platser[plats] = null; uppdateraTips(); return true;
    },
    /** Skriv en bokstav på tangentbordet: lägger första lediga bricka med den bokstaven. @param {string} bokstav */
    skriv(bokstav) {
      const b = ledigaBrickor().find((x) => x.bokstav === versaler(bokstav));
      return b ? this.lagg(b.id) : { resultat: /** @type {'ingen'} */ ('ingen'), reaktion: null };
    },
    /** Ta tillbaka senaste olåsta brickan. */
    sudda() {
      for (let i = s.platser.length - 1; i >= 0; i--) if (s.platser[i] !== null && !s.last[i]) { s.platser[i] = null; uppdateraTips(); return true; }
      return false;
    },
    get forstaForsoket() { return s.fel === 0; },
  };
}

// ---------------------------------------------------------------------------------------------
// P12 dop (fritt namn, bedöms aldrig)
// ---------------------------------------------------------------------------------------------
const BOKSTAV = /^[A-ZÅÄÖ]$/;
/** @param {any} pussel */
export function skapaDop(pussel) {
  const max = pussel.max_bokstaver ?? 10, min = pussel.min_bokstaver ?? 1;
  const s = { namn: '', max, min, klar: false };
  return {
    s,
    /** @param {string} bokstav */
    skriv(bokstav) {
      const b = versaler(bokstav);
      if (!BOKSTAV.test(b) || s.namn.length >= max) return false;
      s.namn += b; return true;
    },
    sudda() { if (!s.namn) return false; s.namn = s.namn.slice(0, -1); return true; },
    get kanKlar() { return s.namn.length >= min; },
    klar() { if (s.namn.length < min) return null; s.klar = true; return s.namn; },
  };
}

// ---------------------------------------------------------------------------------------------
// P26 krukorna (vila)
// ---------------------------------------------------------------------------------------------
/** @param {any} pussel @param {{ slump?: () => number }} [opt] */
export function skapaKrukor(pussel, { slump = Math.random } = {}) {
  const innehall = [...pussel.innehall];
  const kartbit = pussel.kartbit_i_sista ? innehall.find((x) => x.startsWith('kartbit')) : null;
  const ovrigt = blanda(kartbit ? innehall.filter((x) => x !== kartbit) : innehall, slump);
  const s = { antal: innehall.length, slagna: /** @type {(string | null)[]} */ (innehall.map(() => null)), klar: false };
  return {
    s,
    /** Slå på kruka i. Innehållet bestäms när den slås, så kartbiten kommer alltid sist. @param {number} i */
    sla(i) {
      if (s.slagna[i] !== null || s.klar) return null;
      const kvarAttSla = s.slagna.filter((x) => x === null).length;
      const fynd = kartbit && kvarAttSla === 1 ? kartbit : /** @type {string} */ (ovrigt.shift() ?? 'tom');
      s.slagna[i] = fynd;
      if (fynd === kartbit || s.slagna.every((x) => x !== null)) s.klar = true;
      return fynd;
    },
  };
}
