// @ts-check
import { describe, it, expect } from 'vitest';
import { KAMERA, inomGranserna, centrera, folj, omradeFor, visaRuta, narmare, enSkarm } from '../../src/karna/kamera.js';
import { rumsObjekt, framfor, vaggar } from '../../src/karna/rumslayout.js';
import { begransa } from '../../src/karna/rorelse.js';
import { skapaHinder } from '../../src/karna/vag.js';

const STOR = { bredd: 640, hojd: 384 };
const skarmen = (k) => ({ x0: k.x, y0: k.y, x1: k.x + 320, y1: k.y + 192 });

describe('kameran (beslut 14, 18.1)', () => {
  it('stannar vid områdets kanter och står i hela pixlar', () => {
    expect(inomGranserna({ x: -10, y: -3 }, STOR)).toEqual({ x: 0, y: 0 });
    expect(inomGranserna({ x: 999, y: 999 }, STOR)).toEqual({ x: 320, y: 192 });
    expect(inomGranserna({ x: 10.6, y: 4.2 }, STOR)).toEqual({ x: 11, y: 4 });
    expect(centrera({ x: 5, y: 380 }, STOR)).toEqual({ x: 0, y: 192 });
    expect(enSkarm({ bredd: 320, hojd: 192 })).toBe(true);
    expect(enSkarm(STOR)).toBe(false);
  });
  it('har en mittzon: inom zonen rör sig kameran inte, utanför följer den så lite som behövs', () => {
    const k = centrera({ x: 320, y: 200 }, STOR); // hjälten i mitten
    expect(folj(k, { x: 320 + KAMERA.zon.x, y: 200 }, STOR)).toEqual(k);
    expect(folj(k, { x: 320 + KAMERA.zon.x + 10, y: 200 }, STOR)).toEqual({ x: k.x + 10, y: k.y });
    expect(folj(k, { x: 320, y: 200 - KAMERA.zon.y - 7 }, STOR)).toEqual({ x: k.x, y: k.y - 7 });
  });
  it('börjar utan förskjutning framåt, men den går att ställa in', () => {
    expect(KAMERA.framat).toBe(0);
    const k = centrera({ x: 320, y: 200 }, STOR);
    const fram = folj(k, { x: 320, y: 200 }, STOR, { vand: { x: 1, y: 0 }, framat: 60 });
    expect(fram.x).toBeGreaterThan(k.x);
  });
  it('visar hela valet: alla alternativ och plats för skylten ovanför', () => {
    const alt = [{ x: 380, y: 60, b: 20, h: 20 }, { x: 560, y: 120, b: 20, h: 20 }];
    const ruta = /** @type {any} */ (omradeFor(alt));
    expect(ruta.y).toBe(60 - KAMERA.skylt);
    const hjalte = { x: 420, y: 200 };
    const { k, ryms } = visaRuta({ x: 100, y: 100 }, ruta, hjalte, STOR);
    expect(ryms).toBe(true);
    const s = skarmen(k);
    for (const a of alt) { expect(a.x).toBeGreaterThanOrEqual(s.x0); expect(a.x + a.b).toBeLessThanOrEqual(s.x1); expect(a.y - KAMERA.skylt).toBeGreaterThanOrEqual(s.y0); }
    expect(hjalte.y).toBeLessThanOrEqual(s.y1);
  });
  it('ryms valet inte på en skärm följer kameran hjälten', () => {
    const ruta = /** @type {any} */ (omradeFor([{ x: 10, y: 60, b: 20, h: 20 }, { x: 600, y: 60, b: 20, h: 20 }]));
    expect(visaRuta({ x: 0, y: 0 }, ruta, { x: 300, y: 200 }, STOR).ryms).toBe(false);
    expect(omradeFor([])).toBeNull();
  });
  it('glider: högst ett antal pixlar per steg', () => {
    expect(narmare({ x: 0, y: 0 }, { x: 100, y: 3 }, 8)).toEqual({ x: 8, y: 3 });
    expect(narmare({ x: 50, y: 50 }, { x: 50, y: 50 }, 8)).toEqual({ x: 50, y: 50 });
  });
});

describe('ett område som är större än skärmen', () => {
  const karta = { objekt: [{ id: 'sten', x: 560, y: 340, b: 20, h: 16, sort: /** @type {'sak'} */ ('sak'), sida: /** @type {'under'} */ ('under') }],
    start: null, inomhus: false, in: {}, lampor: [], vagg: { bak: 48, sida: 32, fram: 16 }, morker: null, storlek: STOR };
  it('föremålen räknas mot områdets kanter, inte skärmens', () => {
    const [sten] = rumsObjekt(['sten'], null, karta);
    expect(sten.storlek).toEqual(STOR);
    expect(framfor(sten).y).toBe(368); // under stenen, inte klämd till skärmens nederkant (192)
  });
  it('hjälten kan gå i hela området, och väggarna står vid områdets kanter', () => {
    expect(begransa({ x: 600, y: 370 }, STOR)).toEqual({ x: 600, y: 370 });
    expect(begransa({ x: 600, y: 370 })).toEqual({ x: 312, y: 192 });
    expect(skapaHinder([], undefined, STOR).fri({ x: 600, y: 370 })).toBe(true);
    expect(vaggar(undefined, STOR)[2]).toEqual({ x: 608, y: 0, b: 32, h: 384 });
  });
});
