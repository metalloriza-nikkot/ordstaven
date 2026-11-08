// @ts-check
// Pausmenyns och INSTÄLLNINGARs bilder (F4, 10e v0.4, inkorgens ui/meny/): panelen och papperskorten, fönstren och
// knapparna i 9-slice, volymknapparna och markören. Allt mäts i världens pixlar och skalas med --vpx (layout.js).

const MENY = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/ui/meny/*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));

/** En bild ur ui/meny/ som URL, eller null. @param {string} namn */
export const menyBild = (namn) => MENY[namn] ?? null;

/**
 * Läge och storlek i världens pixlar som inline-stil. @param {number} x @param {number} y @param {number} [b] @param {number} [h]
 */
export const vlage = (x, y, b, h) => `left:calc(${x} * var(--vpx));top:calc(${y} * var(--vpx))${b ? `;width:calc(${b} * var(--vpx))` : ''}${h ? `;height:calc(${h} * var(--vpx))` : ''}`;

/**
 * Bilderna i 9-slice som CSS-variabler (fönstren och knapparna i INSTÄLLNINGAR), så att stilmallen kan använda dem
 * i border-image. @param {HTMLElement} rot
 */
export function satt9slice(rot) {
  for (const n of ['fonster9', 'fonster9_rubrik', 'knapp9', 'knapp9_pa', 'paus_kort']) {
    const u = menyBild(n);
    if (u) rot.style.setProperty(`--${n.replace('_', '-')}`, `url("${u}")`);
  }
}
