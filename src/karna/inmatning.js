// @ts-check
// Inmatningslagret: översätter tangentbord och tryck till HANDLINGAR.
// Scenerna läser bara handlingar härifrån, aldrig råa tangent- eller pekhändelser.
// Modulen rör inte DOM. Kopplingen till webbläsaren finns i src/grans/inmatningDom.js.

/** Tangentkod (KeyboardEvent.code) → riktning. Bara piltangenter: bokstäverna behövs för att skriva. */
const RIKTNINGAR = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};
/** Tangentkod → engångshandling. */
const KNAPPAR = { Space: 'interagera', Enter: 'interagera', Escape: 'stang', Backspace: 'sudda' };
const BOKSTAV = /^[A-ZÅÄÖ]$/;

/**
 * @typedef {{ typ: string, [k: string]: any }} Handling
 */

export function skapaInmatning() {
  /** @type {Set<string>} nedtryckta riktningstangenter, i ordning */
  const nere = new Set();
  /** @type {{ x: number, y: number } | null} */
  let gaTill = null;
  /** @type {Handling[]} */
  let ko = [];
  /** @type {Set<(h: Handling) => void>} */
  const lyssnare = new Set();
  /** @param {Handling} h */
  const skicka = (h) => {
    ko.push(h); if (ko.length > 50) ko.shift();
    for (const f of lyssnare) { try { f(h); } catch (e) { /* en lyssnare får inte stoppa de andra */ } }
  };

  return {
    /** @param {string} kod KeyboardEvent.code @param {string} [tecken] KeyboardEvent.key @returns {boolean} om tangenten användes */
    tangentNer(kod, tecken = '') {
      if (kod in RIKTNINGAR) { nere.add(kod); gaTill = null; return true; }
      if (kod in KNAPPAR) { skicka({ typ: KNAPPAR[/** @type {keyof KNAPPAR} */ (kod)] }); return true; }
      // Nosen ligger på Tab, inte på en bokstav: alla bokstäver måste gå att skriva (N i ett namn).
      if (kod === 'Tab') { skicka({ typ: 'hjalp' }); return true; }
      const t = tecken.toUpperCase();
      if (BOKSTAV.test(t)) { skicka({ typ: 'bokstav', tecken: t }); return true; }
      return false;
    },
    /** @param {string} kod */
    tangentUpp(kod) { nere.delete(kod); },
    /** Släpp allt (fönstret tappade fokus, appen gick i bakgrunden). */
    slappAllt() { nere.clear(); },
    /** Tryck eller klick på en punkt i rummet. @param {number} x @param {number} y */
    tryck(x, y) { gaTill = { x, y }; skicka({ typ: 'tryck', x, y }); },
    /** Sätt ett mål utan att skicka en handling (scenen styr om ett tryck till ett objekt). @param {number} x @param {number} y */
    sattGaTill(x, y) { gaTill = { x, y }; },
    /** Lyssna på alla handlingar. Returnerar en funktion som slutar lyssna. @param {(h: Handling) => void} f */
    lyssna(f) { lyssnare.add(f); return () => lyssnare.delete(f); },
    /** Målet är nått eller avbrutet. */
    rensaGaTill() { gaTill = null; },
    /** Aktuell riktning från tangenterna, normaliserad (diagonal går lika fort). */
    riktning() {
      let x = 0, y = 0;
      for (const k of nere) { x += RIKTNINGAR[/** @type {keyof RIKTNINGAR} */ (k)][0]; y += RIKTNINGAR[/** @type {keyof RIKTNINGAR} */ (k)][1]; }
      x = Math.sign(x); y = Math.sign(y);
      const l = Math.hypot(x, y);
      return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
    },
    /** Punkt att gå till efter ett tryck, eller null. */
    gaTillMal() { return gaTill; },
    /** Hämta och töm kön med engångshandlingar. @returns {Handling[]} */
    hamtaHandlingar() { const h = ko; ko = []; return h; },
  };
}
