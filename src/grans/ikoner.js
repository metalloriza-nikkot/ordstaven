// @ts-check
// Stils ikoner och HUD (assets/ui/, 10d *HUD:en och dörrskyltarna*): inga emoji i spelet (beslut 31.4).
// Ikonerna är 16 × 16 pixlar och visas i textlagret i hela pixelsteg (fysiska pixlar), med image-rendering: pixelated.
// Storleken sätts med CSS-variabler (grans/layout.js): --ipx-text (i en rad med text), --ipx-stor (festen, pausmenyn)
// och --hudpx (HUD:ens knappar). Siffror och ord står alltid i Lexend, aldrig i bilderna.

const UI = /** @type {Record<string, string>} */ (Object.fromEntries(Object.entries(
  /** @type {Record<string, string>} */ (import.meta.glob('../../assets/ui/*.png', { query: '?url', import: 'default', eager: true })),
).map(([fil, url]) => [/** @type {string} */ (fil.split('/').pop()).replace(/\.png$/, ''), url])));

/** En bild ur assets/ui/ som URL, eller null. @param {string} namn t.ex. "hud_knapp", "ikon_bar" */
export const uiBild = (namn) => UI[namn] ?? null;

/**
 * En ikon som HTML (`<img>`), eller '' om Stil inte har ritat den.
 * @param {string} namn ikonens namn utan `ikon_` (bar, nos, lapp, radio, paus, hogtalare, hand, stjarna, glitter, bok,
 *   dinobok, karta, ryggsack, klader, fram, bak, klar, igen)
 * @param {'text' | 'stor' | 'hud'} [storlek] text = i en rad med text, stor = festen och pausmenyn, hud = HUD:ens knappar
 */
export function ikon(namn, storlek = 'text') {
  const u = UI['ikon_' + namn];
  return u ? `<img class="ikon-px ikon-${storlek}" data-ikon="${namn}" src="${u}" alt="" draggable="false">` : '';
}

/** Emoji som festen och knapparna fick förut → Stils ikon (beslut 31.4). */
export const IKON_FOR = /** @type {Record<string, string>} */ ({
  '🫐': 'bar', '👃': 'nos', '📜': 'lapp', '📻': 'radio', '🔊': 'hogtalare', '✋': 'hand', '⭐': 'stjarna', '★': 'stjarna',
  '✨': 'glitter', '📖': 'bok', '🦕': 'dinobok', '🗺️': 'karta', '🎒': 'ryggsack', '👑': 'klader', '▶': 'fram', '◀': 'bak', '✓': 'klar', '↺': 'igen',
});

/**
 * Dörrskyltens trä i ett stycke (9 × 10): vänster kant 4, mitten 1 och höger kant 4 pixlar, så att det kan läggas som
 * border-image (9-slice) på skyltens element. Sätter --skylt9 på dokumentet när bilderna har laddats.
 */
export function laddaSkyltTra() {
  const delar = ['skylt_vagg_vanster', 'skylt_vagg_mitt', 'skylt_vagg_hoger'].map((n) => UI[n]);
  if (delar.some((d) => !d)) return;
  const bilder = delar.map((src) => { const i = new Image(); i.src = /** @type {string} */ (src); return i; });
  Promise.all(bilder.map((i) => (i.complete ? Promise.resolve() : new Promise((k) => { i.onload = k; i.onerror = k; })))).then(() => {
    const c = document.createElement('canvas'); c.width = 9; c.height = 10;
    const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    g.imageSmoothingEnabled = false;
    g.drawImage(bilder[0], 0, 0); g.drawImage(bilder[1], 4, 0); g.drawImage(bilder[2], 5, 0);
    try { document.documentElement.style.setProperty('--skylt9', `url(${c.toDataURL('image/png')})`); } catch (e) { /* ingen canvas: skylten får en enkel kant */ }
  });
}
