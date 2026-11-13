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
        // flera rätta svar (2.43, stocken): det valda alternativets vid_valj hör till reaktionen
        if (pussel.flera_ratta && a.vid_valj) return { resultat: 'klar', reaktion: { ...(pussel.vid_ratt ?? {}), ...a.vid_valj }, forenklad: false };
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
    /** det senaste fel ordet han lade */
    felOrd: /** @type {string | null} */ (null),
    klar: false,
  };
  const ledigaBrickor = () => s.brickor.filter((b) => !s.platser.includes(b.id));
  const forstaTomma = () => s.platser.findIndex((p) => p === null);
  // Med trappan (`forebild.visas: andra_felet`, beslut 74.3) är förebilden det sista steget: förenklingen blinkar
  // ingen bricka, eftersom han då skulle skriva av bokstav för bokstav medan förebilden är täckt (titta, täck, skriv).
  const trappa = pussel.forebild?.visas === 'andra_felet';
  const uppdateraTips = () => {
    if (trappa || !(pussel.forenkla && s.fel >= pussel.forenkla.efter_fel)) { s.tips = null; return; }
    const plats = forstaTomma();
    if (plats < 0) { s.tips = null; return; }
    s.tips = ledigaBrickor().find((b) => b.bokstav === svar[plats])?.id ?? null;
  };

  /**
   * samma = samma fel ord som förra gången: då blir reaktionen kortare (stilguiden §7).
   * @returns {{ resultat: 'lagd' | 'klar' | 'fel' | 'ingen', reaktion: Handling | null, samma?: boolean }}
   */
  function kontrollera() {
    if (forstaTomma() >= 0) { uppdateraTips(); return { resultat: 'lagd', reaktion: null }; }
    const ratt = s.platser.map((id, i) => s.brickor.find((b) => b.id === id)?.bokstav === svar[i]);
    if (ratt.every(Boolean)) { s.klar = true; s.tips = null; return { resultat: 'klar', reaktion: pussel.vid_ratt ?? null }; }
    s.fel++;
    const ord = s.platser.map((id) => s.brickor.find((b) => b.id === id)?.bokstav ?? '').join('');
    const samma = ord === s.felOrd; s.felOrd = ord;
    s.senastRatt = ratt;
    s.platser = s.platser.map((id, i) => (ratt[i] && pussel.ratt_bokstav_stannar !== false ? id : null));
    s.last = ratt.map((r) => r && pussel.ratt_bokstav_stannar !== false);
    uppdateraTips();
    return { resultat: 'fel', reaktion: pussel.vid_fel ?? null, samma };
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
  // ett fält av tussar (2.43, vassväggen 75.3): innehållet ligger där det står, och vägen är öppen när alla tussar
  // med falt.klar_nar har fallit. Resten går att hugga, och pusslet är helt klart när allt har fallit.
  if (pussel.falt) {
    const gang = pussel.falt.klar_nar;
    const mal = innehall.map((x, i) => (x === gang ? i : -1)).filter((i) => i >= 0);
    const s = { antal: innehall.length, slagna: /** @type {(string | null)[]} */ (innehall.map(() => null)), klar: false, oppen: mal.length === 0, mal };
    return {
      s,
      sista: null,
      /** @param {number} i */
      sla(i) {
        if (i < 0 || s.slagna[i] !== null || s.klar) return null;
        s.slagna[i] = innehall[i];
        if (mal.every((j) => s.slagna[j] !== null)) s.oppen = true;
        if (s.slagna.every((x) => x !== null)) s.klar = true;
        return innehall[i] === gang ? 'tom' : innehall[i];
      },
    };
  }
  // sak_vid (2.47, skylten under mossan): posten på den platsen hittas alltid som nummer sak_vid, oavsett vilken sak
  // han lyfter, och då är pusslet klart. Han letar lite men behöver aldrig lyfta alla.
  if (pussel.sak_vid && pussel.sak_vid <= innehall.length) {
    const nr = pussel.sak_vid;
    const sak = innehall[nr - 1];
    const ovriga = blanda(innehall.filter((_, i) => i !== nr - 1), slump);
    const s = { antal: innehall.length, slagna: /** @type {(string | null)[]} */ (innehall.map(() => null)), klar: false };
    return {
      s,
      sista: sak,
      /** @param {number} i */
      sla(i) {
        if (s.slagna[i] !== null || s.klar) return null;
        const gjorda = s.slagna.filter((x) => x !== null).length;
        const fynd = gjorda + 1 === nr ? sak : /** @type {string} */ (ovriga.shift() ?? 'tom');
        s.slagna[i] = fynd;
        if (gjorda + 1 === nr) s.klar = true;
        return fynd;
      },
    };
  }
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

// ---------------------------------------------------------------------------------------------
// P29 läs och gör med antal (2.47, hornet)
// ---------------------------------------------------------------------------------------------
/**
 * Reaktionen för ett antal tryck som inte är rätt: "2" gäller exakt två, och "3+" tre eller fler (det största
 * "n+" som räcker). @param {Record<string, any> | undefined} vidAntal @param {number} antal @returns {any}
 */
export function reaktionForAntal(vidAntal, antal) {
  if (!vidAntal) return null;
  if (vidAntal[String(antal)]) return vidAntal[String(antal)];
  let bast = null, bastN = -1;
  for (const [k, h] of Object.entries(vidAntal)) {
    const m = /^(\d+)\+$/.exec(k);
    if (m && Number(m[1]) <= antal && Number(m[1]) > bastN) { bast = h; bastN = Number(m[1]); }
  }
  return bast;
}

/**
 * Hornet: varje tryck räknas, och när det har varit tyst (spelet håller klockan) bedöms antalet. Rätt antal löser
 * pusslet. Annars kommer reaktionen för antalet, och han kan försöka igen. Ingen klocka går innan första trycket.
 * @param {{ ratt: number, vid_antal?: Record<string, any>, vid_fel?: any }} pussel
 */
export function skapaTryck(pussel) {
  const s = { antal: 0, fel: 0, forsok: 0, klar: false };
  return {
    s,
    /** Ett tryck. @returns {number} antalet i det här försöket */
    tryck() { if (!s.klar) s.antal++; return s.antal; },
    /** Det har varit tyst: bedöm försöket. @returns {{ resultat: 'ratt' | 'fel' | 'inget', antal: number, reaktion?: any }} */
    bedom() {
      const antal = s.antal;
      if (!antal || s.klar) return { resultat: 'inget', antal };
      s.antal = 0; s.forsok++;
      if (antal === pussel.ratt) { s.klar = true; return { resultat: 'ratt', antal }; }
      s.fel++;
      return { resultat: 'fel', antal, reaktion: reaktionForAntal(pussel.vid_antal, antal) ?? pussel.vid_fel ?? null };
    },
  };
}

// ---------------------------------------------------------------------------------------------
// P9 med lage meddelande (2.47, chiffret i kapitel 3)
// ---------------------------------------------------------------------------------------------
/**
 * Ett meddelande i Farfars tecken: en ruta i taget, och han skriver bokstaven för tecknet med tangentbordet. Rätt
 * bokstav står kvar direkt och nästa tecken markeras. Ett mellanslag mellan två ord hoppas över. Hjälpen och loggen
 * gäller tecknet han står vid: fel per tecken, och om hjälpen (förenklingen eller nosen) användes.
 * @param {{ chiffer: { tecken: string[], nyckel: { tecken: string, bokstav: string }[] }, forenkla?: { efter_fel: number } }} pussel
 * @param {{ nu?: () => number }} [opt]
 */
export function skapaMeddelande(pussel, { nu = () => 0 } = {}) {
  const nyckel = new Map(pussel.chiffer.nyckel.map((n) => [n.tecken, n.bokstav]));
  const tecken = pussel.chiffer.tecken;
  /** platserna med ett tecken (inte mellanslagen), i ordning */
  const platser = tecken.map((t, i) => (t === ' ' ? -1 : i)).filter((i) => i >= 0);
  const forenklaEfter = pussel.forenkla?.efter_fel ?? 2;
  const s = {
    /** bokstäverna som står, per plats i tecken ('' = tom, ' ' = mellanslag) */
    skrivet: tecken.map((t) => (t === ' ' ? ' ' : '')),
    /** platsen i tecken som är markerad, eller -1 när meddelandet är klart */
    nu: platser[0] ?? -1,
    fel: 0,
    /** per tecken: fel, hjälp och tid */
    logg: /** @type {{ plats: number, tecken: string, bokstav: string, fel: number, hjalp: boolean, ms: number }[]} */ ([]),
    felNu: 0, hjalpNu: false, start: nu(),
    klar: false,
  };
  const ratt = (/** @type {number} */ i) => nyckel.get(tecken[i]) ?? '';
  return {
    s,
    /** Bokstaven för den markerade platsen. */
    get bokstavNu() { return s.nu >= 0 ? ratt(s.nu) : null; },
    /** Tecknet på den markerade platsen. */
    get tecknetNu() { return s.nu >= 0 ? tecken[s.nu] : null; },
    /** Ska tecknet och dess bokstav lysa på nyckeln (förenklingen efter två fel på samma tecken)? */
    get forenklad() { return s.felNu >= forenklaEfter; },
    /** Hjälpen användes på tecknet (nosen, eller förenklingen syntes). */
    hjalp() { s.hjalpNu = true; },
    /**
     * En bokstav. @param {string} bokstav
     * @returns {{ resultat: 'ratt' | 'fel' | 'klar' | 'ingen', plats: number, felNu?: number }}
     */
    skriv(bokstav) {
      if (s.klar || s.nu < 0) return { resultat: 'ingen', plats: -1 };
      const plats = s.nu;
      const b = String(bokstav).toLocaleUpperCase('sv-SE');
      if (b !== ratt(plats)) { s.fel++; s.felNu++; if (s.felNu >= forenklaEfter) s.hjalpNu = true; return { resultat: 'fel', plats, felNu: s.felNu }; }
      s.skrivet[plats] = b;
      const t = nu();
      s.logg.push({ plats, tecken: tecken[plats], bokstav: b, fel: s.felNu, hjalp: s.hjalpNu, ms: Math.round(t - s.start) });
      s.felNu = 0; s.hjalpNu = false; s.start = t;
      const nasta = platser.find((i) => i > plats);
      s.nu = nasta ?? -1;
      if (s.nu < 0) { s.klar = true; return { resultat: 'klar', plats }; }
      return { resultat: 'ratt', plats };
    },
    /** Meddelandet som det står, i versaler. */
    get text() { return s.skrivet.join(''); },
  };
}
