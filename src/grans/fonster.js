// @ts-check
// Appens fönster (beslut 39.5). I det installerade spelet på en dator ska fönstret vara minst 762 punkter högt
// inuti, så att textremsan ryms under spelytan vid 3×. Chrome kommer ihåg appfönstrets storlek, men ett nytt
// eller mindre fönster görs högre en gång när spelet startar (bara på startskärmen, aldrig mitt i spelet).
// Fönstret blir aldrig högre än skärmen, och det flyttas upp bara om det annars skulle gå utanför skärmen.

/** Minsta höjd inuti appens fönster (CSS-punkter): fönstret där spelaren spelade, och remsan ryms vid 3×. */
export const APP_MIN_HOJD = 762;

/**
 * Räknar ut om och hur appens fönster ska ändras. Ren funktion, så att den går att testa.
 * @param {{ installerad: boolean, helskarm: boolean, pek: boolean, inreHojd: number, yttreHojd: number,
 *   yttreBredd: number, x: number, y: number, skarmTopp: number, skarmHojd: number }} f
 * @param {number} [minHojd]
 * @returns {{ andra: false, varfor: string } | { andra: true, hojd: number, bredd: number, flyttaTill: number | null, nyInreHojd: number, rackerInte: boolean }}
 */
export function planeraFonster(f, minHojd = APP_MIN_HOJD) {
  if (!f.installerad) return { andra: false, varfor: 'i en flik' };
  if (f.helskarm) return { andra: false, varfor: 'helskärm' };
  if (f.pek) return { andra: false, varfor: 'pekskärm' };
  if (f.inreHojd >= minHojd) return { andra: false, varfor: 'högt nog' };
  const ram = Math.max(0, f.yttreHojd - f.inreHojd); // titelraden
  const maxYttre = f.skarmHojd;
  const hojd = Math.min(minHojd + ram, maxYttre);
  if (hojd <= f.yttreHojd) return { andra: false, varfor: 'skärmen räcker inte' };
  const nederkant = f.skarmTopp + f.skarmHojd;
  const flyttaTill = f.y + hojd > nederkant ? Math.max(f.skarmTopp, nederkant - hojd) : null;
  const nyInreHojd = hojd - ram;
  return { andra: true, hojd, bredd: f.yttreBredd, flyttaTill, nyInreHojd, rackerInte: nyInreHojd < minHojd };
}

/**
 * Gör appens fönster minst {@link APP_MIN_HOJD} punkter högt inuti, en gång när spelet startar.
 * @param {{ logg?: { handelse(t: string, m: string, d?: any): void } }} [opt]
 */
export function sakraAppfonster({ logg } = {}) {
  const mm = (/** @type {string} */ q) => window.matchMedia(q).matches;
  const s = /** @type {any} */ (window.screen);
  const f = {
    installerad: mm('(display-mode: standalone)') || mm('(display-mode: minimal-ui)') || mm('(display-mode: window-controls-overlay)'),
    helskarm: mm('(display-mode: fullscreen)'),
    pek: mm('(pointer: coarse)'),
    inreHojd: window.innerHeight,
    yttreHojd: window.outerHeight,
    yttreBredd: window.outerWidth,
    x: window.screenX,
    y: window.screenY,
    skarmTopp: typeof s.availTop === 'number' ? s.availTop : 0,
    skarmHojd: s.availHeight || s.height || window.outerHeight,
  };
  const plan = planeraFonster(f);
  if (!plan.andra) {
    if (f.installerad && logg) logg.handelse('fönster', `appens fönster ändras inte (${plan.varfor})`, { inre: `${window.innerWidth}×${f.inreHojd}`, skarm: f.skarmHojd });
    return plan;
  }
  try {
    if (plan.flyttaTill !== null) window.moveTo(f.x, plan.flyttaTill);
    window.resizeTo(plan.bredd, plan.hojd);
  } catch (e) { /* webbläsaren tillåter det inte */ }
  // Webbläsaren kan säga nej utan fel. Loggen skriver hur det gick, så att det syns i MacBookens logg.
  setTimeout(() => {
    if (logg) logg.handelse('fönster', window.innerHeight >= APP_MIN_HOJD ? 'appens fönster är högre' : 'appens fönster kunde inte bli högt nog',
      { fore: f.inreHojd, efter: window.innerHeight, skarm: f.skarmHojd, rackerInte: plan.rackerInte });
  }, 500);
  return plan;
}
