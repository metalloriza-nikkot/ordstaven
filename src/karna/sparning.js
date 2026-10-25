// @ts-check
// Sparformat och sparning. Porterad och omgjord från TURBO-RACE (06s_save.js).
// Regler (se CLAUDE.md): formatfält, en migrering per formatsteg, gamla sparningar ska alltid gå att läsa.
// Hjälten är en egen del med eget formatfält och kan exporteras till kommande äventyr.

export const APP = 'ORDSTAVEN';
export const FORMAT = 1;
export const HJALTE_FORMAT = 1;

export const NYCKEL = 'ordstaven_spar';
export const NYCKEL_BACKUP = 'ordstaven_spar_backup';
export const NYCKEL_TRASIG = 'ordstaven_spar_trasig';

/**
 * Migreringar: MIGRERINGAR[n] gör om format n till n + 1. Läggs till när formatet ändras.
 * @type {Record<number, (data: any) => any>}
 */
export const MIGRERINGAR = {};

/** @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }} Lagring */

/** Ett helt nytt tillstånd. @param {string} spelversion @param {() => Date} klocka */
export function nyttTillstand(spelversion, klocka = () => new Date()) {
  return {
    app: APP,
    format: FORMAT,
    spelversion,
    sparad: klocka().toISOString(),
    spelare: {
      hjalte: { format: HJALTE_FORMAT, id: slumpId(), namn: '', utseende: {}, grad: null, formler: [] },
      larande: { lasning: {}, skrivning: {}, ord: {}, matte: {}, historik: [] },
    },
    // ett äventyr läggs till första gången det spelas (aventyrFor)
    aventyr: {},
    foraldra: { pin: null, veckansBokstav: null, egnaOrd: [] },
    installningar: {},
  };
}

/**
 * Sparningens del för ett äventyr, skapas om den saknas. Det som är spelarens (hjälten, lärandet) ligger
 * i `spelare` och följer med till nästa äventyr. Det som är äventyrets (var man är, bär, kartbitar, ungen) ligger här.
 * @param {any} tillstand @param {string} aventyrId
 */
export function aventyrFor(tillstand, aventyrId) {
  if (!tillstand.aventyr[aventyrId]) tillstand.aventyr[aventyrId] = { kapitel: 0, flaggor: {}, bar: 0, kartbitar: [], ungen: { namn: '', steg: 1 } };
  return tillstand.aventyr[aventyrId];
}

/**
 * Kontrollera och migrera en inläst sparning. Kastar fel om det inte är en ORDSTAVEN-sparning.
 * @param {any} data @returns {any}
 */
export function migrera(data) {
  if (!data || typeof data !== 'object' || data.app !== APP) throw new Error('inte en ORDSTAVEN-sparning');
  if (!Number.isInteger(data.format) || data.format < 1) throw new Error('okänt format');
  if (data.format > FORMAT) throw new Error(`sparningen är från en nyare version (format ${data.format})`);
  let d = data;
  while (d.format < FORMAT) {
    const m = MIGRERINGAR[d.format];
    if (!m) throw new Error(`migrering saknas för format ${d.format}`);
    d = m(d);
  }
  return d;
}

/**
 * @param {{ lagring: Lagring, spelversion: string, klocka?: () => Date, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 */
export function skapaSparning({ lagring, spelversion, klocka = () => new Date(), logg }) {
  const L = (/** @type {string} */ m, /** @type {any} */ d) => logg && logg.handelse('spara', m, d);

  return {
    /** Läs sparningen, eller ett nytt tillstånd. Trasiga sparningar läggs undan, aldrig raderas. */
    las() {
      let text = null;
      try { text = lagring.getItem(NYCKEL); } catch (e) { L('kunde inte läsa', String(e)); }
      if (!text) return nyttTillstand(spelversion, klocka);
      try {
        return migrera(JSON.parse(text));
      } catch (e) {
        L('trasig sparning lagd undan', String(e));
        try { lagring.setItem(NYCKEL_TRASIG, text); } catch (e2) { /* ingen plats */ }
        return nyttTillstand(spelversion, klocka);
      }
    },
    /** @param {any} tillstand @returns {boolean} */
    spara(tillstand) {
      tillstand.sparad = klocka().toISOString();
      tillstand.spelversion = spelversion;
      try { lagring.setItem(NYCKEL, JSON.stringify(tillstand)); return true; }
      catch (e) { L('kunde inte spara (full lagring?)', String(e)); return false; }
    },
    /** Börja om: sparningen läggs i backup (kan ångras), sedan tas den bort. */
    nollstall() {
      try { const nu = lagring.getItem(NYCKEL); if (nu) lagring.setItem(NYCKEL_BACKUP, JSON.stringify({ tid: klocka().toISOString(), tillstand: JSON.parse(nu) })); } catch (e) { /* ok */ }
      try { lagring.removeItem(NYCKEL); } catch (e) { /* ok */ }
      L('nollställd');
    },
    /** Hela sparningen som text, för fil-export. @param {any} tillstand */
    tillText(tillstand) { return JSON.stringify(tillstand, null, 1); },
    /**
     * Läs in en sparfil. Det nuvarande tillståndet läggs i backup så att laddningen kan ångras.
     * @param {string} text @param {any} nuvarande @returns {any} det nya tillståndet
     */
    franText(text, nuvarande) {
      const data = migrera(JSON.parse(text));
      try { lagring.setItem(NYCKEL_BACKUP, JSON.stringify({ tid: klocka().toISOString(), tillstand: nuvarande })); } catch (e) { /* ingen plats */ }
      this.spara(data);
      L('inläst från fil');
      return data;
    },
    /** Ångra senaste inläsning. @returns {any | null} */
    angra() {
      let b = null;
      try { b = JSON.parse(lagring.getItem(NYCKEL_BACKUP) || 'null'); } catch (e) { /* trasig */ }
      if (!b || !b.tillstand) return null;
      this.spara(b.tillstand);
      try { lagring.removeItem(NYCKEL_BACKUP); } catch (e) { /* ok */ }
      L('inläsning ångrad');
      return b.tillstand;
    },
    /** Hjälten som egen fil, till kommande äventyr. @param {any} tillstand */
    hjalteTillText(tillstand) {
      return JSON.stringify({ app: APP + '-HJALTE', format: HJALTE_FORMAT, sparad: klocka().toISOString(), hjalte: tillstand.spelare.hjalte }, null, 1);
    },
  };
}

function slumpId() {
  try { if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* äldre Safari */ }
  return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
