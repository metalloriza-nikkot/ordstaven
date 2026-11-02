// Grafiken och ljuden i assets/ (dokument 02 §7): licensraden, ingen metadata (repot är publikt), masterpaletten
// och figurernas storlek. Filerna skrivs av verktyg/grafik/inkorg.py.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const rot = new URL('../../', import.meta.url);
const las = (p) => readFileSync(new URL(p, rot));
const filer = (mapp, slut) => (existsSync(new URL(mapp, rot)) ? readdirSync(new URL(mapp, rot), { recursive: true }).filter((f) => String(f).endsWith(slut)).map((f) => `${mapp}${String(f).replace(/\\/g, '/')}`) : []);
const bilder = filer('assets/sprites/', '.png');
const ljud = filer('assets/ljud/', '.wav');

/** PNG-filens bitar (chunks), i ordning. */
function pngBitar(buf) {
  const ut = []; let i = 8;
  while (i < buf.length) { const n = buf.readUInt32BE(i); ut.push(buf.toString('latin1', i + 4, i + 8)); i += 12 + n; }
  return ut;
}
/** WAV-filens bitar. */
function wavBitar(buf) {
  const ut = []; let i = 12;
  while (i + 8 <= buf.length) { const n = buf.readUInt32LE(i + 4); ut.push(buf.toString('latin1', i, i + 4)); i += 8 + n + (n & 1); }
  return ut;
}

describe('grafiken och ljuden', () => {
  it('det finns figurer och ljud', () => {
    expect(bilder.length).toBeGreaterThan(0);
    expect(ljud.length).toBeGreaterThan(0);
  });
  it('varje fil står i assets/LICENSER.md', () => {
    const licenser = las('assets/LICENSER.md').toString();
    expect([...bilder, ...ljud].filter((f) => !licenser.includes(f))).toEqual([]);
  });
  it('ingen metadata följer med: bilderna har bara pixlar, ljuden bara format och data', () => {
    const tillatet = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    for (const f of bilder) expect(pngBitar(las(f)).filter((b) => !tillatet.has(b)), f).toEqual([]);
    for (const f of ljud) expect(wavBitar(las(f)), f).toEqual(['fmt ', 'data']);
  });
  it('masterpaletten har högst 48 färger (stilguiden §2)', () => {
    const p = JSON.parse(las('assets/palett.json').toString()).farger;
    expect(p.length).toBeLessThanOrEqual(48);
    expect(new Set(p).size).toBe(p.length);
  });
  it('hjälten och staven är 16 × 24 i fyra riktningar, gången har fyra bilder', () => {
    for (const figur of ['hjalte', 'stav']) {
      const ramar = JSON.parse(las(`assets/sprites/${figur}/${figur}.json`).toString()).frames;
      for (const r of Object.values(ramar)) expect([r.frame.w, r.frame.h]).toEqual([16, 24]);
      for (const riktning of ['ner', 'upp', 'hoger', 'vanster']) {
        const n = Object.keys(ramar).filter((k) => k.includes(`_${riktning}_`)).length;
        expect(n, `${figur} ${riktning}`).toBe(figur === 'hjalte' ? 4 : 1);
      }
    }
  });
  it('Herr Skata kan flyga åt båda hållen', () => {
    const ramar = Object.keys(JSON.parse(las('assets/sprites/herr_skata/herr_skata.json').toString()).frames);
    for (const r of ['herr_skata_flyga_hoger_01', 'herr_skata_flyga_hoger_02', 'herr_skata_flyga_vanster_01', 'herr_skata_flyga_vanster_02']) expect(ramar).toContain(r);
  });
});

import { hjaltensByten, flyttaTon, tillHsl, franHsl, HUD_A, DRAKT_A } from '../../src/karna/fargbyte.js';
describe('hjältens palettbyten', () => {
  it('förvalet byter ingenting', () => {
    expect(hjaltensByten(HUD_A.mitt, DRAKT_A.mitt).size).toBe(0);
  });
  it('färgen går fram och tillbaka genom HSL', () => {
    for (const c of [0x2e8bd8, 0x4fae6a, 0xd8a24a, 0x9a6ad8, 0x3a3e48]) {
      const [h, s, l] = tillHsl(c); const d = franHsl(h, s, l);
      for (const sk of [16, 8, 0]) expect(Math.abs(((d >> sk) & 255) - ((c >> sk) & 255))).toBeLessThanOrEqual(1);
    }
  });
  it('en annan hud: skuggan mörkare och ljuset ljusare än mitten, som i förlagan', () => {
    const m = hjaltensByten(0xd8a24a, 0x6e3a3a);
    expect(m.get(HUD_A.mitt)).toBe(0xd8a24a);
    expect(m.get(DRAKT_A.mitt)).toBe(0x6e3a3a);
    const l = (c) => tillHsl(c)[2];
    expect(l(m.get(HUD_A.skugga))).toBeLessThan(l(0xd8a24a));
    expect(l(m.get(HUD_A.ljus))).toBeGreaterThan(l(0xd8a24a));
    expect(flyttaTon(HUD_A.mitt, HUD_A.mitt, 0x4fae6a)).toBe(0x4fae6a);
  });
});
