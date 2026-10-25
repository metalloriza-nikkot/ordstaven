// @ts-check
// Platshållarbilder för gråboxen: emoji från ordlistorna och enkla former (färg, storlek, höjd).
// Ersätts av stilspårets grafik. Ingen text i bilderna: en bild som visar ett ord skulle lösa läsuppgiften.

/** ASCII-vikning så att id:n utan å, ä, ö hittar sina ord (bar → bär). @param {string} s */
const vik = (s) => s.toLocaleLowerCase('sv-SE').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e');

const FARGER = { rod: '#b8382f', bla: '#3f6fb8', gul: '#f0cf4a', gron: '#4f9a4a', vit: '#eeeae0' };
const EXTRA = /** @type {Record<string, string>} */ ({
  tallrik: '🍽️', fotter: '🦶', dal_i_moln: '🏞️', ordtradet: '🌳', unge_farfar_med_dino: '🧒', unge_farfar_far_agg: '🥚',
  karta_sju_bitar: '🗺️', farfars_lista_sista_raden: '📜', buske: '🌳', trad: '🌲',
});

/** @param {any} ordlistor */
export function skapaBilder(ordlistor) {
  /** @type {Map<string, string>} */
  const emoji = new Map();
  for (const o of ordlistor.ord) if (o.bild) emoji.set(vik(o.ord), o.bild);
  const hitta = (/** @type {string} */ id) => emoji.get(vik(id)) || EXTRA[id] || null;

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
    const stor = delar.includes('stor') ? 1.35 : delar.includes('liten') ? 0.7 : 1;
    const hog = delar.includes('hog') ? 1.5 : delar.includes('lag') ? 0.6 : 1;
    const bas = delar.find((d) => !(d in FARGER) && !['stor', 'liten', 'hog', 'lag', 'rund', 'spetsig', 'gammalt', 'ungt', 'litet', 'stort'].includes(d)) || 'lada';
    const e = hitta(bas);
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
