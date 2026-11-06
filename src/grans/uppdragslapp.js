// @ts-check
// Uppdragslappen (beslut 47 och 48, 10d *Uppdragslappen*). Molnet säger vad han ska göra nu, och lappen säger vilket
// uppdrag han är på: Farfars gulnade papper med kompassrosen, uppdragets bild och rubrik, en bock per gjort steg, en
// tom ring per steg som är kvar och högtalaren. Ingen text för delstegen, så lappen kan aldrig säga något annat än
// molnet. Hopfälld är lappen bara lappknappen i HUD:en. Framme står den ensam i remsan (ca 150 punkter hög), och den
// fälls ihop mot knappen på ca 0,3 s, eller direkt när en dialog eller molnet ska ha remsan.
// Stämpeln (47.4) slår ned på spelytan bredvid hjälten, se `visaStampel`.
import { ikon, uiBild } from './ikoner.js';

/** {UNGE} på lappen (Innehålls form) → platshållaren som textmotorn känner. @param {string} t */
export const lappText = (t) => t.replace(/\{(UNGE|HJALTE)\}/g, (m) => m.toLowerCase());

/** Hur länge lappen fälls ihop (ms), som i CSS. */
export const LAPP_IHOP_MS = 300;

/**
 * @param {{ rot: HTMLElement, ui: any, bilder: { html(id: string): string }, varden: () => Record<string, string>,
 *           knapp: () => HTMLElement | null }} opt knapp = lappknappen som lappen fälls ihop mot
 */
export function skapaUppdragslapp({ rot, ui, bilder, varden, knapp }) {
  const el = document.createElement('div');
  el.id = 'uppdragslapp';
  el.hidden = true;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'Uppdraget');
  rot.insertBefore(el, rot.querySelector('#plattan'));
  const papper = uiBild('lapp_uppdrag');
  if (papper) document.documentElement.style.setProperty('--lapp9', `url("${papper}")`);
  let nyckel = '';
  /** @type {(() => void) | null} */
  let vidTryck = null;
  el.addEventListener('click', (e) => { e.stopPropagation(); if (vidTryck) vidTryck(); });
  /** @type {ReturnType<typeof setTimeout> | null} */
  let ihopTimer = null;

  /**
   * Lappens innehåll (den fälls inte ut av det), eller inget uppdrag (null: lappen fälls ihop).
   * @param {{ rubrik: string, bild: string, gjorda: number, kvar: number, id: string } | null} l
   */
  function visa(l) {
    const ny = l ? `${l.id}|${l.gjorda}|${l.kvar}` : '';
    if (ny === nyckel) return;
    nyckel = ny;
    if (!l) { fallIhop(true); el.innerHTML = ''; return; }
    const ros = uiBild('lapp_kompassros');
    const bockar = Array.from({ length: l.gjorda }, () => `<span class="lapp-bock">${ikon('klar')}</span>`).join('')
      + Array.from({ length: l.kvar }, () => '<span class="lapp-ring"></span>').join('');
    el.innerHTML = `${ros ? `<img class="lapp-ros" src="${ros}" alt="" draggable="false">` : ''}`
      + `<span class="lapp-bild">${bilder.html(l.bild)}</span><span class="lapp-rubrik">${ui.rader(lappText(l.rubrik), varden())}</span>`
      + `${bockar ? `<span class="lapp-bockar">${bockar}</span>` : ''}<span class="lapp-hogtalare">${ikon('hogtalare')}</span>`;
  }

  /** Lappen fälls ut i remsan (när den har något att visa). @returns {boolean} om den är framme */
  function fallUt() {
    if (!nyckel) return false;
    if (ihopTimer) { clearTimeout(ihopTimer); ihopTimer = null; }
    el.classList.remove('ihop');
    el.style.removeProperty('--ihop-x'); el.style.removeProperty('--ihop-y');
    el.hidden = false;
    document.documentElement.classList.add('lapp-framme');
    return true;
  }

  /**
   * Lappen fälls ihop mot lappknappen (ca 0,3 s, skala och läge), eller direkt (en dialog eller molnet ska ha remsan).
   * @param {boolean} [direkt]
   */
  function fallIhop(direkt = false) {
    if (el.hidden) return;
    document.documentElement.classList.remove('lapp-framme');
    const k = knapp();
    if (direkt || !k || k.hidden || ihopTimer) { if (ihopTimer) clearTimeout(ihopTimer); ihopTimer = null; el.classList.remove('ihop'); el.hidden = true; return; }
    const a = el.getBoundingClientRect(), m = k.getBoundingClientRect();
    el.style.setProperty('--ihop-x', `${m.left + m.width / 2 - (a.left + a.width / 2)}px`);
    el.style.setProperty('--ihop-y', `${m.top + m.height / 2 - (a.top + a.height / 2)}px`);
    el.classList.add('ihop');
    ihopTimer = setTimeout(() => { ihopTimer = null; el.hidden = true; el.classList.remove('ihop'); }, LAPP_IHOP_MS);
  }

  return {
    visa, fallUt, fallIhop,
    /** Det som händer vid ett tryck på lappen. @param {(() => void) | null} f */
    vidTryck(f) { vidTryck = f; },
    /** Lappen är framme (inte på väg ihop). */
    get framme() { return !el.hidden && !el.classList.contains('ihop'); },
    /** Lappen har ett uppdrag att visa. */
    get harUppdrag() { return !!nyckel; },
    el,
  };
}

/**
 * Var stämpeln ska slå ned: bredvid hjälten på spelytan, aldrig över honom eller ungen, och inne i kameran (10d,
 * 47.4). Allt i världens pixlar. Ren funktion.
 * @param {{ x: number, y: number }} hjalte hjältens fötter
 * @param {{ x: number, y: number } | null} unge ungens fötter, eller null
 * @param {{ x: number, y: number, b: number, h: number }} vy kamerans ruta
 * @param {number} [storlek] stämpelns sida (64)
 * @returns {{ x: number, y: number }} stämpelns övre vänstra hörn
 */
export function stampelPlats(hjalte, unge, vy, storlek = 64) {
  const hindren = [{ x: hjalte.x - 8, y: hjalte.y - 26, b: 16, h: 26 }];
  if (unge) hindren.push({ x: unge.x - 12, y: unge.y - 14, b: 24, h: 20 });
  const kant = 4;
  const klamp = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) => Math.max(lo, Math.min(hi, v));
  const inne = (/** @type {{ x: number, y: number }} */ p) => ({
    x: Math.round(klamp(p.x, vy.x + kant, vy.x + vy.b - storlek - kant)),
    y: Math.round(klamp(p.y, vy.y + kant, vy.y + vy.h - storlek - kant)),
  });
  const krockar = (/** @type {{ x: number, y: number }} */ p) => hindren.some((r) => p.x < r.x + r.b && p.x + storlek > r.x && p.y < r.y + r.h && p.y + storlek > r.y);
  const mitt = hjalte.y - 13 - storlek / 2;
  const forslag = [
    { x: hjalte.x + 14, y: mitt }, // till höger
    { x: hjalte.x - 14 - storlek, y: mitt }, // till vänster
    { x: hjalte.x - storlek / 2, y: hjalte.y - 30 - storlek }, // ovanför
    { x: hjalte.x - storlek / 2, y: hjalte.y + 6 }, // nedanför
    { x: hjalte.x + 34, y: mitt }, { x: hjalte.x - 34 - storlek, y: mitt }, // längre bort, förbi ungen
  ].map(inne);
  return forslag.find((p) => !krockar(p)) ?? forslag[0];
}

/**
 * Stämpeln (47.4, 10d): slår ned på ca 0,15 s (skala 1,6 → 1, opacitet 0 → 1) med fyra vita glimtar, står kvar och
 * tonas bort efter 1 s. Allt tar ca 1,5 s, och ett tryck var som helst hoppar till slutet. Bara opacitet, läge och
 * skala animeras (CSS), så golvdatorn klarar det.
 * @param {{ rot: HTMLElement, x: number, y: number, storlek: number, ms?: number }} opt läge och storlek i CSS-punkter
 * @returns {{ klar: Promise<void>, nedslag: Promise<void> }} klar när stämpeln är borta, nedslag efter ca 0,15 s
 */
export function visaStampel({ rot, x, y, storlek, ms = 1500 }) {
  const el = document.createElement('div');
  el.className = 'stampel-ruta';
  el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.width = el.style.height = `${storlek}px`;
  el.style.setProperty('--stampel-ms', `${ms}ms`);
  const src = uiBild('stampel');
  el.innerHTML = `${src ? `<img class="stampel-bild" src="${src}" alt="" draggable="false">` : ''}${'<span class="stampel-glimt"></span>'.repeat(4)}`;
  rot.appendChild(el);
  /** @type {() => void} */
  let sluta = () => {};
  const klar = new Promise((r) => {
    const t = setTimeout(() => sluta(), ms);
    const tryck = () => sluta();
    sluta = () => { clearTimeout(t); window.removeEventListener('pointerdown', tryck, true); el.remove(); r(undefined); };
    window.addEventListener('pointerdown', tryck, true);
  });
  const nedslag = new Promise((r) => setTimeout(r, Math.min(150, ms / 10)));
  return { klar: /** @type {Promise<void>} */ (klar), nedslag: /** @type {Promise<void>} */ (nedslag) };
}
