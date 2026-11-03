// Grafiken och ljuden i assets/ (dokument 02 §7): licensraden, ingen metadata (repot är publikt), masterpaletten
// och figurernas storlek. Filerna skrivs av verktyg/grafik/inkorg.py.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const rot = new URL('../../', import.meta.url);
const las = (p) => readFileSync(new URL(p, rot));
const filer = (mapp, slut) => (existsSync(new URL(mapp, rot)) ? readdirSync(new URL(mapp, rot), { recursive: true }).filter((f) => String(f).endsWith(slut)).map((f) => `${mapp}${String(f).replace(/\\/g, '/')}`) : []);
const bilder = [...filer('assets/sprites/', '.png'), ...filer('assets/foremal/', '.png'), ...filer('assets/rum/', '.png'), ...filer('assets/tiles/', '.png'),
  ...filer('assets/bildkort/', '.png'), ...filer('assets/sidovyer/', '.png'), ...filer('assets/portratt/', '.png')];
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
  it('varje fil står i assets/LICENSER.md (filen eller dess mapp)', () => {
    const licenser = las('assets/LICENSER.md').toString();
    const finns = (f) => licenser.includes(f) || f.split('/').slice(0, -1).some((_, i, d) => licenser.includes('`' + d.slice(0, i + 1).join('/') + '/'));
    expect([...bilder, ...ljud].filter((f) => !finns(f))).toEqual([]);
  });
  it('ingen metadata följer med: bilderna har bara pixlar, ljuden bara format och data', () => {
    const tillatet = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    for (const f of bilder) expect(pngBitar(las(f)).filter((b) => !tillatet.has(b)), f).toEqual([]);
    for (const f of ljud) expect(wavBitar(las(f)), f).toEqual(['fmt ', 'data']);
  });
  it('färgförteckningen finns, och hjältens hud och dräkt finns i bilderna (palettbytet hittar dem)', () => {
    const p = JSON.parse(las('assets/palett.json').toString()).farger;
    expect(new Set(p).size).toBe(p.length);
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    for (const t of [...HUD_A.toner, ...DRAKT_A.toner]) expect(p, hex(t)).toContain(hex(t));
  });
  it('paletten är Stils masterpalett (beslut 28.4): samma färger, och taket per zon står med', () => {
    const stil = JSON.parse(las('verktyg/stil/palett/palett.json').toString());
    const vara = JSON.parse(las('assets/palett.json').toString());
    const hexar = [...stil.farger, ...(stil.tillagg || []).filter((t) => t && t.hex)].map((f) => f.hex.toLowerCase()).sort();
    expect(vara.farger).toEqual(hexar);
    expect(vara.tak_per_zon).toBe(stil.tak_per_zon);
  });
  it('hjälten och staven är 16 × 24 i fyra riktningar, gången har fyra bilder', () => {
    for (const figur of ['hjalte', 'stav']) {
      const ramar = JSON.parse(las(`assets/sprites/${figur}/${figur}.json`).toString()).frames;
      const prefix = figur === 'hjalte' ? 'hjalte_ga_' : 'stav_hand_';
      for (const [k, r] of Object.entries(ramar)) if (k.startsWith(prefix)) expect([r.frame.w, r.frame.h]).toEqual([16, 24]);
      for (const riktning of ['ner', 'upp', 'hoger', 'vanster']) {
        const n = Object.keys(ramar).filter((k) => k.startsWith(`${prefix}${riktning}_`)).length;
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
    expect(l(m.get(HUD_A.toner[1]))).toBeLessThan(l(0xd8a24a));
    expect(l(m.get(HUD_A.toner[3]))).toBeGreaterThan(l(0xd8a24a));
    expect(m.size).toBe(HUD_A.toner.length + DRAKT_A.toner.length);
    expect(flyttaTon(HUD_A.mitt, HUD_A.mitt, 0x4fae6a)).toBe(0x4fae6a);
  });
});

describe('kartornas grafik', () => {
  const kartmapp = 'kartor/den-gomda-dalen/';
  const kartor = readdirSync(new URL(kartmapp, rot)).filter((f) => f.endsWith('.tmj')).map((f) => [f, JSON.parse(las(kartmapp + f).toString())]);
  const egen = (o) => Object.fromEntries((o.properties || []).map((p) => [p.name, p.value]));
  const ramar = new Set([...filer('assets/foremal/', '.json'), ...filer('assets/sprites/', '.json')].flatMap((f) => Object.keys(JSON.parse(las(f).toString()).frames)));
  it('varje bild som en karta pekar på finns (föremål, figurer, rummens bilder och marken)', () => {
    const saknas = [];
    for (const [f, k] of kartor) {
      const ke = egen(k);
      if (ke.bild && !existsSync(new URL(`assets/rum/hus/${ke.bild}.png`, rot))) saknas.push(`${f}: rummet ${ke.bild}`);
      if (ke.mark && !existsSync(new URL(`assets/tiles/${ke.mark}/${ke.mark}.json`, rot))) saknas.push(`${f}: marken ${ke.mark}`);
      for (const l of k.layers) for (const o of l.objects || []) {
        const e = egen(o);
        for (const b of [e.bild, e.bild_natt, e.bild_del].filter(Boolean)) if (!ramar.has(b)) saknas.push(`${f} ${o.name}: ${b}`);
      }
    }
    expect(saknas).toEqual([]);
  });
  it('rummets bild har kartans storlek', () => {
    for (const [f, k] of kartor) {
      const b = egen(k).bild; if (!b) continue;
      const png = las(`assets/rum/hus/${b}.png`);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], f).toEqual([k.width * k.tilewidth, k.height * k.tileheight]);
    }
  });
});

describe('mellanscenernas bilder och bildkorten', () => {
  const kapitel = readdirSync(new URL('content/den-gomda-dalen/', rot)).filter((f) => /^kap-\d+\.json$/.test(f)).map((f) => JSON.parse(las('content/den-gomda-dalen/' + f).toString()));
  const ramar = new Set(filer('assets/sprites/', '.json').flatMap((f) => Object.keys(JSON.parse(las(f).toString()).frames)));
  it('varje mellanscen med bild har grafik (morgonen i sängen, luftskeppets lägen, sidovyerna)', () => {
    const saknas = [];
    for (const k of kapitel) for (const sc of k.scener) for (const st of sc.steg) {
      if (st.typ !== 'mellanscen' || !st.bild) continue;
      const finns = st.bild === 'hjalte_sang_morgon' ? ramar.has('hjalte_sang_morgon_01') && ramar.has('hjalte_sang_morgon_02')
        : st.bild.startsWith('luftskepp_') ? ramar.has(st.bild) || ramar.has(st.bild + '_01')
          : existsSync(new URL(`assets/sidovyer/${st.bild}_bakgrund.png`, rot));
      if (!finns) saknas.push(`${k.id} ${sc.id}: ${st.bild}`);
    }
    expect(saknas).toEqual([]);
  });
  it('luftskeppet har alla bilder som regin använder, och hjälmen som trillar', () => {
    for (const r of ['glider_01', 'glider_02', 'skata_landar', 'ser_hjalten', 'ser_kartan', 'talar_01', 'talar_02', 'skata_putsar_01', 'skata_putsar_02', 'skata_snor', 'trasslar_01', 'trasslar_02',
      'laser_skyltarna', 'laser_skyltarna_talar', 'flyger_fel_01', 'flyger_fel_02']) expect(ramar.has('luftskepp_' + r), r).toBe(true);
    expect(ramar.has('baronen_hjalm')).toBe(true);
    expect(ramar.has('hjalte_kartbit_upp_01')).toBe(true); // hjälten håller upp kartbiten (s22)
  });
  it('Farfars porträtt har radiomärket, och kartbit 1 och 2 finns med sitt läge i kartan', () => {
    for (const m of ['glad', 'fundersam']) expect(existsSync(new URL(`assets/portratt/farfar_portratt_${m}_radio.png`, rot)), m).toBe(true);
    const karta = JSON.parse(las('assets/karta/karta.json').toString());
    expect(karta.storlek).toEqual([224, 144]);
    const storlek = (f) => { const png = las(f); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
    for (const n of [1, 2]) {
      const f = `assets/karta/kartbit_${n}.png`, [b, h] = storlek(f), l = karta.bitar[`kartbit_${n}`];
      expect(l, f).toBeTruthy();
      // biten ligger inne i kartan
      expect(l.x + b <= 224 && l.y + h <= 144, f).toBe(true);
    }
  });
  it('bildkorten är 48 × 48, och sidovyns bakgrund fyller skärmen (320 × 192)', () => {
    const storlek = (f) => { const png = las(f); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
    for (const f of filer('assets/bildkort/', '.png')) expect(storlek(f), f).toEqual([48, 48]);
    for (const f of filer('assets/sidovyer/', '_bakgrund.png')) expect(storlek(f), f).toEqual([320, 192]);
    expect(existsSync(new URL('assets/bildkort/filt_rod.png', rot))).toBe(true);
  });
  it('baronens porträtt finns i alla tre minerna', () => {
    for (const m of ['stolt', 'forvanad', 'sur']) expect(existsSync(new URL(`assets/portratt/baronen_portratt_${m}.png`, rot)), m).toBe(true);
  });
});
