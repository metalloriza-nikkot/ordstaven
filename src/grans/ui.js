// @ts-check
// Gränssnittets byggstenar i DOM: läsplattan, regirutan, HUD (bär, nos, lappar, radio), ljudningsremsan,
// helskärmar (start, passets slut) och etiketter över rummets objekt. All läsbar text här, i Andika.
import { forSkarm, versaler } from '../karna/text.js';
import { ljudningsdelar, maxtidMs } from '../karna/ljudning.js';

/** @param {string} s */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c);

/**
 * @param {{ ordlistor: any, rost: ReturnType<typeof import('./rost.js').skapaRost>, ljud: ReturnType<typeof import('./ljud.js').skapaLjud>,
 *           logg: { handelse(t: string, m: string, d?: any): void } }} opt
 */
export function skapaUi({ ordlistor, rost, ljud, logg }) {
  const ui = document.createElement('div');
  ui.id = 'ui';
  ui.innerHTML = `
    <div id="etiketter"></div>
    <div id="hud">
      <button type="button" id="hud-bar" class="hud-knapp" hidden aria-label="Bär"><span class="ikon">🫐</span><span class="tal">0</span></button>
      <button type="button" id="hud-nos" class="hud-knapp" hidden aria-label="Nosa på ett ord"><span class="ikon">👃</span></button>
      <button type="button" id="hud-lapp" class="hud-knapp" hidden aria-label="Lappen"><span class="ikon">📜</span></button>
      <span id="hud-radio" class="hud-knapp" hidden><span class="ikon">📻</span></span>
    </div>
    <button type="button" id="hud-meny" aria-label="Meny för vuxna (håll inne)">⚙</button>
    <div id="regi" hidden></div>
    <div id="narbild" hidden><span>🗺️</span></div>
    <div id="plattan" hidden></div>
    <div id="remsa" hidden></div>
    <div id="fest" hidden></div>
    <div id="skarm" hidden></div>`;
  document.body.appendChild(ui);
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (ui.querySelector(s));
  const plattan = $('#plattan'), regi = $('#regi'), remsa = $('#remsa'), skarm = $('#skarm'), fest = $('#fest');

  /** Ord i ordlistorna, för helord-flaggan. */
  const ordInfo = new Map(ordlistor.ord.map((/** @type {any} */ o) => [versaler(o.ord), o]));
  const arHelord = (/** @type {string} */ o) => { const i = ordInfo.get(versaler(o)); return !!i && (i.flaggor.includes('helord') || i.lista >= 5); };

  /**
   * Textrader som HTML med varje ord i en egen span (för nosen). Raderna bryts aldrig inom en rad i listan.
   * @param {string | string[]} text @param {Record<string, string>} varden @param {string} [klass]
   */
  function rader(text, varden, klass = 'rad') {
    const bryts = !Array.isArray(text);
    return forSkarm(text, { varden })
      .map((r) => `<span class="${klass}${bryts ? ' bryts' : ''}">${r.split(/(\s+)/).map((d) => (/\S/.test(d) ? ordSpan(d) : d)).join('')}</span>`)
      .join('');
  }
  /** @param {string} d ett ord med eventuella skiljetecken */
  function ordSpan(d) {
    const m = /^([^A-Za-zÅÄÖåäöÉé]*)([A-Za-zÅÄÖåäöÉé]+)([^A-Za-zÅÄÖåäöÉé]*)$/.exec(d);
    if (!m) return esc(d);
    return `${esc(m[1])}<span class="ord" data-ord="${esc(m[2])}">${esc(m[2])}</span>${esc(m[3])}`;
  }

  // ---------------------------------------------------------------- nosen och ljudningen
  const nos = { tillaten: false, aktiv: false, /** @type {() => boolean} */ betala: () => true, /** @type {() => void} */ anvand: () => {} };
  const nosKnapp = $('#hud-nos');
  function sattNos(/** @type {boolean} */ tillaten, opt = /** @type {{ betala?: () => boolean, anvand?: () => void }} */ ({})) {
    nos.tillaten = tillaten; nos.aktiv = false;
    nos.betala = opt.betala || (() => true); nos.anvand = opt.anvand || (() => {});
    nosKnapp.classList.toggle('av', !tillaten); ui.classList.remove('nosar');
  }
  function vaxlaNos() {
    if (!nos.tillaten || nosKnapp.hidden) return;
    nos.aktiv = !nos.aktiv; ui.classList.toggle('nosar', nos.aktiv);
    ljud.spela('klick');
  }
  nosKnapp.addEventListener('click', vaxlaNos);
  /** Tab-tangenten (handlingen hjalp) växlar nosen. @param {any} h */
  const handling = (h) => { if (h.typ === 'hjalp') vaxlaNos(); };
  ui.addEventListener('click', (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const o = t.closest && /** @type {HTMLElement | null} */ (t.closest('.ord'));
    if (!o || !nos.aktiv) return;
    e.stopPropagation();
    nos.aktiv = false; ui.classList.remove('nosar');
    if (!nos.betala()) return;
    nos.anvand();
    ljuda(o.dataset.ord || '');
  }, true);

  /** Ljuda ett ord med remsan där aktuell bokstav lyser. @param {string} ord */
  async function ljuda(ord) {
    const visat = versaler(ord);
    const delar = ljudningsdelar(visat, { helord: arHelord(visat) });
    remsa.innerHTML = [...visat].map((b, i) => `<span class="remsa-b" data-i="${i}">${esc(b)}</span>`).join('');
    remsa.hidden = false;
    logg.handelse('nos', visat, { helord: arHelord(visat) });
    const vakt = setTimeout(() => { remsa.hidden = true; }, maxtidMs(delar));
    await rost.sekvens(delar.map((d) => d.text), (i) => {
      const lyser = delar[i].lyser;
      remsa.querySelectorAll('.remsa-b').forEach((el, j) => el.classList.toggle('lyser', lyser === 'alla' || lyser === j));
    });
    clearTimeout(vakt);
    setTimeout(() => { remsa.hidden = true; }, 500);
  }

  // ---------------------------------------------------------------- plattan och regi
  /** @param {string} html @param {string} [klass] */
  function visaPlatta(html, klass = '') {
    plattan.className = klass; plattan.innerHTML = html; plattan.hidden = false;
    ui.classList.add('platta-oppen');
    return plattan;
  }
  function doljPlatta() { plattan.hidden = true; plattan.innerHTML = ''; ui.classList.remove('platta-oppen'); sattNos(false); }

  /** Vänta på ett tryck på ett element, eller Mellanslag/Enter. @param {HTMLElement} el @param {(h: (cb: (h: any) => void) => () => void)} lyssnaHandling */
  function vantaFortsatt(el, lyssnaHandling) {
    return new Promise((klar) => {
      let sluta = () => {};
      const gor = () => { el.removeEventListener('click', gor); sluta(); ljud.spela('klick'); klar(undefined); };
      el.addEventListener('click', gor);
      sluta = lyssnaHandling((h) => { if (h.typ === 'interagera') gor(); });
    });
  }

  /** Regi för den vuxne (mellanscener). Visas en stund. @param {string} text @param {number} ms */
  function visaRegi(text, ms) {
    regi.textContent = text; regi.hidden = false;
    return new Promise((r) => setTimeout(() => { r(undefined); }, ms));
  }
  function doljRegi() { regi.hidden = true; }

  /** Kort fest: ikon i mitten. @param {string} ikon @param {number} ms */
  function visaFest(ikon, ms = 900) {
    fest.textContent = ikon; fest.hidden = false; fest.classList.remove('pop'); void fest.offsetWidth; fest.classList.add('pop');
    return new Promise((r) => setTimeout(() => { fest.hidden = true; r(undefined); }, ms));
  }

  // ---------------------------------------------------------------- HUD
  /** @param {{ bar?: number, ui?: Record<string, boolean>, lappar?: string[] }} av */
  function uppdateraHud(av) {
    const b = $('#hud-bar'); b.hidden = !(av.ui && av.ui.barraknaren);
    /** @type {HTMLElement} */ (b.querySelector('.tal')).textContent = String(av.bar ?? 0);
    nosKnapp.hidden = !(av.ui && av.ui.nosknappen);
    $('#hud-radio').hidden = !(av.ui && av.ui.radioramen);
    $('#hud-lapp').hidden = !(av.lappar && av.lappar.length);
  }
  /** @param {string} id */
  function pulsera(id) { const el = $(id); el.classList.remove('puls'); void el.offsetWidth; el.classList.add('puls'); }

  // ---------------------------------------------------------------- helskärmar
  /** @param {string} html */
  function visaSkarm(html) { skarm.innerHTML = html; skarm.hidden = false; return skarm; }
  function doljSkarm() { skarm.hidden = true; skarm.innerHTML = ''; }

  /** Etiketter över rummets objekt (gråbox, för den vuxne). @param {{ id: string, x: number, y: number, b: number }[]} objekt @param {(x: number, y: number) => { x: number, y: number }} tillSkarm @param {boolean} visa */
  function etiketter(objekt, tillSkarm, visa) {
    const e = $('#etiketter');
    e.hidden = !visa;
    e.innerHTML = objekt.map((o) => { const p = tillSkarm(o.x + o.b / 2, o.y); return `<span class="etikett-obj" style="left:${p.x}px;top:${p.y}px">${esc(o.id.replace(/_/g, ' '))}</span>`; }).join('');
  }

  return {
    ui, $, plattan, rader, esc, visaPlatta, doljPlatta, vantaFortsatt, visaRegi, doljRegi, visaFest,
    uppdateraHud, pulsera, visaSkarm, doljSkarm, etiketter, sattNos, vaxlaNos, ljuda, arHelord,
    handling,
    get nosAktiv() { return nos.aktiv; },
  };
}
