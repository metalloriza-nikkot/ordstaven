// @ts-check
// Placerar pixelvärlden i fönstret med heltalsskala (fysiska pixlar). Ramen fyller resten.
// På pekskärm ligger rummet överst så att ramen nertill blir plats för bokstavstangentbordet.
import { beraknaSkala, TANGENTBORD_HOJD } from '../karna/skalning.js';

/**
 * @param {{ varld: HTMLElement, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 */
export function skapaLayout({ varld, logg }) {
  const pek = window.matchMedia('(pointer: coarse)');
  /** @type {ReturnType<typeof beraknaSkala>} */
  let skala = beraknaSkala({ bredd: 320, hojd: 192 });
  /** @type {Set<(s: typeof skala) => void>} */
  const lyssnare = new Set();

  function uppdatera() {
    const dpr = window.devicePixelRatio || 1;
    const s = beraknaSkala({ bredd: window.innerWidth, hojd: window.innerHeight, dpr, reservNere: pek.matches ? TANGENTBORD_HOJD : 0 });
    if (pek.matches) s.topp = 0;
    skala = s;
    const r = document.documentElement.style;
    r.setProperty('--rum-vanster', s.vanster + 'px');
    r.setProperty('--rum-topp', s.topp + 'px');
    r.setProperty('--rum-bredd', s.cssBredd + 'px');
    r.setProperty('--rum-hojd', s.cssHojd + 'px');
    varld.dataset.skala = String(s.fysisk);
    if (logg) logg.handelse('skärm', `skala ${s.fysisk} (fysisk)`, { fonster: `${window.innerWidth}×${window.innerHeight}`, dpr });
    for (const f of lyssnare) f(s);
  }

  uppdatera();
  window.addEventListener('resize', uppdatera);
  window.addEventListener('orientationchange', uppdatera);
  // Ändrad dpr (fönstret flyttas till en annan skärm, eller zoom)
  const bevakaDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => { uppdatera(); bevakaDpr(); }, { once: true });
  };
  try { bevakaDpr(); } catch (e) { /* äldre webbläsare */ }

  return {
    get skala() { return skala; },
    /** @param {(s: typeof skala) => void} f */
    vidAndring(f) { lyssnare.add(f); },
    uppdatera,
  };
}
