import { describe, it, expect } from 'vitest';
import { MUSIK, MUSIK_SANKT_DB } from '../../src/grans/ljud.js';

describe('musiken (F5)', () => {
  it('Stils två slingor med looppunkterna i tabellen (rapporten från Stil 8/11 12:40)', () => {
    expect(MUSIK.meny.loopStart).toBe(0.5);
    expect(MUSIK.meny.loopEnd).toBeCloseTo(42.239, 3); // exakt 0,5 + 41,73913 s (16 takter i 92 BPM)
    expect(MUSIK.meny.loopEnd - MUSIK.meny.loopStart).toBeCloseTo(41.7391304, 6);
    expect(MUSIK.spel).toMatchObject({ loopStart: 0.5, loopEnd: 48.5 });
    for (const m of Object.values(MUSIK)) { expect(m.m4a).toMatch(/\.m4a/); expect(m.ogg).toMatch(/\.ogg/); }
  });
  it('sänks ca 12 dB när något läses (62.10)', () => {
    expect(MUSIK_SANKT_DB).toBe(-12);
  });
});
