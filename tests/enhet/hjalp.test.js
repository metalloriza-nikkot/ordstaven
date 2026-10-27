import { describe, it, expect } from 'vitest';
import { pekningOmMs, skapaHjalpSpar, PEKNING } from '../../src/karna/hjalp.js';

describe('hjälpens timing', () => {
  it('pekning tidigast efter 4 sekunder per alternativ, minst 12 sekunder', () => {
    expect(PEKNING).toEqual({ minMs: 12000, perAlternativMs: 4000 });
    expect(pekningOmMs({ antalAlternativ: 2, antalFel: 0, sedanStartMs: 0 })).toBe(12000); // minst 12 s
    expect(pekningOmMs({ antalAlternativ: 3, antalFel: 0, sedanStartMs: 9000 })).toBe(3000);
    expect(pekningOmMs({ antalAlternativ: 4, antalFel: 0, sedanStartMs: 9000 })).toBe(7000); // fyra dörrar: 16 s
    expect(pekningOmMs({ antalAlternativ: 4, antalFel: 0, sedanStartMs: 20000 })).toBe(0);
  });
  it('efter första felet får pekningen komma direkt', () => {
    expect(pekningOmMs({ antalAlternativ: 4, antalFel: 1, sedanStartMs: 1000 })).toBe(0);
  });
  it('en vanlig knuff (9 s) kommer före pekningen när ingen har gjort fel', () => {
    for (const n of [2, 3, 4]) expect(pekningOmMs({ antalAlternativ: n, antalFel: 0, sedanStartMs: 9000 })).toBeGreaterThan(0);
  });
  it('spårar om en knuff eller en pekning kom före valet', () => {
    let t = 0; const s = skapaHjalpSpar(() => t);
    expect(s.fore()).toEqual({ knuff_fore: false, pekning_fore: false });
    t = 9000; s.knuff(false);
    expect(s.fore()).toEqual({ knuff_fore: true, pekning_fore: false });
    t = 16000; s.knuff(true);
    expect(s.fore()).toEqual({ knuff_fore: true, pekning_fore: true });
    expect(s.sedanStart()).toBe(16000);
  });
});
