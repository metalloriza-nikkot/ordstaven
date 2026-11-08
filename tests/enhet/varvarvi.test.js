import { describe, it, expect } from 'vitest';
import { varVarVi, senastSpelad, LANG_TID_DAGAR } from '../../src/karna/varvarvi.js';

const DYGN = 24 * 60 * 60 * 1000;
const NU = Date.parse('2026-11-08T10:00:00Z');
const r = (text) => ({ talare: 'farfar', text, via: 'radio' });
const kapitel = {
  scener: [
    { id: 'a1', pass: 1, steg: [{}, {}] },
    { id: 'a2', pass: 1, steg: [{}, {}] },
    { id: 'b1', pass: 2, steg: [{}, {}, {}] },
    { id: 'b_sido', pass: 2, frivillig: true, steg: [{}] },
    { id: 'b2', pass: 2, steg: [{}] },
  ],
  var_var_vi: [{ pass: 2, ord: { ord: 'apa', bild: 'apa_vinkar' }, kort: [r('Kort.')], lang: [r('Lång ett.'), r('Lång två.')] }],
};
const fraga = (scenIndex, steg, sedanDygn) => varVarVi({ kapitel, scenIndex, steg, senast: sedanDygn === null ? null : NU - sedanDygn * DYGN, nu: NU });

describe('Var var vi? (F2)', () => {
  it('när ett pass börjar: den korta efter kort tid, den långa efter lång tid, och den ersätter vid_omstart', () => {
    const kort = fraga(2, 0, 1);
    expect(kort).toMatchObject({ pass: 2, lang: false, ersatterOmstart: true, ord: { ord: 'apa', bild: 'apa_vinkar' } });
    expect(kort.repliker.map((x) => x.text)).toEqual(['Kort.']);
    const lang = fraga(2, 0, LANG_TID_DAGAR + 1);
    expect(lang.lang).toBe(true);
    expect(lang.repliker.map((x) => x.text)).toEqual(['Lång ett.', 'Lång två.']);
  });

  it('allt läses upp, och radion följer med', () => {
    for (const x of fraga(2, 0, 9).repliker) expect(x).toMatchObject({ typ: 'replik', upplast: true, via: 'radio', talare: 'farfar' });
  });

  it('mitt i ett pass: bara efter lång tid, och då före vid_omstart', () => {
    expect(fraga(2, 1, 1)).toBeNull(); // mitt i den första scenen
    expect(fraga(4, 0, 1)).toBeNull(); // en senare scen i passet
    expect(fraga(4, 0, 4)).toMatchObject({ lang: true, ersatterOmstart: false });
    expect(fraga(2, 2, 4)).toMatchObject({ lang: true, ersatterOmstart: false });
  });

  it('gränsen är mer än tre dygn', () => {
    expect(fraga(4, 0, 3)).toBeNull();
    expect(fraga(4, 0, 3.01)).not.toBeNull();
  });

  it('ett pass utan post, en frivillig scen eller okänd tid ger ingen lång påminnelse', () => {
    expect(fraga(0, 0, 9)).toBeNull(); // pass 1 har ingen post (prologens första pass)
    expect(fraga(3, 0, 9)).toBeNull(); // den frivilliga scenen
    expect(fraga(4, 0, null)).toBeNull();
    expect(fraga(2, 0, null)).toMatchObject({ lang: false });
    expect(varVarVi({ kapitel: { scener: kapitel.scener }, scenIndex: 2, steg: 0, senast: null, nu: NU })).toBeNull();
  });

  it('tiden läses ur sparningen', () => {
    expect(senastSpelad({ sparad: '2026-11-01T10:00:00Z' })).toBe(Date.parse('2026-11-01T10:00:00Z'));
    expect(senastSpelad({})).toBeNull();
    expect(senastSpelad({ sparad: 'trasig' })).toBeNull();
  });
});
