import { describe, it, expect } from 'vitest';
import { nyttTillstand, aventyrFor } from '../../src/karna/sparning.js';
import { sparaPassbild, aterstallLarande, forstaIPasset, passOrdning } from '../../src/karna/larandebild.js';
import { skapaLasmotor } from '../../src/karna/lasmotor.js';

const AV = 'den-gomda-dalen';
const ORDNING = ['kap-00', 'kap-01'];
const forsok = (motor, ratt) => motor.registrera({ pussel_id: 'p', typ: 'P1_las_och_valj', niva: 'L2', ratt, antal_forsok: ratt ? 1 : 2, hjalp_anvand: false, tid: 4000 });

describe('lärandet vid passens början (F3, 32.2)', () => {
  it('ett hopp tillbaka sätter nivån och historiken till hur de var när passet började', () => {
    const t = nyttTillstand('test'); let klocka = 1000;
    const motor = skapaLasmotor({ larande: t.spelare.larande, klocka: () => klocka });
    forsok(motor, true); klocka = 2000;
    sparaPassbild({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-00', pass: 2, nu: 2500 });
    klocka = 3000; for (let i = 0; i < 6; i++) forsok(motor, true); // en vuxen spelar snabbt: nivån går upp
    expect(motor.niva('L', 'P1_las_och_valj')).toBe(4);
    expect(aterstallLarande({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-00', pass: 2, forstaPasset: false })).toBe('bild');
    expect(motor.niva('L', 'P1_las_och_valj')).toBe(2);
    expect(t.spelare.larande.historik).toHaveLength(1);
    expect(t.spelare.larande.historik[0].nar).toBe(1000);
  });

  it('bilderna av passen efter tas bort, och samma pass får en ny bild när det spelas igen', () => {
    const t = nyttTillstand('test');
    for (const [k, p, nu] of [['kap-00', 1, 1], ['kap-00', 2, 2], ['kap-00', 3, 3], ['kap-01', 1, 4]]) sparaPassbild({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: k, pass: p, nu });
    expect(aventyrFor(t, AV).passbilder.map((b) => `${b.kapitel}:${b.pass}`)).toEqual(['kap-00:1', 'kap-00:2', 'kap-00:3', 'kap-01:1']);
    aterstallLarande({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-00', pass: 2, forstaPasset: false });
    expect(aventyrFor(t, AV).passbilder.map((b) => `${b.kapitel}:${b.pass}`)).toEqual(['kap-00:1', 'kap-00:2']);
    sparaPassbild({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-00', pass: 2, nu: 9 });
    expect(aventyrFor(t, AV).passbilder.filter((b) => b.pass === 2 && b.kapitel === 'kap-00').map((b) => b.tid)).toEqual([9]);
  });

  it('äventyrets första pass utan bild: lärandet börjar om helt (inget var lärt när äventyret började)', () => {
    const t = nyttTillstand('test');
    const motor = skapaLasmotor({ larande: t.spelare.larande });
    for (let i = 0; i < 3; i++) forsok(motor, true);
    expect(aterstallLarande({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-00', pass: 1, forstaPasset: true })).toBe('borjan');
    expect(t.spelare.larande.lasning).toEqual({});
    expect(t.spelare.larande.historik).toEqual([]);
  });

  it('ett senare pass utan bild (en sparning från före bilderna): lärandet står kvar, och det sägs', () => {
    const t = nyttTillstand('test');
    const motor = skapaLasmotor({ larande: t.spelare.larande });
    for (let i = 0; i < 3; i++) forsok(motor, true);
    const fore = JSON.stringify(t.spelare.larande);
    expect(aterstallLarande({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-01', pass: 1, forstaPasset: false })).toBe('ingen');
    expect(JSON.stringify(t.spelare.larande)).toBe(fore);
  });

  it('bilden är en kopia: det som händer efteråt ändrar den inte', () => {
    const t = nyttTillstand('test');
    const motor = skapaLasmotor({ larande: t.spelare.larande });
    forsok(motor, true);
    sparaPassbild({ tillstand: t, aventyrId: AV, kapitelOrdning: ORDNING, kapitelId: 'kap-00', pass: 2, nu: Date.now() });
    for (let i = 0; i < 5; i++) forsok(motor, true);
    expect(aventyrFor(t, AV).passbilder[0].larande.lasning.P1_las_och_valj.niva).toBe(2);
  });

  it('passens ordning och den första scenen i ett pass', () => {
    expect(passOrdning(ORDNING, 'kap-01', 1)).toBeGreaterThan(passOrdning(ORDNING, 'kap-00', 3));
    const k = { scener: [{ pass: 1 }, { pass: 1 }, { pass: 2, frivillig: true }, { pass: 2 }, { pass: 2 }] };
    expect([0, 1, 2, 3, 4].map((i) => forstaIPasset(k, i))).toEqual([true, false, false, true, false]);
  });
});
