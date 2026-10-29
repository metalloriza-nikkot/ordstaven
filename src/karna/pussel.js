// @ts-check
// Pussellogiken: ett tillstånd per pussel, utan DOM och utan Phaser. Gränssnittet visar tillståndet
// och anropar funktionerna. Reglerna kommer från pusselkatalogen (dokument 08, avsnitt 6):
// efter 2 fel förenklas pusslet, efter 3 fel pekar ungen på det rätta, aldrig automatisk lösning.
import { valjVariant, lagreVariant } from './lasmotor.js';
import { versaler } from './text.js';

/** @typedef {{ handling?: string, reaktion?: string, replik?: any, fest?: string }} Handling */

/** Det svenska alfabetet: brickor ligger alltid i den här ordningen (granskningen av kapitel 1, som tangentbordet). */
export const ALFABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
/**
 * Brickor i bokstavsordning. Ordningen avslöjar aldrig ordet och övar alfabetet.
 * @template {{ bokstav: string }} T @param {T[]} brickor
 */
export function iBokstavsordning(brickor) {
  const plats = (/** @type {string} */ b) => { const i = ALFABET.indexOf(b); return i < 0 ? 99 : i; };
  return [...brickor].sort((a, b) => plats(a.bokstav) - plats(b.bokstav));
}

/** Blanda en lista med en given slump (för testbarhet). @template T @param {T[]} lista @param {() => number} slump */
export function blanda(lista, slump = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(slump() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------------------------------------
// P1 läs och välj, P28 packa (flera rätt)
// ---------------------------------------------------------------------------------------------
/**
 * @param {any} pussel @param {{ niva: number, slump?: () => number, iRummet?: boolean }} opt
 * iRummet = alternativen står i rummet: förenklingen byter aldrig variant (då skulle föremålen bytas framför honom),
 * den spärrar bara de prövade (granskningen av kapitel 1, punkt 18).
 */
export function skapaValj(pussel, { niva, slump = Math.random, iRummet = !!pussel.i_rummet }) {
  const flera = pussel.typ === 'P28_packa';
  let [variantNyckel, variant] = valjVariant(pussel.varianter, niva);
  const s = {
    typ: pussel.typ,
    variantNyckel,
    text: variant.text ?? null,
    bild: variant.bild ?? null,
    /** @type {any[]} synliga alternativ, i blandad ordning */
    alternativ: blanda(variant.alternativ, slump),
    /** @type {Set<string>} valda (P28) */
    valda: new Set(),
    fel: 0,
    forsok: 0,
    /** @type {Set<string>} fel alternativ som spelaren redan har prövat */
    provade: new Set(),
    forenklad: false,
    /** id som ungen pekar på efter 3 fel */
    pekar: /** @type {string | null} */ (null),
    klar: false,
  };
  const rattaKvar = () => s.alternativ.filter((a) => a.ratt && !s.valda.has(a.id));

  function forenkla() {
    s.forenklad = true;
    const lagre = iRummet ? null : lagreVariant(pussel.varianter, s.variantNyckel);
    if (lagre && !flera) {
      s.variantNyckel = lagre; variant = pussel.varianter[lagre];
      s.text = variant.text ?? null; s.bild = variant.bild ?? null;
      s.alternativ = blanda(variant.alternativ, slump);
      return;
    }
    if (flera) {
      // P28: två fel saker försvinner
      const fel = s.alternativ.filter((a) => !a.ratt);
      const bort = new Set(blanda(fel, slump).slice(0, Math.min(2, fel.length)).map((a) => a.id));
      s.alternativ = s.alternativ.filter((a) => !bort.has(a.id));
      return;
    }
    // P1: de fel alternativ han redan har prövat tas bort (dörrarna spikas igen), men minst två finns kvar,
    // så att han fortfarande måste läsa. Har han inte prövat något tas ett fel alternativ bort.
    const kanTas = Math.max(0, s.alternativ.length - 2);
    const provade = s.alternativ.filter((a) => !a.ratt && s.provade.has(a.id));
    const bort = new Set((provade.length ? provade : blanda(s.alternativ.filter((a) => !a.ratt), slump).slice(0, 1)).slice(0, kanTas).map((a) => a.id));
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
      s.provade.add(id);
      let forenklad = false;
      if (pussel.forenkla && s.fel === pussel.forenkla.efter_fel && !s.forenklad) { forenkla(); forenklad = true; }
      if (s.fel >= 3) s.pekar = flera ? rattaKvar()[0]?.id ?? null : s.alternativ.find((x) => x.ratt)?.id ?? null;
      return { resultat: 'fel', reaktion: a.vid_valj ?? pussel.vid_fel ?? null, forenklad };
    },
    /** Löst på första försöket (P28: utan något fel). */
    get forstaForsoket() { return s.fel === 0; },
  };
}

// ---------------------------------------------------------------------------------------------
// P11 formel med brickor (S1–S2)
// ---------------------------------------------------------------------------------------------
/** @param {any} pussel @param {{ slump?: () => number }} [opt] */
export function skapaFormel(pussel, { slump = Math.random } = {}) {
  void slump;
  const svar = [...versaler(pussel.svar).replace(/ /g, '')];
  const brickor = (pussel.brickor || svar).map((b, i) => ({ id: i, bokstav: b }));
  const s = {
    svar: versaler(pussel.svar),
    /** brickorna i den ordning de visas: bokstavsordning (slump används inte längre för brickorna) */
    brickor: iBokstavsordning(brickor),
    /** @type {(number | null)[]} brickans id per plats */
    platser: svar.map(() => null),
    /** @type {boolean[]} plats som är låst (rätt och stannar) */
    last: svar.map(() => false),
    fel: 0,
    tips: /** @type {number | null} */ (null),
    /** @type {boolean[] | null} vilka platser som var rätt vid senaste kontrollen (kodlåset: tecknen lyser) */
    senastRatt: /** @type {boolean[] | null} */ (null),
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
    s.senastRatt = ratt;
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
  // det som alltid hittas sist: sak_i_sista (skattlådan, lådan), eller kartbiten med kartbit_i_sista
  const kartbit = pussel.sak_i_sista && innehall.includes(pussel.sak_i_sista) ? pussel.sak_i_sista
    : pussel.kartbit_i_sista ? innehall.find((x) => x.startsWith('kartbit')) : null;
  const ovrigt = blanda(kartbit ? innehall.filter((x) => x !== kartbit) : innehall, slump);
  const s = { antal: innehall.length, slagna: /** @type {(string | null)[]} */ (innehall.map(() => null)), klar: false };
  return {
    s,
    /** Det som hittas sist (kartbiten, skattlådan). */
    sista: kartbit,
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

// ---------------------------------------------------------------------------------------------
// P15 räddningen (Hänga apan-familjen) med kasta-läget
// ---------------------------------------------------------------------------------------------
/**
 * Ett fält per bokstav i ordet. Gissa: ett tryck på en bricka. En rätt bokstav fylls i på alla platser där
 * den finns, en fel bricka tonas ut och räknas som fel. Med extra brickor som inte räcker till tillatna_fel
 * kan räddningen inte misslyckas.
 * Kasta-läget (efter första rätta bokstaven): han skriver resten av ordet i de tomma fälten, i tur och ordning.
 * En fel bricka studsar tillbaka, de rätta ligger kvar, och efter två fel på samma plats blinkar rätt bricka.
 * Inget fel räknas. Ett nytt tryck på staven lämnar läget.
 * @param {any} pussel
 */
export function skapaRaddning(pussel) {
  const svar = [...versaler(pussel.svar)];
  const unika = [...new Set(svar)];
  const brickor = iBokstavsordning((pussel.brickor || unika).map((b, i) => ({ id: i, bokstav: versaler(b) })));
  const s = {
    svar: svar.join(''),
    brickor,
    /** @type {(string | null)[]} bokstaven i varje fält, null = tomt */
    falt: svar.map(() => /** @type {string | null} */ (null)),
    /** @type {Set<number>} brickor som är prövade (rätta och fel) */
    provade: new Set(),
    /** @type {Set<number>} fel brickor, utgråade */
    fela: new Set(),
    fel: 0,
    tillatnaFel: pussel.tillatna_fel ?? 3,
    /** kasta-läget är erbjudet (efter första rätta bokstaven) och pågår */
    kastaErbjuden: false,
    kastar: false,
    /** fel i rad på samma plats i kasta-läget */
    kastFel: 0,
    /** @type {number | null} brickan som blinkar (kasta-läget, efter två fel på samma plats) */
    tips: /** @type {number | null} */ (null),
    klar: false,
    kastat: false,
  };
  const nastaTomma = () => s.falt.findIndex((x) => x === null);
  const klar = () => s.falt.every((x) => x !== null);
  return {
    s,
    /**
     * Gissa en bokstav (vanliga läget).
     * @param {number} brickId
     * @returns {{ resultat: 'ratt' | 'fel' | 'klar' | 'ingen', nya: number[], erbjud: boolean }} nya = fälten som fylldes
     */
    gissa(brickId) {
      const b = s.brickor.find((x) => x.id === brickId);
      if (!b || s.klar || s.kastar || s.provade.has(brickId)) return { resultat: 'ingen', nya: [], erbjud: false };
      s.provade.add(brickId);
      const nya = svar.map((x, i) => (x === b.bokstav && s.falt[i] === null ? i : -1)).filter((i) => i >= 0);
      if (!nya.length) { s.fel++; s.fela.add(brickId); return { resultat: 'fel', nya, erbjud: false }; }
      for (const i of nya) s.falt[i] = b.bokstav;
      if (klar()) { s.klar = true; return { resultat: 'klar', nya, erbjud: false }; }
      const erbjud = !s.kastaErbjuden && !!pussel.kasta;
      if (erbjud) s.kastaErbjuden = true;
      return { resultat: 'ratt', nya, erbjud };
    },
    /** Staven: in i kasta-läget, eller ut ur det. @returns {boolean} om läget ändrades */
    vaxlaKasta() {
      if (s.klar || !s.kastaErbjuden) return false;
      s.kastar = !s.kastar; s.kastFel = 0; s.tips = null;
      return true;
    },
    /** Fältet som lyser i kasta-läget (nästa tomma). */
    get nasta() { return nastaTomma(); },
    /**
     * Kasta-läget: lägg en bricka i nästa tomma fält.
     * @param {number} brickId
     * @returns {{ resultat: 'lagd' | 'studs' | 'klar' | 'ingen', plats: number }}
     */
    kasta(brickId) {
      const b = s.brickor.find((x) => x.id === brickId);
      const plats = nastaTomma();
      if (!b || !s.kastar || s.klar || plats < 0 || s.fela.has(brickId)) return { resultat: 'ingen', plats };
      if (svar[plats] !== b.bokstav) {
        s.kastFel++;
        if (s.kastFel >= 2) s.tips = s.brickor.find((x) => x.bokstav === svar[plats])?.id ?? null;
        return { resultat: 'studs', plats };
      }
      s.falt[plats] = b.bokstav; s.kastFel = 0; s.tips = null;
      if (klar()) { s.klar = true; s.kastat = true; return { resultat: 'klar', plats }; }
      return { resultat: 'lagd', plats };
    },
    /** Fler fel än tillåtet (mjukt misslyckande). */
    get forMangaFel() { return s.fel > s.tillatnaFel; },
    get forstaForsoket() { return s.fel === 0; },
  };
}
