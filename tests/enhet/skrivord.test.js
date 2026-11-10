// @ts-check
// Formeln med tangentbordet (P11 med skriv: tangentbord, kapitel 2): ordet han skriver bedöms (Teknik 20, del 2).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bedomOrd, kandaOrd, antalFalt, MAX_BOKSTAVER } from '../../src/karna/skrivord.js';
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
