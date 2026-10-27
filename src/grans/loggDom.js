// @ts-check
// Felsökningsloggens koppling till webbläsaren: fel fångas, loggen sparas löpande,
// Ctrl+Skift+L sparar loggen som fil och kopierar den (som i TURBO-RACE).

/** @param {ReturnType<typeof import('../karna/logg.js').skapaLogg>} logg */
export function kopplaLogg(logg) {
  window.addEventListener('error', (e) => {
    logg.handelse('FEL', e.message || 'okänt fel', { fil: (e.filename || '').split('/').pop(), rad: e.lineno, kol: e.colno, stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 600) : '' });
    logg.spara(true);
  });
  window.addEventListener('unhandledrejection', (e) => logg.handelse('FEL', 'promise: ' + ((e.reason && e.reason.message) || e.reason)));
  setInterval(() => logg.spara(), 4000);
  window.addEventListener('pagehide', () => logg.spara(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) logg.spara(true); });

  logg.registrera('miljo', () => ({
    fonster: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    installerad: window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches,
    pek: window.matchMedia('(pointer: coarse)').matches,
    grafik: grafikkort(),
    webblasare: navigator.userAgent,
  }));

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyL') { e.preventDefault(); exportera(logg); }
  });
}

/** @param {ReturnType<typeof import('../karna/logg.js').skapaLogg>} logg */
export function exportera(logg) {
  logg.handelse('logg', 'exporterad');
  const txt = logg.text();
  const d = new Date(), p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const namn = `ordstaven-logg-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`;
  let sparad = false;
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = namn; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    sparad = true;
  } catch (e) { /* ok */ }
  try { navigator.clipboard && navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) { /* ok */ }
  meddelande(sparad ? `Loggen sparad: ${namn} (finns i Hämtade filer och är kopierad)` : 'Loggen är kopierad');
  return txt;
}

/** Kort meddelande till den vuxne (inte spelartext). @param {string} text */
function meddelande(text) {
  let el = document.getElementById('logg-meddelande');
  if (!el) {
    el = document.createElement('div'); el.id = 'logg-meddelande';
    document.body.appendChild(el);
  }
  el.textContent = text; el.style.display = 'block';
  clearTimeout(/** @type {any} */ (el).__t);
  /** @type {any} */ (el).__t = setTimeout(() => { if (el) el.style.display = 'none'; }, 4500);
}

/** @type {string | null} */
let gpu = null;
/**
 * Vilket grafikkort webbläsaren använder ("SwiftShader" = ingen grafikacceleration). Frågas en gång: ett nytt
 * WebGL-sammanhang är dyrt, och ett tomt svar fick förut frågan att göras om vid varje ögonblicksbild av loggen.
 */
function grafikkort() {
  if (gpu !== null) return gpu;
  gpu = 'okänt';
  try {
    const c = document.createElement('canvas');
    const gl = /** @type {WebGLRenderingContext | null} */ (c.getContext('webgl'));
    if (!gl) return (gpu = 'ingen webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || 'webgl (okänt kort)';
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { gpu = 'okänt'; }
  return gpu;
}
