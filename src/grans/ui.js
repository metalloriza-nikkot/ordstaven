// @ts-check
// Gränssnittets byggstenar i DOM: läsplattan, regirutan, HUD (bär, nos, lappar, radio), ljudningsremsan,
// helskärmar (start, passets slut) och etiketter över rummets objekt. All läsbar text här, i Lexend.
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
    <div id="tona"></div>
    <div id="hud">
      <button type="button" id="hud-bar" class="hud-knapp" hidden aria-label="Bär"><span class="ikon">🫐</span><span class="tal">0</span></button>
      <button type="button" id="hud-nos" class="hud-knapp" hidden aria-label="Nosa på ett ord"><span class="ikon">👃</span></button>
      <button type="button" id="hud-lapp" class="hud-knapp" hidden aria-label="Lappen"><span class="ikon">📜</span></button>
      <span id="hud-radio" class="hud-knapp" hidden><span class="ikon">📻</span></span>
    </div>
    <button type="button" id="hud-paus" class="hud-knapp" hidden aria-label="Paus"><span class="ikon paus-ikon" aria-hidden="true"><i></i><i></i></span></button>
    <button type="button" id="hud-meny" aria-label="Meny för vuxna (håll inne)">⚙</button>
    <div id="tanke" hidden></div>
    <div id="varldslager">
      <div id="etiketter"></div>
      <div id="rumsskyltar"></div>
      <div id="skyltar"></div>
      <div id="rop" hidden></div>
      <div id="ordskylt" hidden></div>
      <div id="handknapp" hidden><button type="button" aria-label="Använd">✋</button></div>
    </div>
    <div id="styrhjalp" hidden></div>
    <div id="regi" hidden></div>
    <div id="narbild" hidden><span>🗺️</span></div>
    <div id="plattan" hidden></div>
    <div id="remsa" hidden></div>
    <div id="fest" hidden></div>
    <div id="skarm" hidden></div>
    <div id="pausmeny" hidden></div>
    <div id="vuxenmeny" hidden></div>`;
  document.body.appendChild(ui);
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
  /** Menyn för vuxna ligger över allt annat, även startskärmen, och rör inte spelets skärmar. @param {string} html */
  function visaMeny(html) { const m = $('#vuxenmeny'); m.innerHTML = html; m.hidden = false; return m; }
  function doljMeny() { const m = $('#vuxenmeny'); m.hidden = true; m.innerHTML = ''; }
  /** Spelarens pausmeny (kartan och hjälteboken). @param {string} html */
  function visaPausmeny(html) { const m = $('#pausmeny'); m.innerHTML = html; m.hidden = false; return m; }
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
  function pulseraTanke() { const t = $('#tanke'); t.classList.remove('puls'); void t.offsetWidth; t.classList.add('puls'); }
  /**
   * @typedef {{ lage?: 'over' | 'pa' | 'vanster' | 'hoger', under?: number, rumTopp: number, ram?: { vanster: number, hoger: number }, objekt?: string }} Plats
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
    e.classList.remove('under', 'pa', 'vanster', 'hoger');
    if (plats?.objekt) e.dataset.objekt = plats.objekt; else delete e.dataset.objekt;
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
      e.appendChild(d);
      placera(d, s.punkt, { ...s.plats, objekt: s.objekt });
      d.querySelector('button')?.addEventListener('click', () => { if (!nos.aktiv) s.vidTryck(); });
    }
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
    e.className = 'flygande-bar'; e.textContent = '🫐';
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
  function styrhjalp(typ, punkt) {
    const e = $('#styrhjalp');
    e.hidden = !typ; e.className = typ || '';
    if (typ === 'pilar') e.innerHTML = '<span class="tangent upp">▲</span><span class="tangent vanster">◀</span><span class="tangent ner">▼</span><span class="tangent hoger">▶</span>';
    else if (typ === 'tryck' && punkt) { ankra(e); e.innerHTML = '<span class="finger">👆</span>'; e.style.left = punkt.x + 'px'; e.style.top = punkt.y + 'px'; }
    else if (typ === 'mellanslag') e.innerHTML = '<span class="tangent mellanslag" aria-hidden="true"></span>'; // en bred tangent som trycks ned
    else if (typ === 'tab') { // Tab-tangenten, som tänder nosen, under nosknappen
      e.innerHTML = '<span class="tangent tab" aria-hidden="true">⇥</span>';
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

  return {
    kamera,
    /** När kameran har flyttat sig. @param {() => void} f */
    vidKamera(f) { kameraLyssnare.add(f); return () => kameraLyssnare.delete(f); },
    glid, tona,
    styrhjalp,
    flygBar,
    handknapp,
    visaTanke, pulseraTanke, ordskylt, skyltar, rumsskyltar, pulseraSkylt, skyltNara, ropa,
    ui, $, plattan, rader, esc, visaPlatta, doljPlatta, vantaFortsatt, visaRegi, doljRegi, visaFest,
    uppdateraHud, pulsera, visaSkarm, doljSkarm, visaMeny, doljMeny, visaPausmeny, doljPausmeny, etiketter, sattNos, vaxlaNos, ljuda, arHelord,
    fanga, tandNos, markeraOrd,
    /** @param {(vad: 'tand' | 'ord', ord?: string) => void} f @returns {() => void} */
    vidNos(f) { nosLyssnare.add(f); return () => nosLyssnare.delete(f); },
    get nosAktiv() { return nos.aktiv; },
    get ljudar() { return ljudning.pagar; },
    avbrytLjudning,
  };
}
