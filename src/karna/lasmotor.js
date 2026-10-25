// @ts-check
// Läsmotorn: anpassning per pusseltyp och logg per försök. Porterad från TURBO-RACE (04w_words.js, Words.record):
// 3 rätt i rad utan hjälp → upp ett steg, 2 fel i rad → ned ett steg. Nytt här: nivån hålls per pusseltyp,
// läsning (L1–L7) och skrivning (S1–S5) för sig, och gemener räknas för sig.
// Ingen global: lärandedelen av sparningen skickas in och ändras på plats.

const MAX_HISTORIK = 300;
export const START = Object.freeze({ L: 2, S: 1 });
const TAK = Object.freeze({ L: 7, S: 5 });

/** @param {string} niva t.ex. "L2" @returns {{ slag: 'L'|'S', tal: number }} */
export function tolkaNiva(niva) {
  const m = /^([LS])([1-7])$/.exec(niva || '');
  if (!m) throw new Error('okänd nivå ' + niva);
  return { slag: /** @type {'L'|'S'} */ (m[1]), tal: Number(m[2]) };
}

/**
 * Välj variant: den högsta nivån som inte är över spelarens nivå, annars den lägsta.
 * @param {Record<string, any>} varianter nycklar "L1", "L2" … @param {number} tal spelarens nivå
 * @returns {[string, any]}
 */
export function valjVariant(varianter, tal) {
  const sorterade = Object.keys(varianter).sort((a, b) => tolkaNiva(a).tal - tolkaNiva(b).tal);
  let vald = sorterade[0];
  for (const n of sorterade) if (tolkaNiva(n).tal <= tal) vald = n;
  return [vald, varianter[vald]];
}

/** Variant ett steg lägre än den givna, eller null. @param {Record<string, any>} varianter @param {string} nu */
export function lagreVariant(varianter, nu) {
  const sorterade = Object.keys(varianter).sort((a, b) => tolkaNiva(a).tal - tolkaNiva(b).tal);
  const i = sorterade.indexOf(nu);
  return i > 0 ? sorterade[i - 1] : null;
}

/**
 * @param {{ larande: any, klocka?: () => number, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 *   larande = tillstand.spelare.larande (ändras på plats)
 */
export function skapaLasmotor({ larande, klocka = () => Date.now(), logg }) {
  larande.lasning = larande.lasning || {};
  larande.skrivning = larande.skrivning || {};
  larande.historik = larande.historik || [];

  /** @param {'L'|'S'} slag @param {string} nyckel */
  const post = (slag, nyckel) => {
    const omr = slag === 'L' ? larande.lasning : larande.skrivning;
    if (!omr[nyckel]) omr[nyckel] = { niva: START[slag], streak: 0, miss: 0, uppgifter: 0, forstaForsok: 0, hjalp: 0, aa: 0 };
    return omr[nyckel];
  };
  const nyckelFor = (/** @type {string} */ typ, /** @type {boolean} */ gemener) => (gemener ? typ + ':gemener' : typ);

  return {
    /** Aktuell nivå (tal) för en pusseltyp. @param {'L'|'S'} slag @param {string} typ */
    niva(slag, typ, gemener = false) { return post(slag, nyckelFor(typ, gemener)).niva; },

    /** Sätt nivån (föräldravyn). @param {'L'|'S'} slag @param {string} typ @param {number} tal */
    sattNiva(slag, typ, tal, gemener = false) {
      const p = post(slag, nyckelFor(typ, gemener));
      p.niva = Math.max(1, Math.min(TAK[slag], tal)); p.streak = 0; p.miss = 0;
    },

    /**
     * Ett avslutat pussel. Vilouppgifter och fritt skrivande registreras inte.
     * @param {{ pussel_id: string, typ: string, niva: string, ratt: boolean, antal_forsok: number,
     *           hjalp_anvand: boolean, tid: number, aa_forvaxling?: boolean, gemener?: boolean }} r
     *   ratt = löst på första försöket
     */
    registrera(r) {
      const { slag } = tolkaNiva(r.niva);
      const p = post(slag, nyckelFor(r.typ, !!r.gemener));
      const fore = p.niva;
      p.uppgifter++;
      if (r.hjalp_anvand) p.hjalp++;
      if (r.aa_forvaxling) p.aa++;
      if (r.ratt && !r.hjalp_anvand) {
        p.forstaForsok++; p.streak++; p.miss = 0;
        if (p.streak >= 3 && p.niva < TAK[slag]) { p.niva++; p.streak = 0; }
      } else if (!r.ratt) {
        p.miss++; p.streak = 0;
        if (p.miss >= 2 && p.niva > 1) { p.niva--; p.miss = 0; }
      } else {
        p.streak = Math.max(0, p.streak - 1);
      }
      larande.historik.push({ ...r, tid: Math.round(r.tid), nar: klocka() });
      if (larande.historik.length > MAX_HISTORIK) larande.historik.splice(0, larande.historik.length - MAX_HISTORIK);
      if (p.niva !== fore && logg) logg.handelse('nivå', `${r.typ} ${slag}${fore} → ${slag}${p.niva}`);
      return p.niva;
    },
  };
}
