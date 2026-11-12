// @ts-check
// Budgeten per pass och kapitel (beslut 76.3): kontrollen varnar från kapitel 2.
import { describe, it, expect } from 'vitest';
import { budgetVarningar, rattArUdda, talareI } from '../../verktyg/innehall/budget.js';

const R = (/** @type {string} */ text, talare = 'farfar') => ({ typ: 'replik', talare, text });
const M = { typ: 'mellanscen', beskrivning: 'Något händer.' };
const P = (/** @type {string} */ id) => ({ typ: 'pussel', pussel_id: id });
const SLUT = { typ: 'sparpunkt', pass_slut: true };
const pussel = [
  { id: 'las', typ: 'P1_las_och_valj', varianter: { L3: { alternativ: [{ id: 'groda_liten_gul', ratt: true }, { id: 'groda_stor_gul' }, { id: 'groda_liten_gron' }, { id: 'groda_stor_gron' }] } } },
  { id: 'skriv1', typ: 'P11_formel' }, { id: 'skriv2', typ: 'P11_formel' }, { id: 'skriv3', typ: 'P11_formel' },
  { id: 'hugg', typ: 'P26_krukorna' },
];
/** Ett kapitel som håller budgeten: ett pass med läsval, vila och en skrivuppgift, baronen, mamma och en frivillig formel. */
const bra = () => ({
  id: 'kap-x', pussel: structuredClone(pussel),
  scener: [
    { id: 's1', pass: 1, steg: [R('Hej.'), R('Mamma väntar.', 'unge'), P('las'), M, P('hugg'), R('Ha!', 'baronen'), P('skriv1'), SLUT] },
    { id: 'f', pass: 1, frivillig: true, steg: [P('skriv2')] },
  ],
  rum: [],
});

describe('budgeten (76.3)', () => {
  it('ett kapitel som håller budgeten ger inga varningar', () => {
    expect(budgetVarningar(bra(), { tidigareTalare: new Set(['farfar', 'unge', 'baronen']) })).toEqual([]);
  });
  it('per pass: läsval, vila, högst två skrivuppgifter, aldrig två i rad', () => {
    const k = bra();
    k.scener[0].steg = [P('skriv1'), P('skriv2'), P('skriv3'), R('Ha!', 'baronen'), R('Mamma.'), SLUT];
    const v = budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) }).join('\n');
    expect(v).toMatch(/pass 1: inget läsval/);
    expect(v).toMatch(/pass 1: ingen vila/);
    expect(v).toMatch(/pass 1: 3 skrivuppgifter, högst 2/);
    expect(v).toMatch(/två skrivuppgifter i rad i pass 1/);
  });
  it('högst tre repliker innan han gör något, och högst fem passiva steg i rad', () => {
    const k = bra();
    k.scener[0].steg = [R('1'), R('2'), R('3'), R('4 mamma'), M, M, P('las'), P('hugg'), R('Ha!', 'baronen'), SLUT];
    const v = budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) }).join('\n');
    expect(v).toMatch(/s1 steg 4: fler än 3 repliker/);
    expect(v).toMatch(/s1 steg 6: fler än 5 steg i rad/);
  });
  it('räknat som i 08 (78.3): ljud och visa_foremal är inte passiva steg och bryter ingen följd', () => {
    const k = bra();
    const L = { typ: 'ljud', id: 'plopp' }, V = { typ: 'visa_foremal', foremal: 'x' };
    k.scener[0].steg = [R('1 mamma'), L, R('2'), V, L, R('3'), M, L, V, M, P('las'), P('hugg'), R('Ha!', 'baronen'), P('skriv1'), SLUT];
    expect(budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) })).toEqual([]);
    // en replik till ger fyra repliker och sex passiva, oavsett ljuden emellan
    k.scener[0].steg.splice(6, 0, L, R('4'));
    const v = budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) }).join('\n');
    expect(v).toMatch(/fler än 3 repliker/);
    expect(v).toMatch(/fler än 5 steg i rad/);
  });
  it('att leta efter ett dolt mål (ga_till med leta) är vila (78.3)', () => {
    const k = bra();
    k.scener[0].steg = [R('Mamma.'), P('las'), { typ: 'ga_till', mal: 'halvan', leta: true }, R('Ha!', 'baronen'), P('skriv1'), SLUT];
    expect(budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) })).toEqual([]);
    k.scener[0].steg[2] = { typ: 'ga_till', mal: 'halvan' };
    expect(budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) }).join('\n')).toMatch(/pass 1: ingen vila/);
  });
  it('två skrivuppgifter med ny plats och ny tid emellan är inte i rad (78.3)', () => {
    const k = bra();
    k.scener = [
      { id: 'huset', pass: 1, rum: 'hus', steg: [R('Mamma.'), P('las'), P('hugg'), R('Ha!', 'baronen'), P('skriv1')] },
      { id: 'kvall', pass: 1, rum: 'byn', tillstand: 'kvall', steg: [M, P('skriv2'), SLUT] },
      { id: 'f', pass: 1, frivillig: true, steg: [P('skriv3')] },
    ];
    expect(budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) })).toEqual([]);
    // samma plats, ny tid: i rad
    k.scener[1].rum = 'hus';
    expect(budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'baronen']) }).join('\n')).toMatch(/två skrivuppgifter i rad/);
  });
  it('per kapitel: nya figurer, frivillig formel, baronen och mamma', () => {
    const k = bra();
    k.scener = [{ id: 's1', pass: 1, steg: [R('Hej.', 'tant'), R('Hej.', 'bo'), P('las'), P('hugg'), SLUT] }];
    const v = budgetVarningar(k, { tidigareTalare: new Set(['farfar']) }).join('\n');
    expect(v).toMatch(/2 nya figurer som talar \(tant, bo\)/);
    expect(v).toMatch(/ingen frivillig formel/);
    expect(v).toMatch(/baronen talar inte/);
    expect(v).toMatch(/inget ögonblick med mamma/);
  });
  it('varje gren i ett nav har en egen uppgift', () => {
    const k = bra();
    k.scener.push({ id: 'nav', pass: 2, steg: [{ typ: 'nav', grenar: [{ scen: 'g1', mal: 'x' }, { scen: 'g2', mal: 'y' }], mellan_grenar: [SLUT] }] },
      { id: 'g1', pass: 2, steg: [R('Titta.'), M] }, { id: 'g2', pass: 2, steg: [P('las')] });
    expect(budgetVarningar(k, { tidigareTalare: new Set(['farfar', 'unge', 'baronen']) }).join('\n')).toMatch(/grenen g1 har ingen egen uppgift/);
  });
  it('rätt svar är aldrig det enda udda: likadana distraktorer, eller målet delar ett drag med varje distraktor', () => {
    expect(rattArUdda([{ id: 'hog_sten', ratt: true }, { id: 'lag_sten' }, { id: 'lag_sten_2' }])).toBe(true);
    expect(rattArUdda([{ id: 'hog_rund_sten', ratt: true }, { id: 'hog_spetsig_sten' }, { id: 'lag_rund_sten' }])).toBe(true);
    expect(rattArUdda([{ id: 'groda_liten_gul', ratt: true }, { id: 'groda_stor_gul' }, { id: 'groda_liten_gron' }, { id: 'groda_stor_gron' }])).toBe(false);
    expect(rattArUdda([{ id: 'skylt_vassen' }, { id: 'skylt_brunnen' }, { id: 'skylt_bryggan', ratt: true }])).toBe(false);
    expect(rattArUdda([{ id: 'ja', ratt: true }, { id: 'nej' }])).toBe(false);
  });
  it('talarna i ett kapitel, också i navet, i frivilliga föremål och i zoner', () => {
    const k = { scener: [{ steg: [R('a', 'x'), { typ: 'nav', mellan_grenar: [R('b', 'y')] }] }], rum: [{ frivilligt: [{ steg: [R('c', 'z')] }], zoner: [{ steg: [R('d', 'w')] }] }] };
    expect([...talareI(k)].sort()).toEqual(['w', 'x', 'y', 'z']);
  });
});
