// @ts-check
// Kopplar webbläsarens tangent- och pekhändelser till inmatningslagret (src/karna/inmatning.js).
import { skarmTillVarld } from '../karna/skalning.js';

/**
 * @param {{ inmatning: ReturnType<typeof import('../karna/inmatning.js').skapaInmatning>,
 *           layout: { readonly skala: ReturnType<typeof import('../karna/skalning.js').beraknaSkala> },
 *           yta: HTMLElement, logg?: { tangent(k: string): void, handelse(t: string, m: string, d?: any): void },
 *           kamera?: () => import('../karna/skalning.js').Kamera }} opt
 * kamera = kamerans läge: ett tryck på skärmen blir en punkt i världen (beslut 14)
 */
export function kopplaInmatning({ inmatning, layout, yta, logg, kamera = () => ({ x: 0, y: 0 }) }) {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // genvägar (Ctrl+Skift+L m.fl.) hanteras på annat håll
    if (logg) logg.tangent(e.code);
    if (inmatning.tangentNer(e.code, e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => inmatning.tangentUpp(e.code));
  window.addEventListener('blur', () => inmatning.slappAllt());
  document.addEventListener('visibilitychange', () => { if (document.hidden) inmatning.slappAllt(); });

  // Tryck och klick. Pekpenna, finger och mus behandlas lika. Bara tryck inne i rummet räknas.
  yta.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    const p = skarmTillVarld(layout.skala, kamera(), e.clientX, e.clientY);
    if (!p.inne) return;
    e.preventDefault();
    inmatning.tryck(p.x, p.y);
    if (logg) logg.handelse('tryck', `${Math.round(p.x)},${Math.round(p.y)}`, e.pointerType);
  });

  // iPad: ingen zoom med två fingrar, ingen dubbeltryckszoom, ingen meny vid långt tryck.
  for (const typ of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) {
    document.addEventListener(typ, (e) => e.preventDefault(), { passive: false });
  }
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}
