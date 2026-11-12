// @ts-check
// Formeln med tangentbordet (P11 med skriv: tangentbord, kapitel 2): ordet han skriver bedöms (Teknik 20, del 2).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bedomOrd, kandaOrd, antalFalt, MAX_BOKSTAVER, naraStavning, avkodaOrdlista } from '../../src/karna/skrivord.js';
import { ristasNu } from '../../src/karna/hjalte.js';

const las = (/** @type {string} */ f) => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'));
const ordlistor = las('content/ordlistor.json');
const kap2 = las('content/den-gomda-dalen/kap-02.json');
const P = (/** @type {string} */ id) => kap2.pussel.find((/** @type {any} */ p) => p.id === id);
const ord = kandaOrd(ordlistor, [kap2]);

describe('formeln med tangentbordet (kapitel 2)', () => {
  it('ordet han skrev blir det som händer: BRO, STEGE, REP och FLOTTE löser k2_over, med små bokstäver också', () => {
    for (const w of ['BRO', 'stege', 'Rep', 'FLOTTE']) expect(bedomOrd(P('k2_over'), w, ord)).toMatchObject({ sort: 'formel', ord: w.toUpperCase() });
    expect(bedomOrd(P('k2_over'), 'BRO', ord).formel.ristas).toBe(false);
  });
  it('en form som godtas ger formeln (FLYGER blir FLYG), och nästan rätt känns igen', () => {
    expect(bedomOrd(P('k2_flyg'), 'FLYGER', ord)).toMatchObject({ sort: 'formel', ord: 'FLYG' });
    // nästan rätt tänder ingen bokstav ur svaret längre (69.3): tand är borta ur kapitel 2
    expect(bedomOrd(P('k2_flyg'), 'SVÄVA', ord)).toMatchObject({ sort: 'nastan', nastan: { ord: 'SVÄVA' } });
    expect(bedomOrd(P('k2_over'), 'BOR', ord)).toMatchObject({ sort: 'nastan', nastan: { ord: 'BOR' } });
    expect(P('k2_over').nastan.some((n) => n.tand)).toBe(false);
  });
  it('ett ord som passar men inte hjälper får sin reaktion, aldrig "pff" (beslut 63)', () => {
    const b = bedomOrd(P('k2_over'), 'BÅT', ord);
    expect(b.sort).toBe('rimligt');
    expect(/** @type {any} */ (b).rimligt.replik.text).toMatch(/BÅT|båt/i);
  });
  it('ett annat riktigt ord får det vanliga svaret, och bara det som inte är ett ord får "pff"', () => {
    expect(bedomOrd(P('k2_over'), 'APA', ord).sort).toBe('ord');
    expect(bedomOrd(P('k2_over'), 'LJUS', ord).sort).toBe('ord'); // en formel från prologen
    expect(bedomOrd(P('k2_lyft'), 'SVÄRD', ord).sort).toBe('rimligt'); // svärdet skär bara växter
    expect(bedomOrd(P('k2_over'), 'XQZ', ord).sort).toBe('fel');
  });
  it('fälten visar formelns längd och växer när han skriver fler bokstäver, högst tio', () => {
    expect(antalFalt(P('k2_over'), '')).toBe(3);
    expect(antalFalt(P('k2_over'), 'ST')).toBe(3);
    expect(antalFalt(P('k2_over'), 'FLOTTE')).toBe(6);
    expect(antalFalt(P('k2_over'), 'X'.repeat(14))).toBe(MAX_BOKSTAVER);
  });
  it('BRO ristas inte in på staven, men FLYG gör det första gången (67.6)', () => {
    expect(ristasNu(P('k2_over'), [], 'BRO')).toBe(false);
    expect(ristasNu(P('k2_over'), [], 'FLOTTE')).toBe(false);
    expect(ristasNu(P('k2_flyg'), ['LJUS', 'SVÄRD'], 'FLYG')).toBe(true);
    expect(ristasNu(P('k2_bubblan'), ['FLYG'], 'FLYG')).toBe(false);
    expect(ristasNu(P('k2_bubblan'), ['FLYG'], 'REP')).toBe(false);
  });
});

describe('nära stavning (76.2, A4)', () => {
  it('enkel eller dubbel konsonant, Å/Ä och stum bokstav före J ger platsen som skiljer', () => {
    expect(naraStavning('SIMA', 'SIMMA')).toBe(3);
    expect(naraStavning('FLOTE', 'FLOTTE')).toBe(4);
    expect(naraStavning('FLYGG', 'FLYG')).toBe(3);
    expect(naraStavning('SVÅRD', 'SVÄRD')).toBe(2);
    expect(naraStavning('SÅV', 'SOV')).toBe(1);
    expect(naraStavning('JUS', 'LJUS')).toBe(0);
    expect(naraStavning('JÄLP', 'HJÄLP')).toBe(0);
  });
  it('annat räknas inte som nära', () => {
    for (const [a, m] of [['BRO', 'BRO'], ['BOR', 'BRO'], ['FLYT', 'FLYG'], ['SVRD', 'SVÄRD'], ['US', 'LJUS'], ['SVAARD', 'SVÄRD'], ['', 'BRO']]) expect(naraStavning(a, m), `${a}/${m}`).toBe(-1);
  });
  it('en formel som är nära stavad blir "nästan" med bokstaven som skiljer, aldrig "pff"', () => {
    const b = bedomOrd(P('k2_svard'), 'SVÅRD', ord);
    expect(b.sort).toBe('nastan');
    expect(b).toMatchObject({ mal: 'SVÄRD', skiljer: 2 });
    // ett riktigt rimligt ord går före
    expect(bedomOrd(P('k2_svard'), 'SAX', ord).sort).toBe('rimligt');
  });
});


describe('SALDO och spärrlistan (beslut 76.2 och 77.2)', () => {
  it('den prefixkodade listan packas upp till orden i versaler', () => {
    expect([...avkodaOrdlista('0BRO\n3AR\n2Y\n0SPORRE\n')]).toEqual(['BRO', 'BROAR', 'BRY', 'SPORRE']);
    expect(avkodaOrdlista('').size).toBe(0);
  });
  it('ett ord ur SALDO är ett riktigt ord, aldrig "pff"', () => {
    const saldo = new Set(['KATTUNGE']);
    expect(bedomOrd(P('k2_svard'), 'KATTUNGE', ord).sort).toBe('fel');
    expect(bedomOrd(P('k2_svard'), 'KATTUNGE', { has: (w) => ord.has(w) || saldo.has(w) }).sort).toBe('ord');
  });
  it('ett grovt ord är "spärrat": aldrig "BRA ORD!", och ordet följer inte med', () => {
    const sparr = new Set(['FANORD']);
    const b = bedomOrd(P('k2_svard'), 'fanord', { has: () => true }, sparr);
    expect(b).toEqual({ sort: 'sparrat', ord: '' });
    // formeln går alltid före
    expect(bedomOrd(P('k2_svard'), 'SVÄRD', ord, new Set(['SVÄRD'])).sort).toBe('formel');
  });
  it('spärrlistan i repot: varje grundord finns i den kodade listan, och listan har inga vanliga ord', () => {
    const rader = readFileSync(new URL('../../verktyg/ordlista/sparrlista.txt', import.meta.url), 'utf8').split('\n').map((r) => r.split('#')[0].trim()).filter((r) => r && !r.startsWith('del:'));
    const sparr = avkodaOrdlista(readFileSync(new URL('../../assets/ordlista/sparr.txt', import.meta.url), 'utf8'));
    // längre ord än fälten rymmer går inte att skriva
    for (const r of rader) if (r.length <= MAX_BOKSTAVER) expect(sparr.has(r.toLocaleUpperCase('sv-SE')), r).toBe(true);
    // ord som spelet använder får aldrig vara spärrade
    for (const w of ['BRO', 'FLYG', 'SVÄRD', 'LJUS', 'REP', 'STEGE', 'SPORRE', 'BAJS', 'PUNG', 'SJUTTON']) expect(sparr.has(w), w).toBe(false);
    for (const w of ord) expect(sparr.has(w), w).toBe(false);
  });
});
