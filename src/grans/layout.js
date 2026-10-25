// @ts-check
// Placerar pixelvärlden i fönstret med heltalsskala (fysiska pixlar). Ramen fyller resten.
// Skrivläget: när skärmtangentbordet visas hålls plats nertill, rummet krymper ett steg och glider upp.
// Textskalan --t växer med rummet; stilguidens mått (48 punkter vid ett 960 punkter brett rum) är minimum.
import { beraknaSkala } from '../karna/skalning.js';

/** Rumsbredd där stilguidens textmått gäller. */
const TEXT_BAS = 960;

/**
 * @param {{ varld: HTMLElement, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 */
export function skapaLayout({ varld, logg }) {
  /** @type {ReturnType<typeof beraknaSkala>} */
  let skala = beraknaSkala({ bredd: 320, hojd: 192 });
  let reserv = 0;
  /** @type {Set<(s: typeof skala) => void>} */
  const lyssnare = new Set();

  function uppdatera() {
    const dpr = window.devicePixelRatio || 1;
    const s = beraknaSkala({ bredd: window.innerWidth, hojd: window.innerHeight, dpr, reservNere: reserv });
    skala = s;
    const r = document.documentElement.style;
    r.setProperty('--rum-vanster', s.vanster + 'px');
    r.setProperty('--rum-topp', s.topp + 'px');
    r.setProperty('--rum-bredd', s.cssBredd + 'px');
    r.setProperty('--rum-hojd', s.cssHojd + 'px');
    r.setProperty('--reserv', reserv + 'px');
    r.setProperty('--t', String(Math.max(1, Math.min(2.4, s.cssBredd / TEXT_BAS))));
    varld.dataset.skala = String(s.fysisk);
    if (logg) logg.handelse('skärm', `skala ${s.fysisk} (fysisk)`, { fonster: `${window.innerWidth}×${window.innerHeight}`, dpr, reserv });
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
    /** Plats nertill för skärmtangentbordet (0 = ingen). @param {number} px */
    sattReserv(px) { if (px !== reserv) { reserv = px; uppdatera(); } },
    uppdatera,
  };
}
