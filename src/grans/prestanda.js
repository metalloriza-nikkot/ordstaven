// @ts-check
// Bevakar hur jämnt spelet ritas, för loggen: varje gång en bildruta tar mer än 100 ms (det syns som ett hack)
// skrivs en rad med vad som pågick. Hack inom samma sekund blir en rad. Långa JavaScript-uppgifter räknas för sig,
// så att loggen visar om hacket kom från koden eller från ritningen (datorn ritar utan grafikkort).
// Var 30:e sekund skrivs en sammanfattning, men bara om mer än en av tio bildrutor var långsam (under 30 per sekund).

/**
 * @param {{ logg: { handelse(t: string, m: string, d?: any): void }, sammanhang: () => Record<string, any>,
 *           grans?: number }} opt
 *   sammanhang = vad som pågår just nu (scen, steg, läsplattan, rum), läses när ett hack skrivs
 */
export function bevakaBildrutor({ logg, sammanhang, grans = 100 }) {
  let forra = performance.now();
  /** @type {{ t0: number, n: number, max: number, js: number, data: Record<string, any> } | null} */
  let hack = null;
  let langaUppgifter = 0, langaMs = 0;
  // sammanfattningen: bildrutor och långsamma bildrutor sedan förra
  let antal = 0, langsamma = 0, summa = 0, t30 = forra;
  try {
    new PerformanceObserver((lista) => { for (const e of lista.getEntries()) { langaUppgifter++; langaMs += e.duration; } }).observe({ type: 'longtask', buffered: false });
  } catch (e) { /* webbläsaren saknar longtask (Safari) */ }

  const skriv = () => {
    if (!hack) return;
    logg.handelse('hack', `${hack.n} ${hack.n === 1 ? 'bildruta' : 'bildrutor'} över ${grans} ms, längst ${Math.round(hack.max)} ms`, { ...hack.data, js_ms: Math.round(hack.js) });
    hack = null;
  };
  // en dold flik ritas inte: pausen räknas inte som hack
  document.addEventListener('visibilitychange', () => { forra = performance.now(); });

  const tick = (/** @type {number} */ nu) => {
    const d = nu - forra; forra = nu;
    if (!document.hidden) {
      antal++; summa += d; if (d > 34) langsamma++;
      if (d > grans) {
        const js = langaMs; langaMs = 0;
        if (hack && nu - hack.t0 < 1000) { hack.n++; hack.max = Math.max(hack.max, d); hack.js += js; }
        else { skriv(); let data = {}; try { data = sammanhang(); } catch (e) { /* får inte stoppa bevakningen */ } hack = { t0: nu, n: 1, max: d, js, data }; }
      }
    }
    if (hack && nu - hack.t0 >= 1000) skriv();
    if (nu - t30 >= 30000) {
      if (antal && langsamma / antal > 0.1) {
        logg.handelse('bildrutor', `${Math.round((1000 * antal) / summa)} per sekund, ${Math.round((100 * langsamma) / antal)} % långsamma`, { langa_uppgifter: langaUppgifter });
      }
      antal = 0; langsamma = 0; summa = 0; langaUppgifter = 0; t30 = nu;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
