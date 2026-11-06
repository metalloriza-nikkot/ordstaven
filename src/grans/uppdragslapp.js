// @ts-check
// Uppdragslappen i textremsan under spelytan (beslut 37.3 och 40.1, 10d *Uppdragslappen*). Farfars gulnade papper
// med kompassrosen: uppdragets bild och namn, en bock per gjort steg, och steget han gör nu med pilen. Remsan är
// lägre än ca 280 punkter på alla våra enheter, så lappen är kompakt (10d): steg som är gjorda syns som bockar på
// rubrikens rad, och bara steget han gör nu står under. Ett tryck läser lappen igen. Stämpeln i blått bläck slår ned
// när uppdraget är klart, och lappen flyger till pausknappen. Lappen ligger aldrig över spelytan.
import { ikon, uiBild } from './ikoner.js';

/** {UNGE} på lappen (Innehålls form) → platshållaren som textmotorn känner. @param {string} t */
export const lappText = (t) => t.replace(/\{(UNGE|HJALTE)\}/g, (m) => m.toLowerCase());

/**
 * @param {{ rot: HTMLElement, ui: any, bilder: { html(id: string): string }, varden: () => Record<string, string> }} opt
 */
export function skapaUppdragslapp({ rot, ui, bilder, varden }) {
  const el = document.createElement('div');
  el.id = 'uppdragslapp';
  el.hidden = true;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'Uppdraget');
  // före läsplattan i dokumentet, så att textrutan och läsplattan ligger över lappen
  rot.insertBefore(el, rot.querySelector('#plattan'));
  const papper = uiBild('lapp_uppdrag');
  if (papper) document.documentElement.style.setProperty('--lapp9', `url("${papper}")`);
  let nyckel = '';
  /** @type {(() => void) | null} */
  let vidTryck = null;
  el.addEventListener('click', (e) => { e.stopPropagation(); if (vidTryck) vidTryck(); });

  /** Lappens bredd till CSS (textrutan och molnet står bredvid). */
  const matt = () => document.documentElement.style.setProperty('--lapp-bredd', el.hidden ? '0px' : `${Math.ceil(el.getBoundingClientRect().width)}px`);

  /**
   * Visa lappen, eller dölj den (null).
   * @param {{ rubrik: string, bild: string, gjorda: number, nu: string | null, id: string } | null} l
   */
  function visa(l) {
    const ny = l ? `${l.id}|${l.gjorda}|${l.nu}` : '';
    if (ny === nyckel && !!l === !el.hidden) return;
    nyckel = ny;
    document.documentElement.classList.toggle('lapp-syns', !!l);
    if (!l) { el.hidden = true; el.innerHTML = ''; matt(); return; }
    const ros = uiBild('lapp_kompassros');
    const bockar = Array.from({ length: l.gjorda }, () => `<span class="lapp-bock">${ikon('klar')}</span>`).join('');
    el.innerHTML = `${ros ? `<img class="lapp-ros" src="${ros}" alt="" draggable="false">` : ''}`
      + `<div class="lapp-topp"><span class="lapp-bild">${bilder.html(l.bild)}</span><span class="lapp-rubrik">${ui.rader(lappText(l.rubrik), varden())}</span>${bockar ? `<span class="lapp-bockar">${bockar}</span>` : ''}</div>`
      + (l.nu ? `<div class="lapp-nu"><span class="lapp-pil">${ikon('fram')}</span><span class="lapp-steg">${ui.rader(lappText(l.nu), varden())}</span></div>` : '');
    el.hidden = false;
    matt();
  }

  /** Ett nytt steg: lappen guppar. */
  function pulsera() { el.classList.remove('puls'); void el.offsetWidth; el.classList.add('puls'); }

  /**
   * Stämpeln slår ned vid lappens högra kant (skala 2 → 1 på ca 0,15 s), och sedan flyger lappen till pausknappen
   * (ca 0,6 s). @param {HTMLElement | null} mal pausknappen @param {(ms: number) => Promise<void>} vanta
   */
  async function stampla(mal, vanta) {
    if (el.hidden) return;
    const src = uiBild('stampel');
    if (src) { const s = document.createElement('img'); s.className = 'lapp-stampel'; s.src = src; s.alt = ''; s.draggable = false; el.appendChild(s); }
    await vanta(900);
    if (mal && !mal.hidden) {
      const a = el.getBoundingClientRect(), m = mal.getBoundingClientRect();
      el.style.setProperty('--flyg-x', `${m.left + m.width / 2 - (a.left + a.width / 2)}px`);
      el.style.setProperty('--flyg-y', `${m.top + m.height / 2 - (a.top + a.height / 2)}px`);
      el.classList.add('flyger');
      await vanta(600);
    }
    el.classList.remove('flyger'); el.style.removeProperty('--flyg-x'); el.style.removeProperty('--flyg-y');
    visa(null);
  }

  return {
    visa, pulsera, stampla,
    /** Det som händer vid ett tryck på lappen. @param {(() => void) | null} f */
    vidTryck(f) { vidTryck = f; },
    get syns() { return !el.hidden; },
    el,
  };
}
