// @ts-check
// Sparformat och sparning. Porterad och omgjord från TURBO-RACE (06s_save.js).
// Regler (se CLAUDE.md): formatfält, en migrering per formatsteg, gamla sparningar ska alltid gå att läsa.
// Hjälten är en egen del med eget formatfält och kan exporteras till kommande äventyr.

export const APP = 'ORDSTAVEN';
export const FORMAT = 4;
export const UNGE_FORMAT = 1;
export const HJALTE_FORMAT = 2;

export const NYCKEL = 'ordstaven_spar';
export const NYCKEL_BACKUP = 'ordstaven_spar_backup';
export const NYCKEL_TRASIG = 'ordstaven_spar_trasig';

/**
 * Sparplatserna (fas 4, F1, brief 9a): en sparning per spelare, så att NYTT ÄVENTYR aldrig raderar något. Plats "1"
 * är den gamla sparningen (ordstaven_spar), så alla sparningar från före platserna läses som förut. Listan över
 * platserna och vilken som spelas ligger i en egen nyckel med eget formatfält.
 */
export const NYCKEL_PLATSER = 'ordstaven_platser';
export const PLATSER_FORMAT = 1;
/** Sparningens nyckel för en plats. @param {string} plats */
export const nyckelFor = (plats) => (plats === '1' ? NYCKEL : `${NYCKEL}_${plats}`);

/**
 * Migreringar: MIGRERINGAR[n] gör om format n till n + 1. Läggs till när formatet ändras.
 * @type {Record<number, (data: any) => any>}
 */
export const MIGRERINGAR = {
  // 1 → 2: ungen flyttar från äventyret till spelaren (den kan följa med till nästa äventyr, eller inte),
  // och inställningen foralderLaserFarfar byter namn till foralderLaser
  1: (d) => {
    const forsta = Object.values(d.aventyr || {}).find((a) => a && a.ungen && a.ungen.namn) || Object.values(d.aventyr || {}).find((a) => a && a.ungen);
    const gammal = forsta ? forsta.ungen : {};
    d.spelare.unge = { format: UNGE_FORMAT, namn: gammal.namn || '', steg: gammal.steg || 1, formagor: [], ...(gammal.folj !== undefined ? { folj: gammal.folj } : {}) };
    for (const a of Object.values(d.aventyr || {})) if (a) delete a.ungen;
    // inställningen heter inte längre efter en figur i ett visst äventyr: föräldern läser rollerna som har föräldraröst
    if (d.installningar && 'foralderLaserFarfar' in d.installningar) {
      d.installningar.foralderLaser = !!d.installningar.foralderLaserFarfar;
      delete d.installningar.foralderLaserFarfar;
    }
    d.format = 2;
    return d;
  },
  // 2 → 3: gråboxens etiketter för den vuxne (föremålens namn) är avstängda från början. Den gamla nyckeln
  // "etiketter" hade förvalet på, så värdet säger inget om vad den vuxne har valt: den tas bort, och den nya
  // nyckeln vuxenEtiketter börjar avstängd.
  2: (d) => {
    if (d.installningar) delete d.installningar.etiketter;
    d.format = 3;
    return d;
  },
  // 3 → 4: hjältens lager (T2). Hjälten är spelarens figur: formen är fast, huden och dräkten är palettbyten
  // (utseende.hudfarg, utseende.drakt), och hjälmdekoren och ryggsäcken är saker han hittar (lager, garderob).
  // De gamla valen hudton och klader blir hudfarg och drakt. Hjälmens och skornas färg (hatt, kropp) går inte
  // längre att välja (ledningen 2026-10-26: färger men inte form, hjälmen är grå).
  3: (d) => {
    const h = d.spelare.hjalte;
    if (h && (h.format ?? 1) < 2) {
      const u = h.utseende || {};
      h.utseende = {
        ...(Number.isInteger(u.hudton) ? { hudfarg: u.hudton } : {}),
        ...(Number.isInteger(u.klader) ? { drakt: u.klader } : {}),
      };
      h.lager = { hjalmdekor: null, ryggsack: null, ...(h.lager || {}) };
      h.garderob = h.garderob || [];
      h.format = 2;
    }
    // hjälteboken: Dinobokens sidor, ungens tillägg och vad han har tittat på (stjärnan på en ny flik)
    d.spelare.dinobok = d.spelare.dinobok || [];
    d.spelare.sett = d.spelare.sett || {};
    if (d.spelare.unge) d.spelare.unge.tillagg = d.spelare.unge.tillagg || [];
    d.format = 4;
    return d;
  },
};

/** @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }} Lagring */

/** Ett helt nytt tillstånd. @param {string} spelversion @param {() => Date} klocka */
export function nyttTillstand(spelversion, klocka = () => new Date()) {
  return {
    app: APP,
    format: FORMAT,
    spelversion,
    sparad: klocka().toISOString(),
    spelare: {
      // hjälten: utseende = palettbyten (hudfarg, drakt), lager = det han har på sig (hjalmdekor, ryggsack),
      // garderob = allt han har hittat att ha på sig
      hjalte: { format: HJALTE_FORMAT, id: slumpId(), namn: '', utseende: {}, lager: { hjalmdekor: null, ryggsack: null }, garderob: [], grad: null, formler: [] },
      // ungen hör till spelaren: namn, växtsteg och förmågor står öppna för nästa äventyr
      unge: { format: UNGE_FORMAT, namn: '', steg: 1, formagor: [], tillagg: [] },
      // hjälteboken: Dinobokens sidor ({ bild, bildtext }) och hur mycket av varje flik han har sett
      dinobok: [],
      sett: {},
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
 * i `spelare` och följer med till nästa äventyr. Ungen ligger hos spelaren (spelare.unge). Det som är äventyrets (var man är, bär, kartbitar) ligger här.
 * @param {any} tillstand @param {string} aventyrId
 */
export function aventyrFor(tillstand, aventyrId) {
  if (!tillstand.aventyr[aventyrId]) tillstand.aventyr[aventyrId] = { kapitel: 0, flaggor: {}, bar: 0, kartbitar: [] };
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
 * @param {{ lagring: Lagring, spelversion: string, klocka?: () => Date, logg?: { handelse(t: string, m: string, d?: any): void }, plats?: string }} opt
 */
export function skapaSparning({ lagring, spelversion, klocka = () => new Date(), logg, plats = '1' }) {
  const L = (/** @type {string} */ m, /** @type {any} */ d) => logg && logg.handelse('spara', m, d);
  // platsens nycklar: plats 1 har de gamla (ordstaven_spar, _backup, _trasig)
  const NYCKEL = nyckelFor(plats), NYCKEL_BACKUP = `${NYCKEL}_backup`, NYCKEL_TRASIG = `${NYCKEL}_trasig`;

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

/**
 * Sparplatserna: vilka spelare som finns på den här enheten och vilken som spelas. Varje plats har en hel egen
 * sparning (hjälten, ungen, lärandet och äventyret). En ny plats raderar aldrig en annan, och att ta bort en går
 * bara i menyn för vuxna (den läggs då i platsens backup).
 * @param {{ lagring: Lagring, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 */
export function skapaPlatser({ lagring, logg }) {
  const L = (/** @type {string} */ m, /** @type {any} */ d) => logg && logg.handelse('spelare', m, d);
  const finns = (/** @type {string} */ p) => { try { return !!lagring.getItem(nyckelFor(p)); } catch (e) { return false; } };
  /** @returns {{ format: number, aktiv: string, platser: string[] }} */
  const las = () => {
    /** @type {any} */ let d = null;
    try { d = JSON.parse(lagring.getItem(NYCKEL_PLATSER) || 'null'); } catch (e) { /* trasig: börja om från sparningarna */ }
    if (!d || !Array.isArray(d.platser)) d = { format: PLATSER_FORMAT, aktiv: '1', platser: finns('1') ? ['1'] : [] };
    // den aktiva platsen står alltid i listan (en sparning skrivs först när han spelar)
    if (!d.platser.includes(d.aktiv)) d.platser = [...d.platser, d.aktiv];
    return d;
  };
  const skriv = (/** @type {any} */ d) => { try { lagring.setItem(NYCKEL_PLATSER, JSON.stringify({ ...d, format: PLATSER_FORMAT })); } catch (e) { L('kunde inte spara platserna', String(e)); } };
  /**
   * Det startskärmen visar för en plats: hjältens namn och färger, ungen, och om han har börjat.
   * @returns {{ plats: string, namn: string, utseende: Record<string, number>, unge: { namn: string, steg: number } | null, borjat: boolean }}
   */
  const info = (/** @type {string} */ plats) => {
    /** @type {any} */ let t = null;
    try { const text = lagring.getItem(nyckelFor(plats)); t = text ? migrera(JSON.parse(text)) : null; } catch (e) { t = null; }
    const h = t?.spelare?.hjalte, u = t?.spelare?.unge;
    const borjat = !!t && (!!h?.namn || Object.values(t.aventyr || {}).some((/** @type {any} */ a) => a && (a.startad || a.scenId || a.kapitelId || (a.scen ?? 0) > 0)));
    return { plats, namn: h?.namn || '', utseende: { ...(h?.utseende || {}) }, unge: u?.namn ? { namn: u.namn, steg: u.steg || 1 } : null, borjat };
  };
  return {
    /** Platsernas id i ordning. */
    lista: () => las().platser,
    /** Platsen som spelas. */
    aktiv: () => las().aktiv,
    /** Spela en annan plats (som finns). @param {string} plats */
    valj(plats) {
      const d = las();
      if (!d.platser.includes(plats)) return false;
      skriv({ ...d, aktiv: plats }); L('vald', { plats });
      return true;
    },
    /**
     * En ny plats för en ny spelare, med en kopia av enhetens inställningar (rösten, de öppna kapitlen) och den
     * vuxnes (pin, egna ord). Den blir den som spelas. @param {any} [mall] sparningen att ta inställningarna från
     * @param {string} [spelversion] @returns {string} platsens id
     */
    ny(mall, spelversion = '') {
      const d = las();
      // en plats där ingen har börjat (ett nytt äventyr som aldrig spelades) används igen, så att platserna inte blir fler
      const tom = d.platser.find((p) => p !== d.aktiv && !info(p).borjat);
      // en borttagen plats har kvar sin backup: det numret används inte igen
      const upptagen = (/** @type {string} */ p) => d.platser.includes(p) || finns(p) || (() => { try { return !!lagring.getItem(`${nyckelFor(p)}_backup`); } catch (e) { return false; } })();
      let n = 2; while (upptagen(`p${n}`)) n++;
      const plats = tom ?? `p${n}`;
      const t = nyttTillstand(spelversion);
      if (mall) { t.installningar = JSON.parse(JSON.stringify(mall.installningar || {})); t.foraldra = JSON.parse(JSON.stringify(mall.foraldra || t.foraldra)); }
      try { lagring.setItem(nyckelFor(plats), JSON.stringify(t)); } catch (e) { L('kunde inte skapa platsen', String(e)); }
      skriv({ ...d, aktiv: plats, platser: d.platser.includes(plats) ? d.platser : [...d.platser, plats] });
      L('ny', { plats });
      return plats;
    },
    /**
     * Ta bort en plats (menyn för vuxna). Sparningen läggs i platsens backup, så att den kan tas tillbaka.
     * Den som spelas kan inte tas bort. @param {string} plats
     */
    taBort(plats) {
      const d = las();
      if (plats === d.aktiv || !d.platser.includes(plats)) return false;
      try {
        const nu = lagring.getItem(nyckelFor(plats));
        if (nu) lagring.setItem(`${nyckelFor(plats)}_backup`, JSON.stringify({ tid: new Date().toISOString(), tillstand: JSON.parse(nu) }));
        lagring.removeItem(nyckelFor(plats));
      } catch (e) { /* ok */ }
      skriv({ ...d, platser: d.platser.filter((p) => p !== plats) });
      L('borttagen', { plats });
      return true;
    },
    info,
  };
}

function slumpId() {
  try { if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* äldre Safari */ }
  return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
