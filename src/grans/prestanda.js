// @ts-check
// Bevakar hur jämnt spelet ritas, för loggen: varje gång en bildruta tar mer än 100 ms (det syns som ett hack)
// skrivs en rad med vad som pågick. Hack inom samma sekund blir en rad. Långa JavaScript-uppgifter räknas för sig,
// så att loggen visar om hacket kom från koden eller från ritningen (datorn ritar utan grafikkort).
// Var 30:e sekund skrivs en sammanfattning, men bara om mer än en av tio bildrutor var långsam (under 30 per sekund).
// På golvdatorn (canvas, `golv: true`) skrivs sammanfattningen alltid, med hur ofta och hur länge världen ritades och
// hur stor del av tiden läsplattan var öppen (2c). Då syns om tiden går till duken eller till textlagret ovanpå.

/**
 * @param {{ logg: { handelse(t: string, m: string, d?: any): void }, sammanhang: () => Record<string, any>,
 *           grans?: number, golv?: boolean, plattaOppen?: () => boolean }} opt
 *   sammanhang = vad som pågår just nu (scen, steg, läsplattan, rum), läses när ett hack skrivs
 * @returns {{ ritad(ms: number): void }} ritad = världen ritades på så många millisekunder (anropas av den som ritar)
 */
export function bevakaBildrutor({ logg, sammanhang, grans = 100, golv = false, plattaOppen = () => false }) {
  let forra = performance.now();
  /** @type {{ t0: number, n: number, max: number, js: number, data: Record<string, any> } | null} */
  let hack = null;
  let langaUppgifter = 0, langaMs = 0;
  // sammanfattningen: bildrutor och långsamma bildrutor sedan förra
  let antal = 0, langsamma = 0, summa = 0, t30 = forra;
  // golvdatorn: hur många gånger världen ritades, hur länge, och bildrutorna med läsplattan öppen
  let ritAntal = 0, ritSumma = 0, ritMax = 0, medPlatta = 0, langsammaMedPlatta = 0;
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
      if (golv && plattaOppen()) { medPlatta++; if (d > 34) langsammaMedPlatta++; }
      if (d > grans) {
        const js = langaMs; langaMs = 0;
        if (hack && nu - hack.t0 < 1000) { hack.n++; hack.max = Math.max(hack.max, d); hack.js += js; }
        else { skriv(); let data = {}; try { data = sammanhang(); } catch (e) { /* får inte stoppa bevakningen */ } hack = { t0: nu, n: 1, max: d, js, data }; }
      }
    }
    if (hack && nu - hack.t0 >= 1000) skriv();
    if (nu - t30 >= 30000) {
      if (antal && golv) {
        let data = {}; try { data = sammanhang(); } catch (e) { /* får inte stoppa bevakningen */ }
        logg.handelse('golvet', `${Math.round((1000 * antal) / summa)} per sekund, ${Math.round((100 * langsamma) / antal)} % långsamma, världen ritad ${Math.round((1000 * ritAntal) / summa)} gånger per sekund på ${ritAntal ? (ritSumma / ritAntal).toFixed(1) : 0} ms (längst ${Math.round(ritMax)} ms)`, {
          platta: `${Math.round((100 * medPlatta) / antal)} % av tiden, ${medPlatta ? Math.round((100 * langsammaMedPlatta) / medPlatta) : 0} % långsamma då`,
          langa_uppgifter: langaUppgifter, scen: /** @type {any} */ (data).scen,
        });
      } else if (antal && langsamma / antal > 0.1) {
        logg.handelse('bildrutor', `${Math.round((1000 * antal) / summa)} per sekund, ${Math.round((100 * langsamma) / antal)} % långsamma`, { langa_uppgifter: langaUppgifter });
      }
      antal = 0; langsamma = 0; summa = 0; langaUppgifter = 0; t30 = nu;
      ritAntal = 0; ritSumma = 0; ritMax = 0; medPlatta = 0; langsammaMedPlatta = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return { ritad(ms) { ritAntal++; ritSumma += ms; ritMax = Math.max(ritMax, ms); } };
}
