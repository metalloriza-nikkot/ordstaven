import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lasRutnat, grannar, skapaStig, valj, hjalpFlak, kanNaFram, kontrolleraStig } from '../../src/karna/bokstavsstig.js';

const prov = JSON.parse(readFileSync(new URL('../fixturer/testrum-stig.json', import.meta.url), 'utf8'));
const rygg = prov.stigar[0];

describe('bokstavsstigen (P18, 114.6)', () => {
  it('läser rutnätet med den närmaste raden först', () => {
    const g = lasRutnat(rygg);
    expect(g.rader).toBe(4); expect(g.kolumner).toBe(3); expect(g.start).toBe(1);
    expect(g.celler[0].map((c) => c.bokstav)).toEqual(['r', 'a', 'r']);
    expect(g.celler[1][1].sort).toBe('vagg');
    expect(g.celler[3][1].sort).toBe('vak');
  });
  it('han hoppar bara till raden framför, rakt eller snett, och aldrig till en vak eller en isvägg', () => {
    const g = lasRutnat(rygg);
    expect(grannar(g, { r: -1, k: 1 })).toEqual([{ r: 0, k: 0 }, { r: 0, k: 1 }, { r: 0, k: 2 }]);
    expect(grannar(g, { r: 0, k: 2 })).toEqual([{ r: 1, k: 2 }]);
    expect(grannar(g, { r: 3, k: 0 })).toEqual([]);
  });
  it('fel bokstav: han står kvar, och ett flak långt bort går inte att välja', () => {
    const s = skapaStig(rygg);
    expect(valj(s, { r: 0, k: 1 }).sort).toBe('fel');
    expect(s.nu).toEqual({ r: -1, k: 1 });
    expect(valj(s, { r: 2, k: 0 }).sort).toBe('inte');
  });
  it('en återvändsgränd sjunker tillbaka till där vägen delade sig, och han börjar inte om', () => {
    const s = skapaStig(rygg);
    expect(valj(s, { r: 0, k: 2 }).sort).toBe('ratt');
    const a = valj(s, { r: 1, k: 2 });
    expect(a.sort).toBe('atervand');
    expect(a.sjunker).toEqual([{ r: 1, k: 2 }, { r: 0, k: 2 }]);
    expect(a.tillbaka).toEqual({ r: -1, k: 1 });
    expect(valj(s, { r: 0, k: 2 }).sort).toBe('inte'); // flaket har sjunkit
    expect(hjalpFlak(s)).toEqual({ r: 0, k: 0 });
    for (const t of [{ r: 0, k: 0 }, { r: 1, k: 0 }, { r: 2, k: 0 }]) expect(valj(s, t).sort).toBe('ratt');
    expect(valj(s, { r: 3, k: 0 }).sort).toBe('klar');
  });
  it('ett riktigt ord som inte når fram: en gren dör efter flera rätta hopp och sjunker till förgreningen', () => {
    const s = skapaStig(prov.stigar[1]);
    // m o s s a: s till höger på rad 4 slutar vid två vakar
    expect(valj(s, { r: 0, k: 0 }).sort).toBe('ratt');
    expect(valj(s, { r: 1, k: 0 }).sort).toBe('ratt');
    expect(valj(s, { r: 2, k: 1 }).sort).toBe('ratt');
    expect(valj(s, { r: 3, k: 1 }).sort).toBe('fel'); // a, inte s
    const a = valj(s, { r: 3, k: 2 });
    expect(a.sort).toBe('atervand');
    expect(a.sjunker).toEqual([{ r: 3, k: 2 }]);
    expect(a.tillbaka).toEqual({ r: 2, k: 1 });
    expect(valj(s, { r: 3, k: 0 }).sort).toBe('ratt');
    expect(valj(s, { r: 4, k: 0 }).sort).toBe('klar');
    expect(s.fel).toBe(1); expect(s.atervandor).toBe(1);
  });
  it('stig 3:s form (3 × 6): en gren dör efter tre rätta hopp, och alla tre flaken sjunker tillbaka till förgreningen', () => {
    const s = skapaStig(prov.stigar[2]);
    expect(lasRutnat(prov.stigar[2]).rader).toBe(6);
    for (const t of [{ r: 0, k: 1 }, { r: 1, k: 2 }, { r: 2, k: 2 }]) expect(valj(s, t).sort).toBe('ratt');
    const a = valj(s, { r: 3, k: 2 });
    expect(a.sort).toBe('atervand');
    expect(a.sjunker).toHaveLength(3);
    expect(a.tillbaka).toEqual({ r: 0, k: 1 });
    for (const t of [{ r: 1, k: 0 }, { r: 2, k: 0 }, { r: 3, k: 0 }, { r: 4, k: 0 }]) expect(valj(s, t).sort).toBe('ratt');
    expect(valj(s, { r: 5, k: 0 }).sort).toBe('klar');
  });
  it('hjälpen visar ett flak som leder fram, aldrig en återvändsgränd', () => {
    const s = skapaStig(rygg);
    expect(hjalpFlak(s)).toEqual({ r: 0, k: 0 });
    expect(kanNaFram(lasRutnat(rygg), { r: 0, k: 2 }, 1)).toBe(false);
  });
  it('kontrollen: provfilen går igenom, och den säger till om ett ord som inte går att stava eller förväxlingsbara gemener', () => {
    for (const p of prov.stigar) expect(kontrolleraStig(p).fel).toEqual([]);
    expect(kontrolleraStig({ ...rygg, ord: 'rygga' }).fel.join()).toMatch(/rader/);
    expect(kontrolleraStig({ ...rygg, rutnat: ['g # #', 'g a #', 'y | #', 'r a #'], start: 2 }).fel.join()).toMatch(/inte att stava/);
    expect(kontrolleraStig({ ...rygg, rutnat: ['g # g', 'g a #', 'y | y', 'r n u'] }).varningar.join()).toMatch(/förväxlas/);
  });
});
