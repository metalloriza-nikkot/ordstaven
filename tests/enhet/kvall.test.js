// Kvällen på figurerna som en färgtabell (Stil, beslut 84.2).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { kvallTabell } from '../../src/karna/fargbyte.js';

const json = JSON.parse(readFileSync(new URL('../../assets/kvall.json', import.meta.url), 'utf8'));
const palett = JSON.parse(readFileSync(new URL('../../assets/palett.json', import.meta.url), 'utf8'));

describe('kvällstabellen', () => {
  it('byter färg mot färg och hoppar över dem som är sig själva', () => {
    const m = kvallTabell({ tabell: { '#ffffff': '#cdd1d6', '#101c1c': '#101c1c', 'fel': '#000000' } });
    expect([...m]).toEqual([[0xffffff, 0xcdd1d6]]);
  });
  it('Stils tabell har varje färg i paletten, och kvällsfärgerna finns i paletten', () => {
    const farger = new Set(JSON.stringify(palett.farger).match(/#[0-9a-f]{6}/gi).map((f) => f.toLowerCase()));
    const t = json.tabell;
    for (const f of farger) expect(t[f], f).toBeTruthy();
    for (const v of Object.values(t)) expect(farger.has(v.toLowerCase()), v).toBe(true);
    expect(kvallTabell(json).size).toBeGreaterThan(200);
  });
});

import { narbildFor, NARBILDER } from '../../src/karna/mellanscen.js';
import { existsSync } from 'node:fs';
describe('närbilden av brevramen (Stil del 3)', () => {
  it('läget följer hur många halvor som sitter i, och den som just sattes i är blöt först', () => {
    expect(narbildFor('brevram_nara', 0, false)).toEqual({ bilder: ['brevram_nara_tom'] });
    expect(narbildFor('brevram_nara', 1, true)).toEqual({ bilder: ['brevram_nara_vanster'] }); // bryggans halva är torr
    expect(narbildFor('brevram_nara', 2, true)).toEqual({ bilder: ['brevram_nara_hel_blot', 'brevram_nara_hel'] });
    expect(narbildFor('brevram_nara', 2, false)).toEqual({ bilder: ['brevram_nara_hel'] });
    expect(narbildFor('annat', 1, true)).toBe(null);
  });
  it('varje bild finns som bildkort', () => {
    for (const n of Object.values(NARBILDER)) for (const id of [...n.lagen, ...n.blot.map((b) => `${b}_blot`)]) {
      expect(existsSync(new URL(`../../assets/bildkort/${id}.png`, import.meta.url)), id).toBe(true);
    }
  });
});
