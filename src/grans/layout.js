// @ts-check
// Placerar pixelvärlden i fönstret med heltalsskala (fysiska pixlar). Ramen fyller resten.
// Skrivläget: när skärmtangentbordet visas hålls plats nertill, rummet krymper ett steg och glider upp.
// Textskalan --t växer med rummet; stilguidens mått (48 punkter vid ett 960 punkter brett rum) är minimum.
import { beraknaSkala, beraknaSkalaMedRemsa, textskala } from '../karna/skalning.js';

/**
 * @param {{ varld: HTMLElement, logg?: { handelse(t: string, m: string, d?: any): void } }} opt
 */
export function skapaLayout({ varld, logg }) {
  /** @type {ReturnType<typeof beraknaSkalaMedRemsa>} */
  let skala = { ...beraknaSkala({ bredd: 320, hojd: 192 }), remsa: 0 };
  let reserv = 0;
  /** @type {Set<(s: typeof skala) => void>} */
  const lyssnare = new Set();

  function uppdatera() {
    const dpr = window.devicePixelRatio || 1;
    // Texten under spelytan (36.2) när fönstret har plats, utom i skrivläget, där tangentbordet tar platsen nertill
    const s = reserv ? { ...beraknaSkala({ bredd: window.innerWidth, hojd: window.innerHeight, dpr, reservNere: reserv }), remsa: 0 }
      : beraknaSkalaMedRemsa({ bredd: window.innerWidth, hojd: window.innerHeight, dpr });
    skala = s;
    document.documentElement.classList.toggle('text-under', s.remsa > 0);
    document.documentElement.style.setProperty('--remsa', s.remsa + 'px');
    const r = document.documentElement.style;
    r.setProperty('--rum-vanster', s.vanster + 'px');
    r.setProperty('--rum-topp', s.topp + 'px');
    r.setProperty('--rum-bredd', s.cssBredd + 'px');
    r.setProperty('--rum-hojd', s.cssHojd + 'px');
    r.setProperty('--reserv', reserv + 'px');
    const t = textskala(s.cssBredd);
    r.setProperty('--t', String(t));
    // bildkorten (48 × 48 pixlar) skalas i hela steg i fysiska pixlar, så nära emojins storlek (64 punkter × t) som det går
    r.setProperty('--kort', (Math.max(1, Math.round((64 * t * dpr) / 48)) * 48) / dpr + 'px');
    // expeditionsbokens bilder (110 × 70) i bokbildens ruta (220 × 140 × t), i hela steg i fysiska pixlar (10f)
    const bokSteg = Math.max(1, Math.round((220 * t * dpr) / 110));
    r.setProperty('--bokbild-b', (bokSteg * 110) / dpr + 'px');
    r.setProperty('--bokbild-h', (bokSteg * 70) / dpr + 'px');
    // ikonerna (16 × 16) och HUD:ens knappar (24 × 24) i hela steg i fysiska pixlar (10d). En pixel i CSS-punkter:
    const steg = (/** @type {number} */ mal, /** @type {number} */ px, min = 1) => Math.max(min, Math.round((mal * dpr) / px)) / dpr;
    r.setProperty('--ipx-text', steg(40 * t, 16) + 'px'); // i en rad med text i 40 punkter
    r.setProperty('--ipx-stor', steg(96 * t, 16) + 'px'); // festen och pausmenyn
    r.setProperty('--ipx-figur', steg(168 * t, 24) + 'px'); // startskärmens hjälte och unge (24 pixlar höga) ca 168 punkter
    r.setProperty('--ipx-figur-liten', steg(72 * t, 24) + 'px'); // spelarkorten
    r.setProperty('--vpx', s.cssSkala + 'px'); // en av världens pixlar (dörrskyltarnas trä)
    // HUD:en står i ramen till höger när den är minst 48 punkter bred (beslut 33.2), annars i rummets hörn som förut
    const ram = Math.max(0, window.innerWidth - (s.vanster + s.cssBredd));
    const minK = Math.ceil((48 * dpr) / 24);
    let k = Math.max(minK, Math.round((64 * t * dpr) / 24));
    const iRamen = ram >= 48;
    if (iRamen) k = Math.max(minK, Math.min(k, Math.floor(((ram - 8) * dpr) / 24)));
    r.setProperty('--hudpx', k / dpr + 'px');
    r.setProperty('--hud', (24 * k) / dpr + 'px');
    r.setProperty('--ram-hoger', ram + 'px');
    document.documentElement.classList.toggle('hud-i-ramen', iRamen);
    varld.dataset.skala = String(s.fysisk);
    if (logg) logg.handelse('skärm', `skala ${s.fysisk} (fysisk)`, { fonster: `${window.innerWidth}×${window.innerHeight}`, dpr, reserv, text: s.remsa ? 'under' : 'över' });
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
