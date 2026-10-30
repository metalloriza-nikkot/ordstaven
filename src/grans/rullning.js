// @ts-check
// Det som sägs rullas fram (beslut 21.2, stilguiden §3): repliker och berättaren, ca 40 tecken per sekund.
// Det han ska läsa (lappar, skyltar, kort, molnet, formler) rullas aldrig, och går inte genom den här modulen.
// Orden tar sin plats från början (dolda tecken har sin bredd), så raden hoppar aldrig. Ett tryck visar allt.
// Markeringen (guldlinjen under ordet) följer rösten från första ordet. Utan röst piper rullningen lågt i ordtakt,
// och när föräldern läser Farfar är den tyst. Golvdatorn: hackar rullningen (långa glapp mellan bildrutorna)
// rullar texten resten av passet fram ett ord i taget i samma takt, och loggen säger det.
import { ordStarter, ordVid, ordTider, teckenTid, RULLNING } from '../karna/framskrivning.js';

/**
 * @typedef {{ text: string, roll: string, tala: ((vidOrd: (i: number) => void) => Promise<any>) | null,
 *             pip: boolean, markera: boolean, direkt?: boolean }} Val
 * text = det som sägs (vanlig skrift, platshållare ersatta). tala = rösten (null utan röst). pip = pip i ordtakt.
 * direkt = allt syns direkt (snabbläget i testerna).
 */

/**
 * @param {{ ljud: { pip(roll: string): void }, logg: { handelse(t: string, m: string, d?: any): void },
 *           nu?: () => number, ram?: (f: () => void) => number, slutaRam?: (id: number) => void }} b
 */
export function skapaRullning({ ljud, logg, nu = () => performance.now(), ram = (f) => requestAnimationFrame(f), slutaRam = (id) => cancelAnimationFrame(id) }) {
  /** 'tecken' eller 'ord' (golvdatorn, om rullningen hackar) */
  let lage = 'tecken';

  /**
   * Dela upp textens bokstäver i egna spans (en gång per element). Orden (.ord) behåller sitt span, så att nosen
   * och markeringen fungerar. Mellanslag räknas som tecken men döljs aldrig.
   * @param {HTMLElement} el @returns {{ tecken: HTMLElement[], ord: HTMLElement[], ordFor: number[] }}
   */
  function dela(el) {
    const doc = el.ownerDocument;
    const gang = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    /** @type {Text[]} */
    const noder = [];
    for (let n = gang.nextNode(); n; n = gang.nextNode()) if (!n.parentElement?.closest('[aria-hidden="true"], .tk')) noder.push(/** @type {Text} */ (n));
    for (const n of noder) {
      const f = doc.createDocumentFragment();
      for (const c of n.nodeValue || '') {
        if (/\s/.test(c)) { f.appendChild(doc.createTextNode(c)); continue; }
        const s = doc.createElement('span'); s.className = 'tk'; s.textContent = c; f.appendChild(s);
      }
      n.replaceWith(f);
    }
    const tecken = /** @type {HTMLElement[]} */ ([...el.querySelectorAll('.tk')]);
    const ord = /** @type {HTMLElement[]} */ ([...el.querySelectorAll('.ord')]);
    // vilket ord varje tecken hör till: skiljetecken hör till ordet före (det första om de står först)
    let senaste = 0;
    const ordFor = tecken.map((t) => { const o = t.closest('.ord'); if (o) senaste = Math.max(0, ord.indexOf(/** @type {HTMLElement} */ (o))); return senaste; });
    return { tecken, ord, ordFor };
  }

  /**
   * Rulla fram texten i el. Löser sig (klar) när rösten är klar, eller när rullningen är klar om ingen röst talar.
   * @param {HTMLElement} el @param {Val} val
   * @returns {{ klar: Promise<void>, rullar: () => boolean, visaAllt: () => void, stopp: () => void }}
   */
  function starta(el, val) {
    const { tecken, ord, ordFor } = dela(el);
    const n = tecken.length;
    let visade = 0, ordVisat = -1, slut = false, ramId = 0;
    const t0 = nu();
    let forra = t0, langsta = 0, glapp = 0;
    const visa = (/** @type {number} */ till) => {
      for (let i = visade; i < till; i++) tecken[i].classList.remove('dold');
      if (till > visade && val.pip) { const w = ordFor[till - 1]; if (w > ordVisat) ljud.pip(val.roll); }
      if (till > visade) ordVisat = Math.max(ordVisat, ordFor[till - 1]);
      visade = Math.max(visade, till);
    };
    const visaAllt = () => {
      if (slut) return;
      slut = true; slutaRam(ramId); visa(n);
      el.classList.remove('rullar');
    };
    if (val.direkt || !n) { visade = n; slut = true; }
    else {
      el.classList.add('rullar');
      tecken.forEach((t) => t.classList.add('dold'));
      const steg = () => {
        if (slut) return;
        const t = nu();
        const g = t - forra; forra = t;
        langsta = Math.max(langsta, g); if (g > 80) glapp++;
        let till = Math.min(n, Math.floor(((t - t0) * RULLNING.teckenPerSek) / 1000) + 1);
        // ett ord i taget: ordet syns helt när dess första tecken är på tur
        if (lage === 'ord') { const w = ordFor[Math.max(0, till - 1)]; while (till < n && ordFor[till] === w) till++; }
        visa(till);
        if (visade >= n) {
          slut = true; el.classList.remove('rullar');
          logg.handelse('rullning', `${n} tecken på ${Math.round(t - t0)} ms (${lage}), längsta glapp ${Math.round(langsta)} ms`);
          if (glapp >= 3 && lage === 'tecken') { lage = 'ord'; logg.handelse('rullning', 'hackar: ett ord i taget resten av passet'); }
          return;
        }
        ramId = ram(steg);
      };
      ramId = ram(steg);
    }
    // markeringen följer rösten från första ordet: röstens ordsignal, eller uppskattad takt tills den kommer
    const starter = ordStarter(val.text);
    const skala = starter.length ? ord.length / starter.length : 1;
    /** @type {number[]} */
    let klockor = [];
    let signal = false;
    const markera = (/** @type {number} */ i) => {
      if (!val.markera) return;
      const k = Math.min(ord.length - 1, Math.floor(i * skala));
      ord.forEach((o, j) => o.classList.toggle('lases', j === k));
    };
    const avmarkera = () => { klockor.forEach((k) => clearTimeout(k)); klockor = []; ord.forEach((o) => o.classList.remove('lases')); };
    /** @type {Promise<void>} */
    let klar;
    if (val.tala) {
      if (val.markera) ordTider(val.text).forEach((t, i) => klockor.push(window.setTimeout(() => { if (!signal) markera(i); }, t)));
      klar = val.tala((tecknet) => { signal = true; klockor.forEach((k) => clearTimeout(k)); klockor = []; markera(Math.max(0, ordVid(starter, tecknet))); })
        .then(() => { avmarkera(); }, () => { avmarkera(); });
    } else {
      klar = new Promise((r) => window.setTimeout(r, slut ? 0 : teckenTid(n, lage === 'ord')));
    }
    return { klar, rullar: () => !slut, visaAllt, stopp: () => { visaAllt(); avmarkera(); } };
  }

  return { starta, get lage() { return lage; } };
}
