// @ts-check
// Läsplattans bilder: Stils bildkort (assets/bildkort/<id>.png) där de finns, annars gråboxens platshållare:
// emoji från ordlistorna och enkla former (färg, storlek, höjd).
// Ingen text i bilderna: en bild som visar ett ord skulle lösa läsuppgiften.

const KORT = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/bildkort/*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));
/** Ett bildkort som HTML, eller null om Stil inte har ritat det. @param {string} id */
const kort = (id) => KORT[id] ? `<img class="bild bildkort" data-bild="${id}" src="${KORT[id]}" alt="" draggable="false">` : null;

/** ASCII-vikning så att id:n utan å, ä, ö hittar sina ord (bar → bär). @param {string} s */
const vik = (s) => s.toLocaleLowerCase('sv-SE').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e');

import { PALETT, egenskaper } from '../karna/egenskaper.js';
import { ikon, IKON_FOR } from './ikoner.js';

/** En emoji ur ordlistan som Stil har ritat som ikon (bok, bär, karta …) visas som ikonen (beslut 31.4). @param {string | null} e */
const somIkon = (e) => (e && IKON_FOR[e] ? ikon(IKON_FOR[e], 'stor') : e);

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
  // vid vattnet (72.4): hjälten och ungen på ena stranden, byn på den andra och en prickad båge över vattnet. Bilden
  // ställer frågan (hur kommer de över?) och passar BRO, STEGE, REP och FLOTTE, men visar inget av dem
  over_vattnet: () => `<svg class="ritad" viewBox="0 0 96 64" width="1.5em" height="1em" aria-hidden="true">
    <rect x="0" y="40" width="96" height="24" fill="#3f6e9e"/><path d="M30 46 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="#8fc3e8" stroke-width="2" fill="none"/>
    <path d="M0 36 h26 l4 28 h-30 z" fill="#6f9a4a"/><path d="M96 36 h-26 l-4 28 h30 z" fill="#6f9a4a"/>
    <rect x="8" y="22" width="6" height="14" rx="2" fill="#2e8bd8"/><circle cx="11" cy="19" r="4" fill="#c9ccd2"/>
    <ellipse cx="20" cy="33" rx="5" ry="3.5" fill="#5fae6a"/>
    <path d="M74 26 l6 -6 l6 6 v10 h-12 z" fill="#b08a58"/><path d="M84 30 l4 -4 l4 4 v6 h-8 z" fill="#9a7a4e"/>
    <path d="M24 30 Q48 -2 72 30" stroke="#f2c14e" stroke-width="2.5" stroke-dasharray="3 4" fill="none" stroke-linecap="round"/>
  </svg>`,
});

/** @param {any} ordlistor @param {Record<string, string>} [platshallare] äventyrets egna bild-id → emoji */
export function skapaBilder(ordlistor, platshallare = {}) {
  EXTRA = platshallare;
  /** @type {Map<string, string>} */
  const emoji = new Map();
  for (const o of ordlistor.ord) if (o.bild) emoji.set(vik(o.ord), o.bild);
  const hitta = (/** @type {string} */ id) => RITADE[vik(id)]?.() || somIkon(emoji.get(vik(id)) ?? null) || somIkon(EXTRA[id] ?? null) || null;

  /**
   * HTML för en platshållarbild.
   * @param {string} id t.ex. "tankebubbla_filt", "stor_rod", "hog_rund_sten", "filt_rod"
   * @returns {string}
   */
  function html(id) {
    const delar = id.split('_');
    if (delar[0] === 'tankebubbla') {
      const e = kort(delar.slice(1).join('_')) || hitta(delar.slice(1).join('_')) || '❔';
      return `<span class="bild bubbla" data-bild="${id}"><span class="bubbla-ytter">${e}</span><span class="bubbla-prick"></span></span>`;
    }
    const k = kort(id); if (k) return k;
    if (RITADE[id]) return `<span class="bild emoji" data-bild="${id}" style="font-size:calc(64px * var(--t))">${RITADE[id]()}</span>`;
    if (EXTRA[id]) return `<span class="bild emoji" data-bild="${id}">${somIkon(EXTRA[id])}</span>`;
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
