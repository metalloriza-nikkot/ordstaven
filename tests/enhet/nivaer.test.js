import { describe, it, expect } from 'vitest';
import { skapaNivaer } from '../../src/karna/nivaer.js';
import { skapaHinder } from '../../src/karna/vag.js';
import { lasKarta } from '../../src/karna/karta.js';

// kullen (nivå 1) med en trappa och en stege över södra kanten
const kulle = { id: 'kronet', sort: 'yta', niva: 1, x: 80, y: 40, b: 160, h: 70 };
const trappa = { id: 'trappa', sort: 'yta', forbinder: 'trappa', x: 110, y: 100, b: 24, h: 30 };
const stege = { id: 'stege', sort: 'yta', forbinder: 'stege', x: 190, y: 100, b: 16, h: 30 };
const lovhog = { id: 'lovhog_1', sort: 'sak', x: 100, y: 60, b: 20, h: 14 };

describe('höjdnivåer', () => {
  const n = skapaNivaer([kulle, trappa, stege, lovhog]);
  it('kanten går inte att gå över, men trappan går på båda nivåerna', () => {
    expect(n.finns).toBe(true);
    expect(n.nivaer).toEqual([0, 1]);
    expect(n.tillaten({ x: 160, y: 130 }, 0)).toBe(true); // marken nedanför
    expect(n.tillaten({ x: 160, y: 100 }, 0)).toBe(false); // uppe på kullen från marken
    expect(n.tillaten({ x: 160, y: 100 }, 1)).toBe(true);
    expect(n.tillaten({ x: 160, y: 130 }, 1)).toBe(false); // ner från kullen utan trappa
    expect(n.tillaten({ x: 122, y: 115 }, 0)).toBe(true); // på trappan
    expect(n.tillaten({ x: 122, y: 115 }, 1)).toBe(true);
    expect(n.forbindelse({ x: 122, y: 115 })?.id).toBe('trappa');
    expect(n.forbindelse({ x: 198, y: 115 })?.forbinder).toBe('stege');
  });
  it('saker på kullen står på nivå 1, och vägen mellan nivåerna går över närmaste förbindelse', () => {
    expect(n.nivaFor(lovhog)).toBe(1);
    expect(n.nivaFor(kulle)).toBe(1);
    expect(n.nivaVid({ x: 160, y: 150 })).toBe(0);
    expect(n.passage({ x: 115, y: 150 })).toEqual({ x: 122, y: 118 });
  });
  it('hindren på marken når inte upp på kullen utan trappan', () => {
    const mark = skapaHinder([], (p) => n.tillaten(p, 0));
    expect(mark.vag({ x: 160, y: 150 }, { x: 160, y: 90 }).at(-1)?.y).toBeGreaterThan(105); // närmast nedanför kanten
    const uppe = skapaHinder([], (p) => n.tillaten(p, 1));
    expect(uppe.vag({ x: 122, y: 118 }, { x: 160, y: 80 }).at(-1)).toEqual({ x: 160, y: 80 });
  });
  it('kartan läser ytor, trappor och stegar', () => {
    const tmj = { type: 'map', width: 20, height: 12, tilewidth: 16, tileheight: 16, layers: [{ type: 'objectgroup', objects: [
      { name: 'kronet', type: 'yta', x: 80, y: 40, width: 160, height: 70, properties: [{ name: 'niva', value: 1 }] },
      { name: 'trappa', type: 'trappa', x: 110, y: 100, width: 24, height: 30 },
      { name: 'stege', type: 'stege', x: 190, y: 100, width: 16, height: 30 },
    ] }] };
    const k = lasKarta(tmj);
    expect(k.objekt.map((o) => [o.id, o.sort, o.niva, o.forbinder])).toEqual([['kronet', 'yta', 1, undefined], ['trappa', 'yta', undefined, 'trappa'], ['stege', 'yta', undefined, 'stege']]);
  });
});

describe('kameran i textlagret (beslut 14)', () => {
  it('en punkt i världen hamnar på skärmen via kameran, i hela pixlar, och tillbaka', async () => {
    const { varldTillSkarm, skarmTillVarld } = await import('../../src/karna/skalning.js');
    const skala = { cssSkala: 4, vanster: 10, topp: 16 };
    expect(varldTillSkarm(skala, { x: 0, y: 0 }, 100, 50)).toEqual({ x: 410, y: 216 });
    expect(varldTillSkarm(skala, { x: 40.4, y: 8 }, 100, 50)).toEqual({ x: 250, y: 184 });
    expect(skarmTillVarld(skala, { x: 40, y: 8 }, 250, 184)).toEqual({ x: 100, y: 50, inne: true });
    expect(skarmTillVarld(skala, { x: 0, y: 0 }, 5, 20).inne).toBe(false);
  });
});
