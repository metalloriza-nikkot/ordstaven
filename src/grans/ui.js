// @ts-check
// Gränssnittets byggstenar i DOM: läsplattan, regirutan, HUD (bär, nos, lappar, radio), ljudningsremsan,
// helskärmar (start, passets slut) och etiketter över rummets objekt. All läsbar text här, i Lexend.
import { forSkarm, versaler } from '../karna/text.js';
import { ljudningsdelar, maxtidMs } from '../karna/ljudning.js';
import { ikon, laddaSkyltTra, IKON_FOR, uiBild } from './ikoner.js';

/** Hur länge ett ljudord står i världen (granskningen A 24), samma som animationen i stil.css. */
export const LJUDORD_MS = 2000;

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
    <div id="tona"></div>
    <div id="hud">
      <!-- lappknappen överst bland hans knappar (10d, 47.2): uppdragslappen, och Farfars lapp i ett pussel -->
      <button type="button" id="hud-lapp" class="hud-knapp" hidden aria-label="Lappen">${ikon('lapp', 'hud')}</button>
      <button type="button" id="hud-radio" class="hud-knapp" hidden aria-label="Radion">${ikon('radio', 'hud')}</button>
      <button type="button" id="hud-nos" class="hud-knapp" hidden aria-label="Nosa på ett ord">${ikon('nos', 'hud')}${ikon('nos_aktiv', 'hud').replace('ikon-px', 'ikon-px aktiv')}</button>
      <button type="button" id="hud-bar" class="hud-knapp" hidden aria-label="Bär">${ikon('bar', 'hud')}<span class="tal">0</span></button>
    </div>
    <button type="button" id="hud-paus" class="hud-knapp" hidden aria-label="Paus">${ikon('paus', 'hud')}</button>
    <button type="button" id="hud-meny" aria-label="INSTÄLLNINGAR (håll inne)">⚙</button>
    <div id="tanke" hidden></div>
    <div id="varldslager">
      <div id="etiketter"></div>
      <div id="rumsskyltar"></div>
      <div id="skyltar"></div>
      <div id="rop" hidden></div>
      <div id="ordskylt" hidden></div>
      <div id="handknapp" hidden><button type="button" aria-label="Använd">${ikon('hand')}</button></div>
    </div>
    <div id="styrhjalp" hidden></div>
    <div id="regi" hidden></div>
    <div id="narbild" hidden>${ikon('karta', 'stor')}</div>
    <div id="plattan" hidden></div>
    <div id="remsa" hidden></div>
    <div id="fest" hidden></div>
    <div id="skarm" hidden></div>
    <div id="iris" hidden></div>
    <div id="pausmeny" hidden></div>
    <div id="vuxenmeny" hidden></div>`;
  document.body.appendChild(ui);
  laddaSkyltTra();
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (ui.querySelector(s));
  const plattan = $('#plattan'), regi = $('#regi'), remsa = $('#remsa'), skarm = $('#skarm'), fest = $('#fest');

  // ---------------------------------------------------------------- kameran (beslut 14)
  // Allt som sitter på något i världen (skyltar, händer, bubblor, etiketter) placeras via kameran. När kameran rör sig
  // flyttas det med en förskjutning (CSS translate) i stället för att byggas om: varje element minns kamerans läge när
  // det placerades. När kameran har stannat placeras skyltarna om på riktigt (vidKamera). I ett område som är större
  // än skärmen klipps världslagret vid rummets kanter, så att skyltar för föremål utanför bilden inte syns.
  const varldslager = $('#varldslager');
  let kam = { x: 0, y: 0 }, kamSkala = 1;
  /** @type {Map<HTMLElement, { x: number, y: number }>} */
  const ankrade = new Map();
  /** Elementet placeras nu, med kamerans läge nu. @param {HTMLElement} e */
  const ankra = (e) => { ankrade.set(e, { ...kam }); e.style.translate = ''; };
  const flyttaAnkrade = () => {
    for (const [e, k0] of ankrade) {
      const dx = (k0.x - kam.x) * kamSkala, dy = (k0.y - kam.y) * kamSkala;
      e.style.translate = dx || dy ? `${dx}px ${dy}px` : '';
    }
  };
  /** @type {Set<() => void>} */
  const kameraLyssnare = new Set();
  /**
   * Kameran har flyttat sig. @param {{ x: number, y: number }} k @param {number} cssSkala
   * @param {boolean} stor området är större än skärmen (då klipps världslagret)
   */
  function kamera(k, cssSkala, stor) {
    kam = { x: k.x, y: k.y }; kamSkala = cssSkala;
    varldslager.classList.toggle('klipp', !!stor);
    flyttaAnkrade();
    for (const f of kameraLyssnare) f();
  }

  /** Ord i ordlistorna, för helord-flaggan. */
  const ordInfo = new Map(ordlistor.ord.map((/** @type {any} */ o) => [versaler(o.ord), o]));
  const arHelord = (/** @type {string} */ o) => { const i = ordInfo.get(versaler(o)); return !!i && (i.flaggor.includes('helord') || i.lista >= 5); };

  /**
   * Textrader som HTML med varje ord i en egen span (för nosen). Raderna bryts aldrig inom en rad i listan.
   * @param {string | string[]} text @param {Record<string, string>} varden @param {string} [klass]
   * @param {'versaler' | 'vanlig'} [skrift] vanlig = som texten står (gemener i bubblan, 2.47)
   */
  function rader(text, varden, klass = 'rad', skrift = /** @type {'versaler' | 'vanlig'} */ ('versaler')) {
    const bryts = !Array.isArray(text);
    return forSkarm(text, { varden, skrift })
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
  /**
   * Ljudning bokstav för bokstav med remsan. Av tills fas 4: datorrösten ljudar för dåligt för att vara hjälp
   * (grind A), så nosen läser hela ordet. Koden står kvar och slås på med inspelade ljud.
   */
  const LJUDNING_BOKSTAVSVIS = false;
  const nos = {
    tillaten: false, aktiv: false, /** @type {() => boolean} */ betala: () => true, /** @type {() => void} */ anvand: () => {},
    /** @type {HTMLElement | null} ordet som Tab har markerat */ markerad: null,
    /** @type {HTMLElement | null} ordet nosen läste senast: Tab fortsätter därifrån */ senast: null,
  };
  const nosKnapp = $('#hud-nos');
  /** @type {Set<(vad: 'tand' | 'ord', ord?: string) => void>} spelet får veta när nosen tänds och vilket ord den läser */
  const nosLyssnare = new Set();
  const nosHande = (/** @type {'tand' | 'ord'} */ vad, /** @type {string} */ ord = '') => { for (const f of nosLyssnare) { try { f(vad, ord); } catch (e) { /* får inte stoppa nosen */ } } };
  /** @param {HTMLElement | null} e */
  function markeraOrd(e) {
    nos.markerad?.classList.remove('markerad');
    nos.markerad = e;
    e?.classList.add('markerad');
  }
  function slackNos() { nos.aktiv = false; ui.classList.remove('nosar'); markeraOrd(null); }
  function sattNos(/** @type {boolean} */ tillaten, opt = /** @type {{ betala?: () => boolean, anvand?: () => void }} */ ({})) {
    nos.tillaten = tillaten; slackNos(); nos.senast = null;
    nos.betala = opt.betala || (() => true); nos.anvand = opt.anvand || (() => {});
    nosKnapp.classList.toggle('av', !tillaten);
  }
  /** Tänd nosen utan klick (nos_demo: den är redan tänd när lappen öppnas). */
  function tandNos() { if (!nos.tillaten) return; nos.aktiv = true; ui.classList.add('nosar'); }
  /** Orden nosen kan läsa just nu, i ordning: läsplattan, tankebubblan, lappen vid föremålet, skyltarna. */
  const synligaOrd = () => /** @type {HTMLElement[]} */ ([...ui.querySelectorAll('#plattan .ord, #tanke .ord, #ordskylt .ord, #skyltar .ord, #rumsskyltar .ord')])
    .filter((e) => e.getClientRects().length > 0 && !e.closest('[hidden]') && !e.closest('.provad'));
  /** Tab: markera nästa ord (det första när nosen just tänts). @returns {boolean} om det fanns något ord */
  function markeraNasta() {
    const lista = synligaOrd();
    if (!lista.length) { markeraOrd(null); return false; }
    const fran = nos.markerad ?? nos.senast;
    const i = fran ? lista.indexOf(fran) : -1;
    markeraOrd(lista[(i + 1) % lista.length]);
    return true;
  }
  /** Nosen läser ett ord (tryck på ordet, eller Mellanslag/Enter på det markerade). @param {HTMLElement} o */
  function nosaPa(o) {
    slackNos();
    nos.senast = o;
    if (!nos.betala()) return;
    nos.anvand();
    const ord = o.dataset.ord || '';
    nosHande('ord', ord);
    ljuda(ord);
  }
  function vaxlaNos() {
    if (nosKnapp.hidden) return;
    // pågår en ljudning avbryter nosen den (om man tryckte av misstag)
    if (ljudning.pagar) { avbrytLjudning(); return; }
    if (!nos.tillaten) {
      // inget att nosa på här: ungen skakar på nosen
      nosKnapp.classList.remove('nej'); void nosKnapp.offsetWidth; nosKnapp.classList.add('nej');
      ljud.spela('klick');
      return;
    }
    if (nos.aktiv) slackNos(); else { nos.aktiv = true; ui.classList.add('nosar'); nosHande('tand'); }
    ljud.spela('klick');
  }
  nosKnapp.addEventListener('click', vaxlaNos);
  /**
   * Nosen på tangentbordet (beslut 10). Tab tänder nosen och markerar första ordet, Tab igen går till nästa ord,
   * Mellanslag eller Enter läser det markerade ordet, och Escape släcker. Medan nosen är tänd går Mellanslag,
   * Enter och Escape bara till nosen (inte till ▶ eller rummet). På iPad trycker man på ordet.
   * @param {any} h @returns {boolean} om handlingen togs om hand här
   */
  function fanga(h) {
    if (h.typ === 'hjalp') {
      // Tab medan ett ord läses: avbryt och gå vidare till nästa ord
      if (ljudning.pagar) { avbrytLjudning(); if (!nos.tillaten) return true; }
      if (!nos.aktiv) { vaxlaNos(); if (nos.aktiv) markeraNasta(); return true; }
      if (!markeraNasta()) { slackNos(); ljud.spela('klick'); }
      return true;
    }
    if (!nos.aktiv) {
      if (h.typ === 'stang' && ljudning.pagar) { avbrytLjudning(); return true; }
      return false;
    }
    if (h.typ === 'interagera') { if (nos.markerad) nosaPa(nos.markerad); return true; }
    if (h.typ === 'stang') { slackNos(); ljud.spela('klick'); return true; }
    return false;
  }
  ui.addEventListener('click', (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const o = t.closest && /** @type {HTMLElement | null} */ (t.closest('.ord'));
    if (!o || !nos.aktiv) return;
    e.stopPropagation();
    nosaPa(o);
  }, true);

  // Ljudningen kan avbrytas: tryck på remsan, på nosen eller Escape.
  const ljudning = { pagar: false, /** @type {any} */ vakt: 0 };
  function avbrytLjudning() {
    if (!ljudning.pagar) return;
    ljudning.pagar = false; clearTimeout(ljudning.vakt);
    rost.tyst(); remsa.hidden = true;
    logg.handelse('nos', 'avbruten');
  }
  remsa.addEventListener('click', (e) => { e.stopPropagation(); avbrytLjudning(); });

  /** Ljuda ett ord med remsan där aktuell bokstav lyser (fas 4). Till dess läser nosen hela ordet direkt. @param {string} ord */
  async function ljuda(ord) {
    const visat = versaler(ord);
    const helord = !LJUDNING_BOKSTAVSVIS || arHelord(visat);
    const delar = ljudningsdelar(visat, { helord });
    remsa.innerHTML = [...visat].map((b, i) => `<span class="remsa-b" data-i="${i}">${esc(b)}</span>`).join('');
    remsa.hidden = !LJUDNING_BOKSTAVSVIS;
    logg.handelse('nos', visat, { helord });
    ljudning.pagar = true;
    ljudning.vakt = setTimeout(() => { ljudning.pagar = false; remsa.hidden = true; }, maxtidMs(delar));
    const hur = await rost.sekvens(delar.map((d) => d.text), (i) => {
      const lyser = delar[i].lyser;
      remsa.querySelectorAll('.remsa-b').forEach((el, j) => el.classList.toggle('lyser', lyser === 'alla' || lyser === j));
    });
    if (!ljudning.pagar) return; // avbruten
    ljudning.pagar = false; clearTimeout(ljudning.vakt);
    if (hur === 'avbruten') { remsa.hidden = true; return; }
    setTimeout(() => { if (!ljudning.pagar) remsa.hidden = true; }, 500);
  }

  // ---------------------------------------------------------------- plattan och regi
  /** @param {string} html @param {string} [klass] */
  /**
   * Knappar och tecken som förut var emoji eller tecken (▶ ◀ ✓ 🔊 📜 ⭐ …) får Stils ikoner (beslut 31.4). Gäller
   * element utan egna barn vars hela text är ett sådant tecken. @param {HTMLElement} rot
   */
  function ikonKnappar(rot) {
    for (const e of /** @type {HTMLElement[]} */ ([...rot.querySelectorAll('button, span, b')])) {
      if (e.children.length) continue;
      const namn = IKON_FOR[(e.textContent || '').trim()];
      const html = namn ? ikon(namn) : '';
      if (html) e.innerHTML = html;
    }
    return rot;
  }
  /** Papperet prasslar (10c `papper`) när läsplattan öppnas och när en lapp eller boken stängs. @type {(vad: 'oppnas' | 'stangs') => void} */
  let papper = () => {};
  /** Är plattan papper? Repliken (pratrutan) och ordet i luften är det inte. @param {string} klass */
  const arPapper = (klass) => !/^(replik|formel-luft)\b/.test(klass);
  function visaPlatta(html, klass = '') {
    const oppnas = plattan.hidden;
    plattan.className = klass; plattan.innerHTML = html; plattan.hidden = false; ikonKnappar(plattan);
    ui.classList.add('platta-oppen');
    if (oppnas && arPapper(klass)) papper('oppnas');
    return plattan;
  }
  function doljPlatta() {
    if (!plattan.hidden && /\b(lapp-vy|bok)\b/.test(plattan.className)) papper('stangs');
    plattan.hidden = true; plattan.innerHTML = ''; ui.classList.remove('platta-oppen'); sattNos(false);
  }
  /** @param {(vad: 'oppnas' | 'stangs') => void} fn */
  const vidPapper = (fn) => { papper = fn; };

  /**
   * Vänta på ett tryck på ett element, eller Mellanslag/Enter. @param {HTMLElement} el
   * @param {(h: (cb: (h: any) => void) => () => void)} lyssnaHandling @param {() => boolean} [forst]
   */
  function vantaFortsatt(el, lyssnaHandling, forst = () => false) {
    return new Promise((klar) => {
      let sluta = () => {};
      // forst: ett tryck som används till något annat först (texten rullar: trycket visar allt), och väntan fortsätter
      const gor = () => { if (forst()) return; el.removeEventListener('click', gor); sluta(); ljud.spela('klick'); klar(undefined); };
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

  /**
   * Kort fest: ikon i mitten. En emoji visas som text, en bild ur `bilder.html` som HTML (annars syns koden).
   * @param {string} vad emoji, ikon eller HTML @param {number} ms @param {boolean} [html] HTML från bildlistan
   */
  function visaFest(vad, ms = 900, html = false) {
    // en emoji som har en ikon (bären, glittret, stjärnan) visas som Stils ikon (beslut 31.4)
    const ik = IKON_FOR[vad.trim()];
    if (ik && ikon(ik, 'stor')) fest.innerHTML = ikon(ik, 'stor');
    else if (html || vad.trimStart().startsWith('<')) fest.innerHTML = vad; else fest.textContent = vad; fest.hidden = false; fest.classList.remove('pop'); void fest.offsetWidth; fest.classList.add('pop');
    return new Promise((r) => setTimeout(() => { fest.hidden = true; r(undefined); }, ms));
  }

  // ---------------------------------------------------------------- HUD
  /** @param {{ bar?: number, ui?: Record<string, boolean>, lappar?: string[] }} av */
  function uppdateraHud(av) {
    const b = $('#hud-bar'); b.hidden = !(av.ui && av.ui.barraknaren);
    /** @type {HTMLElement} */ (b.querySelector('.tal')).textContent = String(av.bar ?? 0);
    nosKnapp.hidden = !(av.ui && av.ui.nosknappen);
    $('#hud-radio').hidden = !(av.ui && av.ui.radioramen);
    lapparna = !!(av.lappar && av.lappar.length);
    $('#hud-lapp').hidden = !(lapparna || uppdragslapp);
  }
  // lappknappen syns när han har Farfars lapp (dinomaten) eller när ett uppdrag pågår (uppdragslappen, 47.2)
  let lapparna = false, uppdragslapp = false;
  /** @param {boolean} finns ett uppdrag pågår */
  function sattLappknapp(finns) { uppdragslapp = finns; $('#hud-lapp').hidden = !(lapparna || uppdragslapp); }
  /** En knapp glimtar en gång i vitt (lappknappen efter stämpeln, 10d). @param {string} id */
  function glimta(id) { const el = $(id); el.classList.remove('glimt'); void el.offsetWidth; el.classList.add('glimt'); }
  /** @param {string} id */
  function pulsera(id) { const el = $(id); el.classList.remove('puls'); void el.offsetWidth; el.classList.add('puls'); }

  // ---------------------------------------------------------------- helskärmar
  /** @param {string} html */
  function visaSkarm(html) { skarm.innerHTML = html; skarm.hidden = false; ikonKnappar(skarm); return skarm; }
  function doljSkarm() { skarm.hidden = true; skarm.innerHTML = ''; }
  /** Menyn för vuxna ligger över allt annat, även startskärmen, och rör inte spelets skärmar. @param {string} html */
  function visaMeny(html) { const m = $('#vuxenmeny'); m.innerHTML = html; m.hidden = false; return m; }
  function doljMeny() { const m = $('#vuxenmeny'); m.hidden = true; m.innerHTML = ''; }
  /** Spelarens pausmeny (kartan och hjälteboken). @param {string} html */
  function visaPausmeny(html) { const m = $('#pausmeny'); m.innerHTML = html; m.hidden = false; ikonKnappar(m); return m; }
  function doljPausmeny() { const m = $('#pausmeny'); m.hidden = true; m.innerHTML = ''; }

  /** Etiketter över rummets objekt (gråbox, för den vuxne). @param {{ id: string, x: number, y: number, b: number }[]} objekt @param {(x: number, y: number) => { x: number, y: number }} tillSkarm @param {boolean} visa */
  function etiketter(objekt, tillSkarm, visa) {
    const e = $('#etiketter');
    e.hidden = !visa; ankra(e);
    e.innerHTML = objekt.map((o) => { const p = tillSkarm(o.x + o.b / 2, o.y); return `<span class="etikett-obj" style="left:${p.x}px;top:${p.y}px">${esc(o.id.replace(/_/g, ' '))}</span>`; }).join('');
  }

  // ---------------------------------------------------------------- läs i rummet
  /** Frågan (tankebubblan) uppe i rummet medan spelaren letar. null döljer. @param {string | null} html */
  function visaTanke(html) { const t = $('#tanke'); t.hidden = !html; t.innerHTML = html || ''; }
  /**
   * Molnet får aldrig täcka det han ska välja (T6: hallens dörrar i bakväggen). Det står nere till vänster (T4c,
   * stilguiden §3), och täcker det ett alternativ, en skylt eller en knapp flyttar det till första lediga plats:
   * nere i mitten, uppe till vänster, uppe i mitten eller uppe till höger. @param {{ left: number, top: number, right: number, bottom: number }[]} hinder
   * skärmrutor för alternativen @param {{ vanster: number, topp: number, bredd: number, hojd: number }} ram rummet på skärmen
   */
  function placeraTanke(hinder, ram) {
    const t = $('#tanke');
    const forra = t.style.left ? { x: parseFloat(t.style.left), y: parseFloat(t.style.top) } : null;
    t.style.left = ''; t.style.top = ''; t.style.transform = '';
    // texten under spelytan (36.2): molnet står i remsan och täcker aldrig världen
    if (t.hidden || document.documentElement.classList.contains('text-under')) return;
    const alla = [...hinder, ...[...ui.querySelectorAll('#skyltar .skylt, #hud .hud-knapp, #hud-paus, #hud-meny')].filter((e) => !/** @type {HTMLElement} */ (e).hidden).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0)];
    const r0 = t.getBoundingClientRect();
    const b = r0.width, h = r0.height, luft = 10;
    const krockar = (/** @type {number} */ x, /** @type {number} */ y) => alla.some((q) => x < q.right + 4 && q.left - 4 < x + b && y < q.bottom + 4 && q.top - 4 < y + h);
    const mitt = ram.vanster + (ram.bredd - b) / 2, hoger = ram.vanster + ram.bredd - b - luft, vanster = ram.vanster + luft;
    const uppe = ram.topp + luft, nere = ram.topp + ram.hojd - h - luft;
    // molnet hör hemma nere till vänster (stilguiden §3); nere till höger är hans (bären, nosen), och uppe är världen
    // står molnet redan på en plats som är fri står det kvar (det hoppar inte fram och tillbaka)
    const platser = [[vanster, nere], [mitt, nere], [vanster, uppe], [mitt, uppe], [hoger, uppe]];
    if (forra && platser.some(([x, y]) => Math.abs(x - forra.x) < 2 && Math.abs(y - forra.y) < 2)) platser.unshift([forra.x, forra.y]);
    for (const [x, y] of platser) {
      if (!krockar(x, y)) { t.style.transform = 'none'; t.style.left = Math.round(x) + 'px'; t.style.top = Math.round(y) + 'px'; return; }
    }
    t.style.left = ''; t.style.top = ''; t.style.transform = '';
  }
  /**
   * Ryms molnet och all dess text (79.2)? Molnet är helt inom fönstret, och varje rad, bild och knapp i det står
   * inom molnet. Text får aldrig kapas eller gå utanför sin ruta. @returns {boolean}
   */
  function tankeRyms() {
    const t = $('#tanke');
    if (t.hidden) return true;
    const r = t.getBoundingClientRect(), luft = 1;
    if (r.left < -luft || r.top < -luft || r.right > window.innerWidth + luft || r.bottom > window.innerHeight + luft) return false;
    return [...t.querySelectorAll('.rad, .instruktion, .moln-text, .moln-bild, .moln-hogtalare, .tanke-lapp')].every((e) => {
      const q = e.getBoundingClientRect();
      return q.width === 0 || (q.left >= r.left - luft && q.right <= r.right + luft && q.top >= r.top - luft && q.bottom <= r.bottom + luft);
    });
  }
  /**
   * Molnet med frågan och lappen (79.2): ryms de inte bredvid varandra står frågan ovanför lappen. Säger om det ryms
   * då; om inte öppnar spelet lappen på läsplattan. Texten krymper aldrig. @returns {boolean}
   */
  function passaTanke() {
    const t = $('#tanke');
    t.classList.remove('staplad');
    if (tankeRyms()) return true;
    t.classList.add('staplad');
    return tankeRyms();
  }
  function pulseraTanke() { const t = $('#tanke'); t.classList.remove('puls'); void t.offsetWidth; t.classList.add('puls'); }
  /**
   * @typedef {{ lage?: 'over' | 'pa' | 'vanster' | 'hoger', under?: number, rumTopp: number, rumBotten?: number, ram?: { vanster: number, hoger: number }, objekt?: string }} Plats
   * Var lappen eller handen ställs i förhållande till punkten: över (vänds under om den inte ryms nära taket),
   * på (mitt på föremålet), vanster eller hoger (bredvid, vid sidoväggen). ram = rummets kanter på skärmen.
   * objekt = föremålets id (data-objekt), så att det syns vilket föremål lappen eller handen hör till.
   */
  /** Täcker elementet någon av knapparna i HUD (som syns)? @param {HTMLElement} e */
  function tackerKnapp(e) {
    const r = e.getBoundingClientRect();
    return [...ui.querySelectorAll('#hud .hud-knapp, #hud-paus')].some((k) => {
      if (/** @type {HTMLElement} */ (k).hidden) return false;
      const q = k.getBoundingClientRect();
      return q.width > 0 && r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom;
    });
  }
  /** @param {HTMLElement} e @param {{ x: number, y: number }} punkt @param {Plats} [plats] */
  function placera(e, punkt, plats) {
    const lage = plats?.lage || 'over';
    e.classList.remove('under', 'pa', 'vanster', 'hoger', 'vagg', 'vagg-bak', 'vagg-fram', 'vagg-pa');
    if (plats?.objekt) e.dataset.objekt = plats.objekt; else delete e.dataset.objekt;
    // dörrskylten på väggen (33.3): alltid på samma ställe, flyttas aldrig
    if (lage === 'vagg') {
      e.classList.add('vagg', 'vagg-' + (plats?.vagg || 'bak'));
      e.style.left = Math.round(punkt.x) + 'px'; e.style.top = Math.round(punkt.y) + 'px';
      return;
    }
    if (lage !== 'over') e.classList.add(lage);
    // ett föremål utanför bilden (ett stort område) får sin skylt där föremålet är: den klipps, och syns när kameran kommer dit
    const iBild = !plats?.ram || (punkt.x >= plats.ram.vanster && punkt.x <= plats.ram.hoger);
    e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px';
    if (lage === 'over' && plats && punkt.y - e.offsetHeight - 6 < plats.rumTopp) { e.classList.add('under'); e.style.top = (plats.under ?? punkt.y) + 'px'; }
    // en skylt eller lapp får aldrig täcka knapparna (bär, nos, radio, paus): då står den under föremålet
    if (lage === 'over' && plats && !e.classList.contains('under') && tackerKnapp(e)) { e.classList.add('under'); e.style.top = (plats.under ?? punkt.y) + 'px'; }
    // alltid helt inne i rummet
    if (plats?.ram && iBild) {
      const r = e.getBoundingClientRect();
      if (r.left < plats.ram.vanster) e.style.left = punkt.x + (plats.ram.vanster - r.left) + 'px';
      else if (r.right > plats.ram.hoger) e.style.left = punkt.x - (r.right - plats.ram.hoger) + 'px';
    }
  }

  /**
   * Ordet på föremålet hjälten står vid, som en knapp vid föremålet (se placera). null döljer.
   * @param {string | null} html @param {{ x: number, y: number }} [punkt] skärmpunkt
   * @param {() => void} [vidTryck] @param {Plats} [plats]
   */
  function ordskylt(html, punkt, vidTryck, plats) {
    const e = $('#ordskylt');
    if (!html || !punkt) { e.hidden = true; e.innerHTML = ''; return; }
    e.innerHTML = html; e.hidden = false;
    ankra(e); placera(e, punkt, plats);
    const knapp = e.querySelector('button');
    knapp?.addEventListener('click', () => { if (!nos.aktiv) vidTryck?.(); });
  }

  /**
   * Skyltarna på dörrar och stigar i ett val: de syns hela tiden, så att han kan läsa från mitten av rummet
   * och gå raka vägen. Ett tryck på en skylt går igenom. Den han står vid får handen (klassen nara).
   * @param {{ objekt: string, html: string, punkt: { x: number, y: number }, plats: Plats, vidTryck: () => void }[]} lista
   */
  function skyltar(lista, e = $('#skyltar')) {
    e.innerHTML = ''; ankra(e);
    for (const s of lista) {
      const d = document.createElement('div');
      d.className = 'skylt'; d.innerHTML = s.html;
      /** @type {any} */ (d).skylt = s;
      e.appendChild(d);
      tralangd(d);
      d.querySelector('button')?.addEventListener('click', () => { if (!nos.aktiv) s.vidTryck(); });
    }
    ordnaSkyltar();
    if (e.id === 'skyltar') skyltStor(storNu);
  }

  /**
   * Dörrskyltens bredd i hela världspixlar: ordets bredd i Lexend plus 12 (10d), så att träet inte blir suddigt.
   * @param {HTMLElement} d skyltens element
   */
  function tralangd(d) {
    const k = /** @type {HTMLElement | null} */ (d.querySelector('.vaggskylt'));
    if (!k) return;
    const vpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vpx')) || 1;
    const etikett = /** @type {HTMLElement | null} */ (k.querySelector('.kort-etikett'));
    k.style.width = '';
    const b = etikett ? etikett.getBoundingClientRect().width : k.getBoundingClientRect().width;
    k.style.width = Math.ceil(b / vpx + 12) * vpx + 'px';
  }
  /**
   * Skylten vid dörren där hjälten står växer till dubbel storlek in över dörren (33.3). Bara en åt gången, och den
   * täcker aldrig en annan skylt: grannens ord tonas bort så länge. null = ingen. @param {string | null} objekt
   */
  function skyltStor(objekt) {
    storNu = objekt;
    const alla = /** @type {HTMLElement[]} */ ([...ui.querySelectorAll('#skyltar .skylt.vagg')]);
    let stor = null;
    for (const d of alla) { const ja = !!objekt && d.dataset.objekt === objekt; d.classList.toggle('stor', ja); if (ja) stor = d; }
    // den stora skyltens ruta: dubbelt så stor, från överkanten (bakvägg) eller nederkanten (främre vägg)
    let r = null;
    if (stor) {
      const k = /** @type {HTMLElement} */ (stor.querySelector('.kort') || stor);
      const q = k.getBoundingClientRect();
      // getBoundingClientRect räknar med transformen, som kan vara på väg: räkna från den osträckta storleken
      const b = k.offsetWidth, h = k.offsetHeight, mx = q.left + q.width / 2;
      const nedat = !stor.classList.contains('vagg-fram') && !stor.classList.contains('vagg-pa');
      const topp = nedat ? q.top : q.bottom - 2 * h;
      r = { left: mx - b, right: mx + b, top: topp, bottom: topp + 2 * h };
    }
    for (const d of alla) {
      if (d === stor || !r) { d.classList.remove('tonad'); continue; }
      const q = /** @type {HTMLElement} */ (d.querySelector('.kort') || d).getBoundingClientRect();
      d.classList.toggle('tonad', q.left < r.right && r.left < q.right && q.top < r.bottom && r.top < q.bottom);
    }
  }
  /** @type {string | null} dörren vars skylt är stor just nu */
  let storNu = null;
  /** @type {{ left: number, top: number, right: number, bottom: number } | null} hjältens ruta på skärmen */
  let hjalteRuta = null;
  /** Dörrarna på skärmen: en skylt som flyttas undan för hjälten ställs aldrig på en dörr (grind A). */
  let dorrRutor = () => /** @type {{ left: number, top: number, right: number, bottom: number }[]} */ ([]);
  /** @param {() => { left: number, top: number, right: number, bottom: number }[]} f */
  function sattDorrRutor(f) { dorrRutor = f; }
  /**
   * Hjälten har flyttat sig: en skylt som täcker honom flyttas åt sidan (beslut 31.2). @param {{ left: number, top: number, right: number, bottom: number } | null} r
   */
  function skyltHjalte(r) {
    const runda = (/** @type {any} */ q) => q && [q.left, q.top, q.right, q.bottom].map(Math.round).join(',');
    if (runda(r) === runda(hjalteRuta)) return;
    hjalteRuta = r;
    if (ui.querySelector('#skyltar .skylt, #rumsskyltar .skylt')) ordnaSkyltar();
  }
  /**
   * Skyltarna (dörrarnas lappar och rummets skyltar) täcker aldrig varandra eller hjälten (beslut 31.2). Varje skylt
   * ställs först där den hör hemma (placera), och sedan skjuts de som krockar isär i sidled, inom rummets kanter.
   * Hjälten står still i det: en skylt som täcker honom flyttas åt den sida den redan står mest åt. Räcker inte
   * bredden flyttas skylten ned en rad. Läget räknas om från början varje gång, så det beror bara på var hjälten står.
   */
  function ordnaSkyltar() {
    const luft = 6;
    /** @type {{ d: HTMLElement, r: DOMRect, ram: { vanster: number, hoger: number } | null, bas: boolean }[]} */
    const alla = [];
    for (const behallare of [$('#rumsskyltar'), $('#skyltar')]) {
      if (getComputedStyle(behallare).display === 'none') continue;
      for (const d of /** @type {HTMLElement[]} */ ([...behallare.querySelectorAll(':scope > .skylt')])) {
        const s = /** @type {any} */ (d).skylt;
        if (!s) continue;
        placera(d, s.punkt, { ...s.plats, objekt: s.objekt });
        if (s.plats?.lage === 'vagg') continue; // dörrskylten sitter på väggen och flyttas aldrig
        const r = d.getBoundingClientRect();
        if (!r.width) continue;
        // utanför bilden (ett stort område): den står där föremålet är och ordnas inte
        const ram = s.plats?.ram && r.right > s.plats.ram.vanster && r.left < s.plats.ram.hoger ? s.plats.ram : null;
        alla.push({ d, r, ram, bas: false });
      }
    }
    if (alla.length === 0) return;
    const krock = (/** @type {any} */ a, /** @type {any} */ b) => a.left < b.right + luft && b.left < a.right + luft && a.top < b.bottom + luft && b.top < a.bottom + luft;
    const flytta = (/** @type {any} */ q, /** @type {number} */ dx, dy = 0) => {
      if (!dx && !dy) return;
      q.d.style.left = parseFloat(q.d.style.left) + dx + 'px';
      if (dy) q.d.style.top = parseFloat(q.d.style.top) + dy + 'px';
      q.r = q.d.getBoundingClientRect();
    };
    const iRam = (/** @type {any} */ q) => { if (!q.ram) return; if (q.r.left < q.ram.vanster) flytta(q, q.ram.vanster - q.r.left); else if (q.r.right > q.ram.hoger) flytta(q, q.ram.hoger - q.r.right); };
    const hj = hjalteRuta;
    // bas = skylten täcker hjälten där den hör hemma: då står den kvar på samma sida tills han har gått förbi
    for (const q of alla) q.bas = !!hj && krock(q.r, hj);
    // 1. en skylt som täcker hjälten flyttas: helst rakt under (eller över) honom, så att den står kvar i dörrens
    //    kolumn, annars åt sidan. Det läge väljs som ryms i rummet och krockar minst med de andra skyltarna.
    const dorrar = hj && alla.some((q) => q.bas) ? dorrRutor() : [];
    if (hj) for (const q of alla) {
      if (!q.bas) continue;
      const s = /** @type {any} */ (q.d).skylt, botten = s?.plats?.rumBotten ?? Infinity, topp = s?.plats?.rumTopp ?? -Infinity;
      const ram = q.ram ?? { vanster: -Infinity, hoger: Infinity };
      const r = q.r, mq = (r.left + r.right) / 2, mh = (hj.left + hj.right) / 2;
      const uppat = !q.d.classList.contains('under');
      /** @type {Record<string, [number, number]>} */
      const drag = {
        ned: [0, hj.bottom + luft + 1 - r.top], upp: [0, hj.top - luft - 1 - r.bottom],
        hoger: [hj.right + luft + 1 - r.left, 0], vanster: [hj.left - luft - 1 - r.right, 0],
      };
      const ordning = [uppat ? 'upp' : 'ned', ...(mq >= mh ? ['hoger', 'vanster'] : ['vanster', 'hoger']), uppat ? 'ned' : 'upp'];
      const kostnad = (/** @type {string} */ sida) => {
        const [dx, dy] = drag[sida], n = { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy };
        let k = n.top < topp || n.bottom > botten || n.left < ram.vanster || n.right > ram.hoger ? 1e6 : 0;
      if (dorrar.some((d) => n.left < d.right - 1 && d.left < n.right - 1 && n.top < d.bottom - 1 && d.top < n.bottom - 1)) k += 5e5;
        for (const o of alla) if (o !== q && krock(n, o.r)) k += (Math.min(n.right, o.r.right) - Math.max(n.left, o.r.left) + luft) * (Math.min(n.bottom, o.r.bottom) - Math.max(n.top, o.r.top) + luft);
        return k;
      };
      // samma sida som förra gången så länge den ryms i rummet (ingen fladder), annars den bästa
      const forra = /** @type {any} */ (q.d).sida;
      let bast = ordning[0], minst = Infinity;
      if (forra && kostnad(forra) < 1e6) bast = forra;
      else for (const sida of ordning) { const k = kostnad(sida); if (k < minst) { minst = k; bast = sida; } if (k === 0) break; }
      /** @type {any} */ (q.d).sida = bast; q.d.dataset.undan = bast;
      flytta(q, ...drag[bast]);
    }
    // 2. skyltarna som krockar skjuts isär i sidled, hälften var, inom rummets kanter
    for (let varv = 0; varv < 24; varv++) {
      let lugnt = true;
      for (let i = 0; i < alla.length; i++) for (let j = i + 1; j < alla.length; j++) {
        const a = alla[i], b = alla[j];
        if (!krock(a.r, b.r)) continue;
        lugnt = false;
        const [v, h] = (a.r.left + a.r.right) <= (b.r.left + b.r.right) ? [a, b] : [b, a];
        const over = v.r.right + luft + 1 - h.r.left;
        flytta(v, -Math.ceil(over / 2)); flytta(h, Math.ceil(over / 2));
        iRam(v); iRam(h);
      }
      if (lugnt) break;
    }
    // räckte inte bredden: den som fortfarande krockar flyttas ned en rad (under hjälten eller under den andra)
    for (let i = 0; i < alla.length; i++) {
      const b = alla[i];
      if (hj && krock(b.r, hj)) flytta(b, 0, hj.bottom + luft + 1 - b.r.top);
      for (let j = 0; j < i; j++) if (krock(alla[j].r, b.r)) flytta(b, 0, alla[j].r.bottom + luft + 1 - b.r.top);
    }
    for (const q of alla) if (!q.bas) { delete /** @type {any} */ (q.d).sida; delete q.d.dataset.undan; }
  }
  /**
   * Rummets egna skyltar och tavlor (rum.skyltar: BÄR, BRON, Farfars skyltar). De står i världen hela tiden, som
   * utgångarnas skyltar, men utanför valen. @param {Parameters<typeof skyltar>[0]} lista
   */
  function rumsskyltar(lista) { skyltar(lista, $('#rumsskyltar')); }
  /** En rumsskylt glimtar (knuff: "skylten glimtar"). @param {string} objekt */
  function pulseraSkylt(objekt) {
    const d = /** @type {HTMLElement | null} */ (ui.querySelector(`#rumsskyltar .skylt[data-objekt="${CSS.escape(objekt)}"]`));
    if (!d) return;
    d.classList.remove('puls'); void d.offsetWidth; d.classList.add('puls');
  }
  /**
   * En figur kallar på hjälten på avstånd (högst tre ord): en pratbubbla ovanför figuren. null döljer.
   * @param {string | null} html @param {{ x: number, y: number }} [punkt] figurens överkant på skärmen
   */
  /**
   * Ett ljudord i världen vid det som låter (beslut 21.5): poppar upp, studsar och står kvar ca 2 s, så att han hinner läsa det
   * (granskningen A 24). Reaktionen väntar inte på det, så den blir inte längre.
   * Det ritas i versaler genom text.js, som all text han läser. @param {string} ord vanlig skrift
   * @param {{ x: number, y: number }} punkt skärmpunkt @param {string} [farg] ljudets färg
   */
  function ljudord(ord, punkt, farg) {
    // samma tid som animationen i stil.css (.ljudord)
    const e = document.createElement('div');
    e.className = 'ljudord'; e.setAttribute('aria-hidden', 'true');
    e.textContent = forSkarm(ord, { varden: {} }).join(' ');
    if (farg) e.style.setProperty('--ljudfarg', farg);
    e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px';
    varldslager.appendChild(e); ankra(e);
    window.setTimeout(() => { ankrade.delete(e); e.remove(); }, LJUDORD_MS + 50);
  }
  function ropa(html, punkt) {
    const e = $('#rop');
    if (!html || !punkt) { e.hidden = true; e.innerHTML = ''; return; }
    e.innerHTML = html; e.hidden = false; ankra(e);
    e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px';
    e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  }
  /** Skylten vid utgången hjälten står vid får handen. @param {string | null} objekt */
  function skyltNara(objekt) {
    for (const d of /** @type {NodeListOf<HTMLElement>} */ ($('#skyltar').querySelectorAll('.skylt'))) d.classList.toggle('nara', d.dataset.objekt === objekt);
  }

  /**
   * Handen vid föremålet hjälten står vid: här kan du göra något. Ett tryck på handen använder föremålet.
   * @param {{ x: number, y: number } | null} punkt @param {() => void} [vidTryck] @param {Plats} [plats]
   */
  const hand = $('#handknapp');
  /** @type {() => void} */
  let handTryck = () => {};
  hand.querySelector('button')?.addEventListener('click', (e) => { e.stopPropagation(); handTryck(); });
  function handknapp(punkt, vidTryck, plats) {
    if (!punkt) { hand.hidden = true; handTryck = () => {}; return; }
    handTryck = vidTryck || (() => {});
    hand.hidden = false;
    ankra(hand); placera(hand, punkt, plats);
  }

  /** Ett bär flyger från räknaren till ungen. @param {{ x: number, y: number }} fran @param {{ x: number, y: number }} till @param {number} ms */
  function flygBar(fran, till, ms) {
    const e = document.createElement('div');
    e.className = 'flygande-bar'; e.innerHTML = ikon('bar');
    ui.appendChild(e);
    const mitt = { x: (fran.x + till.x) / 2, y: Math.min(fran.y, till.y) - 60 };
    const anim = e.animate([
      { transform: `translate(${fran.x}px, ${fran.y}px) scale(1)` },
      { transform: `translate(${mitt.x}px, ${mitt.y}px) scale(1.2)`, offset: 0.5 },
      { transform: `translate(${till.x}px, ${till.y}px) scale(.6)` },
    ], { duration: Math.max(1, ms), easing: 'ease-in-out', fill: 'forwards' });
    return new Promise((r) => { const klar = () => { e.remove(); r(undefined); }; anim.onfinish = klar; setTimeout(klar, ms + 300); });
  }

  /**
   * Styrhjälpen, utan text: piltangenter (dator) eller ett finger som trycker på målet (pekskärm). null döljer.
   * @param {'pilar' | 'tryck' | 'mellanslag' | 'tab' | null} typ @param {{ x: number, y: number } | null} [punkt] målet på skärmen
   */
  /**
   * Stils ritade tangent (50.3, 10b: tangent_<namn>_01 uppe och _02 nedtryckt), i hela pixelsteg, eller null om den
   * inte är ritad. Bilderna byts med CSS, så att tangenten trycks ned och släpps. @param {string} namn @param {string} klass
   */
  const ritadTangent = (namn, klass) => {
    const a = uiBild(`tangent_${namn}_01`), b = uiBild(`tangent_${namn}_02`);
    return a && b ? `<span class="tangent-bild ${klass}" aria-hidden="true"><img class="uppe" src="${a}" alt="" draggable="false"><img class="nere" src="${b}" alt="" draggable="false"></span>` : null;
  };
  function styrhjalp(typ, punkt) {
    const e = $('#styrhjalp');
    e.hidden = !typ; e.className = typ || ''; e.style.left = ''; e.style.top = '';
    // på datorn Stils ritade tangenter (50.3), och de som CSS ritar om bilderna saknas. På pekskärmen bara handen
    const pilar = ['upp', 'vanster', 'ner', 'hoger'].map((h) => ritadTangent(`pil_${h}`, h));
    if (typ === 'pilar' && pilar.every(Boolean)) { e.classList.add('ritad'); e.innerHTML = pilar.join(''); }
    else if (typ === 'mellanslag' && ritadTangent('mellanslag', 'mellanslag')) {
      // vid handen bara tangenten (handen står redan där), annars handen som trycker på tangenten
      e.classList.add('ritad');
      e.innerHTML = /** @type {string} */ (punkt ? ritadTangent('mellanslag', 'mellanslag') : ritadTangent('mellanslag_hand', 'mellanslag hand') || ritadTangent('mellanslag', 'mellanslag'));
      if (punkt) { ankra(e); e.classList.add('vid-hand'); e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px'; }
    }
    else if (typ === 'tab' && ritadTangent('tab', 'tab')) {
      e.classList.add('ritad'); e.innerHTML = /** @type {string} */ (ritadTangent('tab', 'tab'));
      if (punkt) { e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px'; }
    }
    else if (typ === 'pilar') e.innerHTML = '<span class="tangent upp"><span class="yta">▲\uFE0E</span></span><span class="tangent vanster"><span class="yta">◀\uFE0E</span></span><span class="tangent ner"><span class="yta">▼\uFE0E</span></span><span class="tangent hoger"><span class="yta">▶\uFE0E</span></span>';
    else if (typ === 'tryck' && punkt) { ankra(e); e.innerHTML = `<span class="finger">${ikon('hand', 'stor')}</span>`; e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px'; }
    else if (typ === 'mellanslag') { // en bred tangent som trycks ned, bredvid handen (inte över molnet nere till vänster)
      // tecknet för mellanslag (⎵) ritat i CSS, så att tangenten inte ser ut som en tom ruta (47.8)
      e.innerHTML = '<span class="tangent mellanslag" aria-hidden="true"><span class="yta"><span class="mellanslag-tecken"></span></span></span>';
      if (punkt) { ankra(e); e.classList.add('vid-hand'); e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px'; }
    }
    else if (typ === 'tab') { // Tab-tangenten, som tänder nosen, under nosknappen
      e.innerHTML = '<span class="tangent tab" aria-hidden="true"><span class="yta">⇥</span></span>';
      if (punkt) { e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px'; }
    }
    else e.innerHTML = '';
  }

  /**
   * Glid från förra rummet (en bild) till det nya, i hela rumspixlar. Båda syns sida vid sida.
   * Nya rummet kommer in från det håll hjälten gick åt.
   * @param {HTMLElement} varld @param {HTMLImageElement} bild förra rummet
   * @param {'vanster' | 'hoger' | 'upp' | 'ned'} riktning @param {number} cssSkala @param {number} ms
   */
  function glid(varld, bild, riktning, cssSkala, ms) {
    const canvas = /** @type {HTMLElement | null} */ (varld.querySelector('canvas'));
    if (!canvas) return Promise.resolve();
    const forra = document.createElement('img');
    forra.className = 'forra-rummet'; forra.src = bild.src; forra.alt = '';
    // räknaren låter testerna se en glidning som är för kort för att fångas (snabbläget, 30 ms)
    varld.dataset.glidningar = String(Number(varld.dataset.glidningar || 0) + 1);
    varld.appendChild(forra);
    const [ax, ay] = { hoger: [1, 0], vanster: [-1, 0], upp: [0, -1], ned: [0, 1] }[riktning];
    const B = 320, H = 192;
    const satt = (/** @type {number} */ t) => {
      // hela rumspixlar: rörelsen räknas i rummets pixlar och skalas sedan
      const px = Math.round(t * (ax ? B : H));
      const nx = ax * (B - px), ny = ay * (H - px);
      canvas.style.transform = `translate(${nx * cssSkala}px, ${ny * cssSkala}px)`;
      forra.style.transform = `translate(${(nx - ax * B) * cssSkala}px, ${(ny - ay * H) * cssSkala}px)`;
    };
    satt(0);
    return new Promise((klar) => {
      const t0 = performance.now();
      const steg = () => {
        const t = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
        satt(t);
        if (t < 1) requestAnimationFrame(steg);
        else { canvas.style.transform = ''; forra.remove(); klar(undefined); }
      };
      requestAnimationFrame(steg);
      setTimeout(() => { if (forra.isConnected) { canvas.style.transform = ''; forra.remove(); klar(undefined); } }, ms + 500);
    });
  }
  /** Tona till svart (true) eller tillbaka (false), ca 0,3 s. @param {boolean} svart @param {number} ms */
  function tona(svart, ms) {
    $('#tona').classList.toggle('svart', svart);
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Irisen (F4, beslut 62.5): en svart cirkel som stängs över spelytan och öppnas igen, som i SNES-spelen. Den går i
   * åtta steg (setTimeout, en klippbana per steg), så att golvdatorn bara ritar om spelytan åtta gånger. Mitten i
   * världens pixlar (förvalt mitt på). @param {boolean} stang @param {number} ms
   * @param {{ x: number, y: number }} [mitt] @returns {Promise<number>} hur lång tid det tog (loggen, golvdatorn)
   */
  function iris(stang, ms, mitt = { x: 160, y: 96 }) {
    const e = $('#iris');
    e.hidden = false;
    const b = e.clientWidth || 320, h = e.clientHeight || 192, k = b / 320;
    const cx = mitt.x * k, cy = mitt.y * k;
    const R = Math.hypot(Math.max(cx, b - cx), Math.max(cy, h - cy)) + 2;
    const N = 8, t0 = performance.now();
    return new Promise((klar) => {
      let i = 0;
      const steg = () => {
        const r = Math.max(0, R * (stang ? 1 - i / N : i / N));
        e.style.clipPath = r > 0
          ? `path(evenodd, 'M0 0H${b}V${h}H0Z M${(cx - r).toFixed(1)} ${cy.toFixed(1)} a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0 a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z')`
          : 'none';
        if (i++ >= N) {
          if (!stang) { e.hidden = true; e.style.clipPath = ''; }
          klar(Math.round(performance.now() - t0));
          return;
        }
        setTimeout(steg, ms / N);
      };
      steg();
    });
  }

  return {
    kamera,
    /** När kameran har flyttat sig. @param {() => void} f */
    vidKamera(f) { kameraLyssnare.add(f); return () => kameraLyssnare.delete(f); },
    glid, tona,
    styrhjalp,
    flygBar,
    handknapp,
    ljudord, visaTanke, placeraTanke, pulseraTanke, tankeRyms, passaTanke, ordskylt, skyltar, rumsskyltar, skyltHjalte, sattDorrRutor, ordnaSkyltar, skyltStor, pulseraSkylt, skyltNara, ropa,
    ui, $, plattan, rader, esc, visaPlatta, doljPlatta, vidPapper, vantaFortsatt, visaRegi, doljRegi, visaFest,
    uppdateraHud, sattLappknapp, glimta, pulsera, ikonKnappar, visaSkarm, doljSkarm, iris, visaMeny, doljMeny, visaPausmeny, doljPausmeny, etiketter, sattNos, vaxlaNos, ljuda, arHelord,
    fanga, tandNos, markeraOrd,
    /** @param {(vad: 'tand' | 'ord', ord?: string) => void} f @returns {() => void} */
    vidNos(f) { nosLyssnare.add(f); return () => nosLyssnare.delete(f); },
    get nosAktiv() { return nos.aktiv; },
    get ljudar() { return ljudning.pagar; },
    avbrytLjudning,
  };
}
