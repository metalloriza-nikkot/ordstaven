// @ts-check
// Farfars karta (Stil 21:20): ett gammalt papper rivet i sju bitar som passar ihop. Varje bit är en egen bild i
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
  return `<span class="karta-bitar" data-bitar="${bitar.map((b) => b.n).join(',')}" style="width:${px(bredd)};height:${px(hojd)}">${imgs}</span>`;
}
