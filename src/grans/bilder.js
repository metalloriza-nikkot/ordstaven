// @ts-check
// Platshållarbilder för gråboxen: emoji från ordlistorna och enkla former (färg, storlek, höjd).
// Ersätts av stilspårets grafik. Ingen text i bilderna: en bild som visar ett ord skulle lösa läsuppgiften.

/** ASCII-vikning så att id:n utan å, ä, ö hittar sina ord (bar → bär). @param {string} s */
const vik = (s) => s.toLocaleLowerCase('sv-SE').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e');

import { PALETT, egenskaper } from '../karna/egenskaper.js';

const FARGER = PALETT;
/** Äventyrets egna platshållarbilder (kartor/<äventyr>/platshallare.json), sätts av skapaBilder. */
let EXTRA = /** @type {Record<string, string>} */ ({});

/** Egna platshållare där emoji saknas eller visar fel sak (🧣 är en halsduk, inte en filt). */
const RITADE = /** @type {Record<string, (farg?: string) => string>} */ ({
  // en vikt filt: rutig (tartan), med ett nervikt hörn och fransar
  filt: (farg = '#c8453a') => `<svg class="ritad" viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true">
    <path d="M6 14 h52 v34 l-14 0 l-38 0 z" fill="${farg}"/>
    <g fill="#000" opacity=".18"><path d="M6 24 h52 v5 h-52 z M6 38 h52 v5 h-52 z M16 14 h5 v34 h-5 z M36 14 h5 v34 h-5 z"/></g>
    <g fill="#fff" opacity=".3"><path d="M6 31 h52 v1.5 h-52 z M27 14 h1.5 v34 h-1.5 z M47 14 h1.5 v34 h-1.5 z"/></g>
    <path d="M42 48 l16 -16 v16 z" fill="#000" opacity=".25"/>
    <path d="M42 48 l16 -16 l-4 18 z" fill="${farg}"/><path d="M42 48 l16 -16 l-4 18 z" fill="#fff" opacity=".22"/>
    <g stroke="${farg}" stroke-width="2" stroke-linecap="round"><path d="M9 48 v6 M14 48 v6 M19 48 v6 M24 48 v6 M29 48 v6 M34 48 v6 M39 48 v6"/></g>
  </svg>`,
});

/** @param {any} ordlistor @param {Record<string, string>} [platshallare] äventyrets egna bild-id → emoji */
export function skapaBilder(ordlistor, platshallare = {}) {
  EXTRA = platshallare;
  /** @type {Map<string, string>} */
  const emoji = new Map();
  for (const o of ordlistor.ord) if (o.bild) emoji.set(vik(o.ord), o.bild);
  const hitta = (/** @type {string} */ id) => RITADE[vik(id)]?.() || emoji.get(vik(id)) || EXTRA[id] || null;

  /**
   * HTML för en platshållarbild.
   * @param {string} id t.ex. "tankebubbla_filt", "stor_rod", "hog_rund_sten", "filt_rod"
   * @returns {string}
   */
  function html(id) {
    const delar = id.split('_');
    if (delar[0] === 'tankebubbla') {
      const e = hitta(delar.slice(1).join('_')) || '❔';
      return `<span class="bild bubbla" data-bild="${id}"><span class="bubbla-ytter">${e}</span><span class="bubbla-prick"></span></span>`;
    }
    if (EXTRA[id]) return `<span class="bild emoji" data-bild="${id}">${EXTRA[id]}</span>`;
    const farg = delar.map((d) => FARGER[/** @type {keyof FARGER} */ (d)]).find(Boolean);
    const storlek = egenskaper(id).storlek;
    const stor = storlek === 'stor' ? 1.35 : storlek === 'liten' ? 0.7 : 1;
    const hog = delar.includes('hog') ? 1.5 : delar.includes('lag') ? 0.6 : 1;
    const bas = delar.find((d) => !(d in FARGER) && !['stor', 'liten', 'hog', 'lag', 'rund', 'spetsig', 'gammalt', 'ungt', 'litet', 'stort'].includes(d)) || 'lada';
    const e = hitta(bas);
    if (RITADE[bas]) return `<span class="bild emoji" data-bild="${id}" style="font-size:calc(${Math.round(64 * stor)}px * var(--t))">${RITADE[bas](farg)}</span>`;
    if (farg || stor !== 1 || hog !== 1) {
      // en form: färgad låda, eller emoji på färgad botten
      const b = Math.round(64 * stor), h = Math.round(48 * stor * hog);
      const form = delar.includes('spetsig') ? 'spetsig' : delar.includes('rund') ? 'rund' : '';
      const inre = e && bas !== 'lada' ? `<span class="form-emoji">${e}</span>` : '';
      return `<span class="bild form ${form}" data-bild="${id}" style="width:calc(${b}px * var(--t));height:calc(${h}px * var(--t));background:${farg || '#9b958a'}">${inre}</span>`;
    }
    return `<span class="bild emoji" data-bild="${id}">${e || '❔'}</span>`;
  }
  return { html, emoji: hitta };
}
