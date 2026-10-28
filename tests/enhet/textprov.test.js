import { describe, it, expect } from 'vitest';
import { ordStarter, ordVid, ordTider, uppskattadTid } from '../../src/karna/framskrivning.js';
import { hamta, falt } from '../../src/textprov/hamta.js';
import { FORMER, GRUPPER } from '../../src/textprov/former.js';
import aventyr from '../../content/den-gomda-dalen/aventyr.json';
import kap00 from '../../content/den-gomda-dalen/kap-00.json';
import kap01 from '../../content/den-gomda-dalen/kap-01.json';

const innehall = { kapitel: [kap00, kap01], aventyr };

describe('framskrivning ord för ord', () => {
  it('hittar orden och vilket ord ett teckenindex hör till', () => {
    const t = 'Testa! Staven lyser.';
    expect(ordStarter(t)).toEqual([0, 7, 14]);
    expect(ordVid(ordStarter(t), 0)).toBe(0);
    expect(ordVid(ordStarter(t), 6)).toBe(0);
    expect(ordVid(ordStarter(t), 7)).toBe(1);
    expect(ordVid(ordStarter(t), 99)).toBe(2);
    expect(ordStarter('Där är ni ju!').length).toBe(4);
  });
  it('fördelar tiden efter ordens längd, första ordet direkt, allt före slutet', () => {
    const t = 'Hej, lilla Knopp!';
    const tider = ordTider(t, 3000);
    expect(tider).toHaveLength(3);
    expect(tider[0]).toBe(0);
    expect(tider[1]).toBeLessThan(tider[2]);
    expect(tider[2]).toBeLessThan(3000 * 0.85);
    expect(ordTider('')).toEqual([]);
    expect(uppskattadTid('Ett två tre')).toBe(500 + 3 * 380);
  });
});

describe('provsidan för textgrammatiken', () => {
  it('varje källa pekar på något som finns i innehållet', () => {
    for (const f of FORMER) for (const [namn, k] of Object.entries(f.kalla || {})) {
      expect(() => hamta(k, innehall), `${f.id}.${namn}`).not.toThrow();
    }
  });
  it('har alla prologens 13 former och kapitel 1:s 17', () => {
    const prolog = new Set(FORMER.map((f) => f.prolog).filter(Boolean));
    const kap1 = new Set(FORMER.map((f) => f.kap1).filter(Boolean));
    expect([...prolog].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect([...kap1].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    for (const f of FORMER) expect(GRUPPER.some((g) => g.id === f.grupp), f.id).toBe(true);
    expect(new Set(FORMER.map((f) => f.id)).size).toBe(FORMER.length);
  });
  it('säger till när en källa inte finns', () => {
    expect(() => hamta({ kap: 'kap-01', scen: 'finns_inte' }, innehall)).toThrow(/saknas/);
    expect(() => hamta({ kap: 'kap-01', pussel: 'k1_lappen', falt: 'varianter.L9' }, innehall)).toThrow(/fältet/);
    expect(hamta({ kap: 'kap-00', scen: 's22_tradgarden', steg: { typ: 'replik', talare: 'berattare' }, nr: -1, falt: 'text' }, innehall)).toEqual(expect.any(String));
    expect(falt({ a: [{ id: 'x', b: 2 }] }, 'a.x.b')).toBe(2);
  });
});
