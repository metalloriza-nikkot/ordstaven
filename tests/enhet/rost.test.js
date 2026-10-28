import { describe, it, expect, vi, afterEach } from 'vitest';
import { skapaRost } from '../../src/grans/rost.js';

/** En låtsad talsyntes: pratar i `ms` millisekunder, och skickar onend bara om `medSlut`. */
function falskSynt({ ms = 400, medSlut = true } = {}) {
  const s = { speaking: false, pending: false, getVoices: () => [{ lang: 'sv-SE', name: 'Alva', localService: true }], addEventListener() {}, cancel() { s.speaking = false; } };
  s.speak = (u) => {
    s.speaking = true;
    setTimeout(() => u.onstart?.(), 20);
    setTimeout(() => { s.speaking = false; if (medSlut) u.onend?.(); }, ms);
  };
  return s;
}
afterEach(() => { vi.useRealTimers(); delete globalThis.window; delete globalThis.SpeechSynthesisUtterance; });
function installera(synt) {
  globalThis.window = { speechSynthesis: synt };
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
}

describe('datorrösten', () => {
  it('löser sig när talet är klart, långt före maxtiden', async () => {
    vi.useFakeTimers();
    installera(falskSynt({ ms: 400 }));
    const logg = { handelse: vi.fn() };
    const r = skapaRost({ logg });
    let hur = null; r.saga('Det är höstlov. Du sover hos Farfar.').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(600);
    expect(hur).toBe('klar');
    expect(logg.handelse).not.toHaveBeenCalledWith('röst', 'maxtid', expect.anything());
  });
  it('kommer aldrig onend (Chrome) går spelet vidare när talsyntesen har tystnat, inte efter maxtiden', async () => {
    vi.useFakeTimers();
    installera(falskSynt({ ms: 400, medSlut: false }));
    const logg = { handelse: vi.fn() };
    const r = skapaRost({ logg });
    let hur = null; r.saga('Det är höstlov. Du sover hos Farfar.').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(1000);
    expect(hur).toBe('klar');
    expect(logg.handelse).toHaveBeenCalledWith('röst', 'slut utan onend', expect.any(String));
    expect(logg.handelse).not.toHaveBeenCalledWith('röst', 'maxtid', expect.anything());
  });
  it('maxtiden gäller fortfarande om talsyntesen hänger sig och fortsätter "prata"', async () => {
    vi.useFakeTimers();
    const s = falskSynt({ ms: 999999, medSlut: false });
    installera(s);
    const logg = { handelse: vi.fn() };
    const r = skapaRost({ logg });
    let hur = null; r.saga('Hej.').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(10000);
    expect(hur).toBe('klar');
    expect(logg.handelse).toHaveBeenCalledWith('röst', 'maxtid', 'Hej.');
  });
  it('tyst() avbryter det som pratar', async () => {
    vi.useFakeTimers();
    installera(falskSynt({ ms: 5000 }));
    const r = skapaRost({});
    let hur = null; r.saga('En lång mening som tar tid.').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(200);
    r.tyst();
    await vi.advanceTimersByTimeAsync(200);
    expect(hur).toBe('avbruten');
  });
  it('säger vilket ord rösten är på när webbläsaren ger ordsignalen (framskrivning ord för ord)', async () => {
    vi.useFakeTimers();
    const s = falskSynt({ ms: 400 });
    const tala = s.speak;
    s.speak = (u) => { tala(u); setTimeout(() => u.onboundary?.({ name: 'word', charIndex: 0 }), 30); setTimeout(() => u.onboundary?.({ name: 'word', charIndex: 4 }), 150); setTimeout(() => u.onboundary?.({ name: 'sentence', charIndex: 0 }), 160); };
    installera(s);
    const r = skapaRost({});
    const ord = [];
    let hur = null; r.saga('Bra jobbat.', 'berattare', (i) => ord.push(i)).then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(600);
    expect(hur).toBe('klar');
    expect(ord).toEqual([0, 4]);
  });
});
