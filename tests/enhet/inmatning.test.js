import { describe, it, expect } from 'vitest';
import { skapaInmatning } from '../../src/karna/inmatning.js';
import { steg, FIGUR } from '../../src/karna/rorelse.js';

describe('inmatning', () => {
  it('piltangenter ger riktning, diagonalen är normaliserad', () => {
    const i = skapaInmatning();
    i.tangentNer('ArrowRight'); expect(i.riktning()).toEqual({ x: 1, y: 0 });
    i.tangentNer('ArrowDown');
    const r = i.riktning(); expect(Math.hypot(r.x, r.y)).toBeCloseTo(1);
    i.tangentUpp('ArrowRight'); i.tangentUpp('ArrowDown'); expect(i.riktning()).toEqual({ x: 0, y: 0 });
  });

  it('motsatta tangenter tar ut varandra', () => {
    const i = skapaInmatning(); i.tangentNer('ArrowLeft'); i.tangentNer('ArrowRight');
    expect(i.riktning()).toEqual({ x: 0, y: 0 });
  });

  it('tryck sätter mål, pil avbryter målet', () => {
    const i = skapaInmatning(); i.tryck(100, 50);
    expect(i.gaTillMal()).toEqual({ x: 100, y: 50 });
    i.tangentNer('ArrowUp'); expect(i.gaTillMal()).toBeNull();
  });

  it('bokstäver blir versaler, Å Ä Ö fungerar, A är ingen riktning', () => {
    const i = skapaInmatning();
    i.tangentNer('KeyA', 'a'); i.tangentNer('BracketLeft', 'å'); i.tangentNer('Quote', 'ä');
    expect(i.hamtaHandlingar().map((h) => h.tecken)).toEqual(['A', 'Å', 'Ä']);
    expect(i.hamtaHandlingar()).toEqual([]);
  });

  it('släpp allt när fönstret tappar fokus', () => {
    const i = skapaInmatning(); i.tangentNer('ArrowUp'); i.slappAllt();
    expect(i.riktning()).toEqual({ x: 0, y: 0 });
  });
});

describe('rörelse', () => {
  const stilla = { riktning: { x: 0, y: 0 }, gaTill: null };
  it('går med riktning och stannar vid kanten', () => {
    let p = { x: 160, y: 120 };
    for (let k = 0; k < 100; k++) p = steg(p, { riktning: { x: 1, y: 0 }, gaTill: null }, 0.1);
    expect(p.x).toBe(320 - FIGUR.bredd / 2);
  });
  it('går till målet och säger till när det är framme', () => {
    let p = { x: 50, y: 100, framme: false };
    for (let k = 0; k < 100 && !p.framme; k++) p = steg(p, { riktning: { x: 0, y: 0 }, gaTill: { x: 200, y: 150 } }, 0.05);
    expect(p).toEqual({ x: 200, y: 150, framme: true });
  });
  it('ett mål utanför rummet hamnar på kanten', () => {
    let p = { x: 50, y: 100, framme: false };
    for (let k = 0; k < 200 && !p.framme; k++) p = steg(p, { riktning: { x: 0, y: 0 }, gaTill: { x: -40, y: 5 } }, 0.05);
    expect(p).toEqual({ x: FIGUR.bredd / 2, y: FIGUR.hojd, framme: true });
  });
  it('står still utan styrning', () => {
    expect(steg({ x: 10, y: 30 }, stilla, 1)).toEqual({ x: 10, y: 30, framme: false });
  });
  it('en hackande bildruta teleporterar inte', () => {
    const p = steg({ x: 100, y: 100 }, { riktning: { x: 1, y: 0 }, gaTill: null }, 5);
    expect(p.x).toBeLessThanOrEqual(100 + FIGUR.fart * 0.1 + 1e-9);
  });
});

describe('nosen och bokstäverna', () => {
  it('N är en bokstav, nosen ligger på Tab', () => {
    const i = skapaInmatning();
    i.tangentNer('KeyN', 'n'); i.tangentNer('Tab', 'Tab');
    expect(i.hamtaHandlingar()).toEqual([{ typ: 'bokstav', tecken: 'N' }, { typ: 'hjalp' }]);
  });
});

import { skapaHinder } from '../../src/karna/vag.js';
import { framfor, hinderFran, rumsObjekt, vidObjekt } from '../../src/karna/rumslayout.js';

describe('kollision och vägsökning', () => {
  const lada = { x: 140, y: 80, b: 40, h: 30 };
  const h = skapaHinder([lada]);
  it('fötterna kan inte stå i en låda', () => {
    expect(h.fri({ x: 160, y: 100 })).toBe(false);
    expect(h.fri({ x: 160, y: 130 })).toBe(true);
  });
  it('vägen går runt lådan och varje bit har fri sikt', () => {
    const fran = { x: 160, y: 150 }, till = { x: 160, y: 60 };
    const v = h.vag(fran, till);
    expect(v.length).toBeGreaterThan(1);
    let a = fran;
    for (const p of v) { expect(h.sikt(a, p)).toBe(true); a = p; }
    expect(v.at(-1)).toEqual(till);
  });
  it('ett mål inne i lådan blir närmaste fria punkt', () => {
    const v = h.vag({ x: 60, y: 150 }, { x: 160, y: 95 });
    expect(h.fri(v.at(-1))).toBe(true);
  });
  it('piltangenterna glider längs kanten', () => {
    const p = h.glid({ x: 130, y: 120 }, 2, -2); // snett upp mot lådans hörn
    expect(h.fri(p)).toBe(true);
  });
  it('i varje rum och tillstånd i prologen går det att nå framför varje föremål från där hjälten kommer in', async () => {
    const { readFileSync } = await import('node:fs');
    const prolog = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8'));
    for (const rum of prolog.rum) {
      const karta = lasKarta(JSON.parse(readFileSync(new URL(`../../kartor/den-gomda-dalen/${rum.id}.tmj`, import.meta.url), 'utf8')));
      for (const t of rum.tillstand || [null]) {
        const obj = rumsObjekt(rum.innehall, t, karta);
        const hh = skapaHinder(hinderFran(obj));
        // alla ingångar: kartans start och varje utgång
        const starter = [karta.start, ...obj.filter((o) => o.till).map(framfor)].filter(Boolean).map((p) => hh.narmasteFria(p));
        for (const start of starter) for (const o of obj) {
          const f = framfor(o);
          const v = hh.vag(start, f);
          expect(v.length, `${rum.id}/${t}: ${o.id}`).toBeGreaterThan(0);
          const slut = v.at(-1);
          expect(vidObjekt(slut, o), `${rum.id}/${t}: ${o.id} nås inte (hamnar ${slut.x},${slut.y}, mål ${f.x},${f.y})`).toBe(true);
        }
      }
    }
  });
});

import { lasKarta, synligaIds } from '../../src/karna/karta.js';

describe('Tiled-kartor och synliga föremål', () => {
  const tmj = (objekt) => ({ type: 'map', width: 20, height: 12, tilewidth: 16, tileheight: 16, layers: [{ type: 'objectgroup', objects: objekt }] });
  it('läser föremål, utgångar och startpunkten', () => {
    const k = lasKarta(tmj([
      { name: 'dorr_mat', type: 'utgang', x: 64, y: 4, width: 26, height: 32, properties: [{ name: 'till', value: 'koket' }] },
      { name: 'lada', x: 10.4, y: 20, width: 20, height: 16, properties: [{ name: 'sida', value: 'vanster' }] },
      { name: 'start', point: true, x: 40, y: 150, width: 0, height: 0 },
    ]));
    expect(k.start).toEqual({ x: 40, y: 150 });
    expect(k.objekt).toEqual([
      { id: 'dorr_mat', x: 64, y: 4, b: 26, h: 32, sort: 'utgang', till: 'koket' },
      { id: 'lada', x: 10, y: 20, b: 20, h: 16, sort: 'sak', sida: 'vanster' },
    ]);
  });
  it('en karta i fel storlek godtas inte', () => {
    expect(() => lasKarta({ ...tmj([]), width: 21 })).toThrow(/rummet är 320×192/);
  });
  it('syns_i döljer föremål tills rummet har rätt tillstånd', () => {
    const inn = ['stav', { id: 'agg', syns_i: ['natt_upplyst', 'morgon'] }];
    expect(synligaIds(inn, 'natt')).toEqual(['stav']);
    expect(synligaIds(inn, 'natt_upplyst')).toEqual(['stav', 'agg']);
    expect(synligaIds(inn, null)).toEqual(['stav']);
  });
});
