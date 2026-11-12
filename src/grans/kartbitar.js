// @ts-check
// Farfars karta (Stil 21:20): ett gammalt papper rivet i sex bitar (beslut 83) som passar ihop. Varje bit är en egen bild i
// assets/karta/, och karta.json säger var biten ligger i hela kartan (224 × 144). Bitarna läggs ihop där de hör
// hemma, i heltalsskala (fysiska pixlar), så att pixlarna aldrig blir suddiga. En bit som Stil inte har ritat än
// visas inte (bit 3–7 är skisser).

import KARTA from '../../assets/karta/karta.json';

const BILDER = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/karta/kartbit_*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));

/** Bitarnas storlek i pixlar (bilderna är små och laddas en gång). @type {Map<string, { b: number, h: number }>} */
const STORLEK = new Map();
for (const [namn, url] of Object.entries(BILDER)) {
  const img = new Image();
  img.onload = () => STORLEK.set(namn, { b: img.naturalWidth, h: img.naturalHeight });
  img.src = url;
}
/** Kända storlekar (om bilden inte har laddats när kartan visas första gången). */
const KANDA = /** @type {Record<string, { b: number, h: number }>} */ ({ kartbit_1: { b: 87, h: 60 }, kartbit_2: { b: 111, h: 49 } });

/** Finns bilden av biten? @param {number} n */
export const harKartbit = (n) => !!BILDER[`kartbit_${n}`];

/**
 * Bitarna ihop som HTML, där de ligger i kartan. null när ingen av dem är ritad.
 * @param {number[]} nummer bitarna han har (och den han får nu)
 * @param {{ hojd: number, bredd?: number, dpr?: number }} mal hur stor bilden högst får bli (CSS-pixlar)
 * @returns {string | null}
 */
export function kartbitarHtml(nummer, mal) {
  const bitar = [...new Set(nummer)].filter(harKartbit).sort((a, b) => a - b).map((n) => {
    const namn = `kartbit_${n}`, l = /** @type {any} */ (KARTA).bitar?.[namn] ?? { x: 0, y: 0 };
    const s = STORLEK.get(namn) ?? KANDA[namn] ?? { b: 64, h: 48 };
    return { n, namn, x: l.x, y: l.y, ...s };
  });
  if (!bitar.length) return null;
  const vanster = Math.min(...bitar.map((b) => b.x)), topp = Math.min(...bitar.map((b) => b.y));
  const bredd = Math.max(...bitar.map((b) => b.x + b.b)) - vanster, hojd = Math.max(...bitar.map((b) => b.y + b.h)) - topp;
  const dpr = mal.dpr ?? (window.devicePixelRatio || 1);
  // största heltalsskala (fysiska pixlar) som ryms
  const k = Math.max(1, Math.floor(Math.min((mal.hojd * dpr) / hojd, ((mal.bredd ?? Infinity) * dpr) / bredd)));
  const px = (/** @type {number} */ v) => `${(v * k) / dpr}px`;
  const imgs = bitar.map((b) => `<img class="kartbit-bild" data-bit="${b.n}" src="${BILDER[b.namn]}" alt="" draggable="false" style="left:${px(b.x - vanster)};top:${px(b.y - topp)};width:${px(b.b)};height:${px(b.h)}">`).join('');
  return `<span class="karta-bitar" data-bitar="${bitar.map((b) => b.n).join(',')}" data-k="${k}" data-v="${vanster}" data-t="${topp}" data-dpr="${dpr}" style="width:${px(bredd)};height:${px(hojd)}">${imgs}</span>`;
}

const UNGE = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/sidovyer/kartbit_unge_*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));
/** Var ungen står i kartan (224 × 144): nosen (bildens högra kant, rad 30) på mammas skugga mitt i dalen. */
export const UNGE_PA_KARTAN = { x: 41, y: 45 };

/**
 * Ungen på kartbiten (k1s11, 10b): ungen från sidan i dubbel storlek, med nosen på mammas skugga och svansklubban som
 * viftar (två bilder, ca 250 ms var), i samma pixelsteg som kartan. Läggs ovanpå bitarna i närbilden.
 * @param {HTMLElement} bitarEl kartans `.karta-bitar` @returns {boolean} om ungen lades dit
 */
export function laggUngenPaKartan(bitarEl) {
  if (!bitarEl || !UNGE.kartbit_unge_01 || bitarEl.querySelector('.kartbit-unge')) return false;
  const k = Number(bitarEl.dataset.k), v = Number(bitarEl.dataset.v), t = Number(bitarEl.dataset.t), dpr = Number(bitarEl.dataset.dpr) || 1;
  const px = (/** @type {number} */ x) => `${(x * k) / dpr}px`;
  const stil = `left:${px(UNGE_PA_KARTAN.x - v)};top:${px(UNGE_PA_KARTAN.y - t)};width:${px(52)};height:${px(44)}`;
  const span = document.createElement('span');
  span.className = 'kartbit-unge';
  span.innerHTML = ['kartbit_unge_01', 'kartbit_unge_02'].filter((n) => UNGE[n]).map((n, i) => `<img class="kartbit-unge-bild b${i + 1}" src="${UNGE[n]}" alt="" draggable="false" style="${stil}">`).join('');
  bitarEl.appendChild(span);
  return true;
}
