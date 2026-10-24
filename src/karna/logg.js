// @ts-check
// Felsökningslogg, porterad från TURBO-RACE (00_log.js). Ringbuffert med händelser,
// sparas löpande så att förra sessionens logg finns kvar även om webbläsaren stängdes.
// Inga globaler: lagring, klocka och version kommer in som argument.
// Webbläsarkopplingen (fel, Ctrl+Skift+L, nedladdning) finns i src/grans/loggDom.js.

/**
 * @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }} Lagring
 */

/**
 * @param {{ lagring: Lagring, version: string, klocka?: () => Date, max?: number, nyckel?: string }} opt
 */
export function skapaLogg({ lagring, version, klocka = () => new Date(), max = 500, nyckel = 'ordstaven_logg' }) {
  const start = klocka().toISOString();
  /** @type {[string, string, string, string][]} */
  const buf = [];
  /** @type {string[]} */
  const tangenter = [];
  /** @type {Map<string, () => any>} delar av ögonblicksbilden, registreras av modulerna */
  const delar = new Map();
  let fel = 0, smutsig = false;
  /** @type {any} */
  let forra = null;
  try { const g = JSON.parse(lagring.getItem(nyckel) || 'null'); if (g && Array.isArray(g.buf) && g.buf.length) forra = g; } catch (e) { /* trasig logg ignoreras */ }

  const tid = (ms = true) => {
    const d = klocka(), p = (/** @type {number} */ n, l = 2) => String(n).padStart(l, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` + (ms ? '.' + p(d.getMilliseconds(), 3) : '');
  };

  const logg = {
    /** @param {string} typ @param {string} text @param {any} [data] */
    handelse(typ, text, data) {
      try {
        let d = '';
        if (data !== undefined) { try { d = typeof data === 'string' ? data : JSON.stringify(data); } catch (e) { d = String(data); } }
        if (d.length > 300) d = d.slice(0, 300) + '…';
        buf.push([tid(), typ, text, d]);
        if (buf.length > max) buf.splice(0, buf.length - max);
        if (typ === 'FEL') fel++;
        smutsig = true;
      } catch (e) { /* loggen får aldrig krascha spelet */ }
    },
    /** @param {string} kod */
    tangent(kod) { tangenter.push(tid(false) + ' ' + kod); if (tangenter.length > 60) tangenter.shift(); },
    /** Registrera en del av ögonblicksbilden. @param {string} namn @param {() => any} fn */
    registrera(namn, fn) { delar.set(namn, fn); },
    ogonblick() {
      /** @type {Record<string, any>} */
      const o = { tid: klocka().toISOString(), version };
      for (const [namn, fn] of delar) { try { o[namn] = fn(); } catch (e) { o[namn] = 'fel: ' + String(e); } }
      return o;
    },
    /** Spara till lagringen om något har hänt. Sparar bara de senaste 300 händelserna (delad kvot). */
    spara(tvinga = false) {
      if (!smutsig && !tvinga) return;
      smutsig = false;
      try { lagring.setItem(nyckel, JSON.stringify({ start, version, buf: buf.slice(-300), tangenter, ogonblick: logg.ogonblick() })); } catch (e) { /* full lagring: hoppa över */ }
    },
    text() {
      const L = [`ORDSTAVEN ${version} – felsökningslogg`, `Exporterad: ${klocka().toISOString()}`, `Sessionen startade: ${start} · fel i sessionen: ${fel}`, ''];
      L.push('== TILLSTÅND JUST NU ==', JSON.stringify(logg.ogonblick(), null, 2), '', '== HÄNDELSER (nyast sist) ==');
      for (const [t, k, m, d] of buf) L.push(`${t}  [${k}] ${m}${d ? '  ' + d : ''}`);
      L.push('', '== SENASTE TANGENTER ==', tangenter.join(' | ') || '(inga)');
      if (forra) {
        L.push('', `== FÖRRA SESSIONEN (startade ${forra.start}, ${forra.version || ''}) ==`);
        if (forra.ogonblick) L.push('Sista tillstånd:', JSON.stringify(forra.ogonblick, null, 2));
        for (const [t, k, m, d] of forra.buf || []) L.push(`${t}  [${k}] ${m}${d ? '  ' + d : ''}`);
      }
      return L.join('\n');
    },
    get antal() { return buf.length; },
    get fel() { return fel; },
  };
  return logg;
}
