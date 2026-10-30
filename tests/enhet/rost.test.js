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
  it('ett yttrande som tappas (Chrome efter cancel) läggs en gång till, och spelet väntar inte ut maxtiden', async () => {
    vi.useFakeTimers();
    const s = falskSynt({ ms: 400 });
    const tala = s.speak; let n = 0;
    s.speak = (u) => { if (++n === 1) return; tala(u); }; // det första yttrandet försvinner utan ett ljud
    installera(s);
    const logg = { handelse: vi.fn() };
    const r = skapaRost({ logg });
    let hur = null; r.saga('Här!').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(2000);
    expect(hur).toBe('klar');
    expect(n).toBe(2);
    expect(logg.handelse).toHaveBeenCalledWith('röst', 'startade inte, en gång till', 'Här!');
    expect(logg.handelse).not.toHaveBeenCalledWith('röst', 'maxtid', expect.anything());
  });
  it('avbryts ett yttrande läggs nästa först efter en kort paus (Chrome fastnar annars)', async () => {
    vi.useFakeTimers();
    const s = falskSynt({ ms: 400 });
    const tala = s.speak; const tider = [];
    s.speak = (u) => { tider.push(Date.now()); tala(u); };
    installera(s);
    const r = skapaRost({});
    r.saga('Först en lång mening som pratar.');
    await vi.advanceTimersByTimeAsync(100); // talar nu
    const t1 = Date.now();
    let hur = null; r.saga('Hej!').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(40);
    expect(tider.length).toBe(1); // inte än
    await vi.advanceTimersByTimeAsync(600);
    expect(tider.length).toBe(2);
    expect(tider[1] - t1).toBeGreaterThanOrEqual(80);
    expect(hur).toBe('klar');
  });
  it('startar det inte heller andra gången ges det upp efter 2,5 s', async () => {
    vi.useFakeTimers();
    const s = falskSynt({ ms: 400 }); s.speak = () => {};
    installera(s);
    const logg = { handelse: vi.fn() };
    const r = skapaRost({ logg });
    let hur = null; r.saga('Här!').then((h) => { hur = h; });
    await vi.advanceTimersByTimeAsync(2700);
    expect(hur).toBe('klar');
    expect(logg.handelse).toHaveBeenCalledWith('röst', 'startade inte', 'Här!');
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

describe('rollrösterna', () => {
  it('fågeln är levande: tonen skiftar mellan repliker, men samma replik låter alltid likadant', async () => {
    const { tonFor } = await import('../../src/grans/rost.js');
    const repliker = ['Kra!', 'Baronen kommer.', 'Jag såg ungen.', 'Var är kartan?', 'Hej hej.'];
    const toner = repliker.map((t) => tonFor('fagel', t).pitch);
    expect(new Set(toner).size).toBeGreaterThan(1);
    expect(tonFor('fagel', 'Kra!')).toEqual(tonFor('fagel', 'Kra!'));
    for (const t of repliker) { const { pitch, rate } = tonFor('fagel', t); expect(pitch).toBeGreaterThan(1.2); expect(pitch).toBeLessThanOrEqual(2); expect(rate).toBeGreaterThan(1); }
  });
  it('de andra rösterna har fast ton, och en okänd roll blir berättaren', async () => {
    const { tonFor } = await import('../../src/grans/rost.js');
    expect(tonFor('gammal', 'Hej!')).toEqual(tonFor('gammal', 'Hopp.'));
    expect(tonFor('finns_inte', 'Hej')).toEqual(tonFor('berattare', 'Hej'));
  });
});

describe('rullningens takt (beslut 21.2)', () => {
  it('ca 40 tecken per sekund: en rad på 30 tecken står klar på under en sekund', async () => {
    const { teckenTid, RULLNING } = await import('../../src/karna/framskrivning.js');
    expect(RULLNING.teckenPerSek).toBe(40);
    expect(teckenTid(30)).toBeLessThan(1000);
    expect(teckenTid(0)).toBe(0);
    expect(teckenTid(40, true)).toBe(teckenTid(40)); // ett ord i taget går i samma takt
  });
});
