// Navet i berättelsen (2.31, kapitel 2 del 3): grenar i valfri ordning, stegen mellan grenarna, passet efter navets
// sparpunkt, "Var var vi?" med villkor och uppdragslappen. Ett påhittat kapitel.
import { describe, it, expect } from 'vitest';
import { skapaBerattelse, spolaFram, grenarI, passEfterNavet } from '../../src/karna/berattelse.js';
import { nyttTillstand, aventyrFor } from '../../src/karna/sparning.js';
import { varVarVi } from '../../src/karna/varvarvi.js';
import { kompileraUppdrag, lappenNu } from '../../src/karna/uppdrag.js';

const AV = 'provet';
const R = (text) => ({ typ: 'replik', talare: 'berattare', text, upplast: true });
const kapitel = () => ({
  id: 'kap-x',
  rum: [{ id: 'torg', tillstand: ['rep', 'fri'], innehall: [] }, { id: 'brygga', innehall: [] }, { id: 'vass', innehall: [] }, { id: 'damm', innehall: [] }],
  pussel: [{ id: 'skyltar', typ: 'P1_las_och_valj', tillstand_efter: 'fri' }],
  scener: [
    { id: 'a', pass: 1, rum: 'torg', steg: [R('A1'), { typ: 'sparpunkt', pass_slut: true }] },
    { id: 'navet', pass: 2, rum: 'torg', tillstand: 'rep', vid_omstart: { talare: 'farfar', text: 'Var var vi? Skyltarna.' }, steg: [
      { typ: 'pussel', pussel_id: 'skyltar' },
      R('Hitta halvorna!'),
      { typ: 'nav', grenar: [{ scen: 'g1', mal: 'stig_brygga' }, { scen: 'g2', mal: 'stig_vass' }],
        mellan_grenar: [R('Hämta den andra!'), { typ: 'sparpunkt', pass_slut: true }, R('Hitta den andra!')], knuff: { handling: 'ungen springer' } },
    ] },
    { id: 'g1', pass: 2, rum: 'brygga', vid_omstart: { talare: 'farfar', text: 'Var var vi? Bryggan.' }, steg: [R('G1a'), R('G1b')] },
    { id: 'g2', pass: 2, rum: 'vass', vid_omstart: { talare: 'farfar', text: 'Var var vi? Vassen.' }, steg: [R('G2a'), R('G2b')] },
    { id: 'friv', pass: 2, rum: 'damm', frivillig: true, startar_i_rum: 'damm', steg: [R('F')] },
    { id: 'c', pass: 3, rum: 'torg', tillstand: 'fri', steg: [R('C1')] },
  ],
  var_var_vi: [{ pass: 3, kort: [R('En halva är kvar.')], lang: [R('Lång.'), { ...R('Den andra är vid bryggan!'), villkor: { gren_kvar: 'g1' } }, { ...R('Den andra är i vassen!'), villkor: { gren_kvar: 'g2' } }] }],
  uppdrag: [{ id: 'u', rubrik: 'BREVET', bild: 'x', pass: 2, steg: [
    { text: 'REP', klart: { scen: 'navet', pussel: 'skyltar' } },
    { text: 'BRYGGAN', klart: { scen: 'g1', replik: 'G1b' } },
    { text: 'VASSEN', klart: { scen: 'g2', replik: 'G2b' } },
  ], stampel: { scen: 'c', efter: { replik: 'C1' } } }],
});
const ny = (k, t = nyttTillstand('t')) => ({ t, b: skapaBerattelse({ aventyr: {}, kapitel: k, tillstand: t, aventyrId: AV }) });
/** Spela till steget med den texten (eller typen), utan att välja gren. */
const till = (b, vad) => { for (let i = 0; i < 40 && !b.slut; i++) { const st = b.aktuellt(); if (st.text === vad || st.typ === vad) return st; b.klar({}); } throw new Error('hittade inte ' + vad); };
/** Texterna och stegtyperna i tur och ordning, med en gren vald vid navet. */
const spela = (b, gren, n) => { const ut = []; for (let i = 0; i < n && !b.slut; i++) { const st = b.aktuellt(); ut.push(st.text ?? st.typ); b.klar(st.typ === 'nav' ? { gren } : {}); } return ut; };

describe('navet (2.31)', () => {
  it('grenarna i valfri ordning, stegen mellan dem, och sedan scenen efter navet (inte en gren, inte den frivilliga)', () => {
    const k = kapitel(); const { t, b } = ny(k);
    till(b, 'nav');
    expect(b.navLage()).toMatchObject({ scen: 'navet', klara: [] });
    b.klar({ gren: 'g2' });
    expect(b.scen.id).toBe('g2');
    expect(spela(b, null, 2)).toEqual(['G2a', 'G2b']);
    // tillbaka i navet: stegen mellan grenarna, och passet byts vid navets sparpunkt
    expect(b.scen.id).toBe('navet');
    expect(b.navLage()).toMatchObject({ klara: ['g2'], mellan: true });
    expect(b.pass).toBe(2);
    expect(spela(b, null, 2)).toEqual(['Hämta den andra!', 'sparpunkt']);
    expect(b.pass).toBe(3);
    expect(aventyrFor(t, AV).pass).toBe(3);
    expect(b.aktuellt().text).toBe('Hitta den andra!');
    b.klar({});
    expect(b.aktuellt().typ).toBe('nav');
    // en gren som redan är klar går inte att välja igen: den andra spelas
    b.klar({ gren: 'g2' });
    expect(b.scen.id).toBe('g1');
    expect(b.pass).toBe(3);
    expect(spela(b, null, 2)).toEqual(['G1a', 'G1b']);
    // båda klara: navet är slut, och berättelsen går till c
    expect(b.scen.id).toBe('c');
    expect(b.navLage()).toBeNull();
    expect(b.pass).toBe(3);
  });

  it('rummets tillstånd efter ett pussel (tillstand_efter, 2.33) står kvar när han kommer tillbaka till navet och efter en omstart', () => {
    const k = kapitel(); const { t, b } = ny(k);
    till(b, 'nav');
    const av = aventyrFor(t, AV);
    expect(av.rumstillstand.torg).toBe('fri'); // repen har fallit
    b.klar({ gren: 'g1' }); spela(b, null, 2);
    expect(b.scen.id).toBe('navet');
    expect(av.rumstillstand.torg).toBe('fri');
    const om = skapaBerattelse({ aventyr: {}, kapitel: k, tillstand: t, aventyrId: AV });
    expect(om.scen.id).toBe('navet');
    expect(av.rumstillstand.torg).toBe('fri');
  });

  it('omstart efter navets sparpunkt: vid_omstart, sedan stegen efter sparpunkten och navet, i pass 3', () => {
    const k = kapitel(); const { t, b } = ny(k);
    till(b, 'nav'); b.klar({ gren: 'g1' }); spela(b, null, 2); spela(b, null, 2); // G1a, G1b, Hämta, sparpunkt
    const om = skapaBerattelse({ aventyr: {}, kapitel: k, tillstand: JSON.parse(JSON.stringify(t)), aventyrId: AV });
    expect(om.aktuellt()).toMatchObject({ omstart: true });
    expect(om.pass).toBe(3);
    om.klar({});
    expect(om.aktuellt().text).toBe('Hitta den andra!');
    om.klar({});
    expect(om.aktuellt().typ).toBe('nav');
    om.klar({});
    expect(om.scen.id).toBe('g2');
  });

  it('omstart mitt i en gren: grenens vid_omstart, och efter grenen navet', () => {
    const k = kapitel(); const { t, b } = ny(k);
    till(b, 'nav'); b.klar({ gren: 'g1' }); b.aktuellt(); b.klar({}); // G1a är klar
    const om = skapaBerattelse({ aventyr: {}, kapitel: k, tillstand: JSON.parse(JSON.stringify(t)), aventyrId: AV });
    expect(om.scen.id).toBe('g1');
    expect(om.aktuellt()).toMatchObject({ omstart: true, text: 'Var var vi? Bryggan.' });
    om.klar({});
    expect(spela(om, null, 1)).toEqual(['G1b']);
    expect(om.scen.id).toBe('navet');
    expect(om.navLage()).toMatchObject({ klara: ['g1'], mellan: true });
  });

  it('ett hopp till en gren (menyn för vuxna): grenen spelas som om han valt den, och de andra grenarna spolas inte fram', () => {
    const k = kapitel(); const t = nyttTillstand('t');
    const av = aventyrFor(t, AV); av.scen = 3; av.scenId = 'g2'; av.startad = false;
    spolaFram({ kapitel: k, tillstand: t, aventyrId: AV, tillScen: 'g2' });
    const b = skapaBerattelse({ aventyr: {}, kapitel: k, tillstand: t, aventyrId: AV });
    expect(b.scen.id).toBe('g2');
    expect(b.navLage()).toMatchObject({ scen: 'navet', klara: [], gren: 'g2' });
    const { b: b2 } = ny(kapitel());
    b2.hoppaTill(2);
    expect(b2.navLage()).toMatchObject({ gren: 'g1' });
    b2.hoppaTill(5);
    expect(b2.navLage()).toBeNull();
  });

  it('grenarna och passet efter navet räknas ur kapitlet', () => {
    const k = kapitel();
    expect([...grenarI(k).keys()]).toEqual(['g1', 'g2']);
    expect(grenarI(k).get('g1')).toEqual({ nav: 'navet', steg: 2 });
    expect(passEfterNavet(k, 1)).toBe(3);
  });
});

describe('"Var var vi?" i navet', () => {
  it('pass 3 efter navets sparpunkt, och bara repliken om grenen som är kvar', () => {
    const k = kapitel();
    const lang = varVarVi({ kapitel: k, scenIndex: 1, steg: 2, senast: 0, nu: 10 * 864e5, pass: 3, borjar: true, klara: ['g2'] });
    expect(lang.repliker.map((r) => r.text)).toEqual(['Lång.', 'Den andra är vid bryggan!']);
    expect(lang.ersatterOmstart).toBe(true);
    const kort = varVarVi({ kapitel: k, scenIndex: 1, steg: 2, senast: 5, nu: 10, pass: 3, borjar: true, klara: ['g1'] });
    expect(kort.repliker.map((r) => r.text)).toEqual(['En halva är kvar.']);
    // mitt i en gren, kort tid: ingen påminnelse
    expect(varVarVi({ kapitel: k, scenIndex: 2, steg: 1, senast: 5, nu: 10, pass: 3, borjar: false, klara: [] })).toBeNull();
  });
});

describe('uppdragslappen med grenar', () => {
  it('ett steg i en gren är gjort när grenen är klar, i vilken ordning han än tar dem', () => {
    const k = kapitel();
    const { lista } = kompileraUppdrag(k);
    const alla = new Set([2, 3]);
    // i navet efter vassen (g2): bryggan är kvar, vassen är gjord fast den står efter i kapitlet
    const l = lappenNu(lista, [1, 2], new Set(), { alla, klara: new Set([3]) });
    expect(l.gjorda.map((s) => s.text)).toEqual(['REP', 'VASSEN']);
    expect(l.nu.text).toBe('BRYGGAN');
    expect(l.kvar).toBe(1);
    // i bryggan efter vassen
    const l2 = lappenNu(lista, [2, 0], new Set(), { alla, klara: new Set([3]) });
    expect(l2.gjorda.map((s) => s.text)).toEqual(['REP', 'VASSEN']);
    // i vassen först: bryggan står före i kapitlet men är inte gjord
    const l3 = lappenNu(lista, [3, 0], new Set(), { alla, klara: new Set() });
    expect(l3.gjorda.map((s) => s.text)).toEqual(['REP']);
    expect(l3.kvar).toBe(2);
  });
});

describe('kapitel 2 del 4: ordet han skrev och variantens krav', () => {
  it('{ord:<pussel>} är ordet han skrev, och annars pusslets svar', async () => {
    const { forSkarm } = await import('../../src/karna/text.js');
    const k = kapitel();
    k.pussel.push({ id: 'k2_over', typ: 'P11_formel', skriv: 'tangentbord', svar: 'BRO' });
    const { t, b } = ny(k);
    expect(forSkarm('Du skrev {ord:k2_over} och FLYG.', { varden: b.varden() })).toEqual(['DU SKREV BRO OCH FLYG.']);
    aventyrFor(t, AV).skrivet.k2_over = 'FLOTTE';
    expect(forSkarm('Du skrev {ord:k2_over}.', { varden: b.varden(), skrift: 'vanlig' })).toEqual(['Du skrev Flotte.']);
  });
  it('en variant med kraver gäller bara när det pusslet är löst i varianten, annars närmaste lägre', async () => {
    const { nivaMedKrav } = await import('../../src/karna/lasmotor.js');
    const varianter = { L3: { text: 'a' }, L4: { text: 'b', kraver: { pussel: 'k2_grodan', variant: 'L4' } } };
    expect(nivaMedKrav(varianter, 4, () => false)).toBe(3);
    expect(nivaMedKrav(varianter, 4, (p, v) => p === 'k2_grodan' && v === 'L4')).toBe(4);
    expect(nivaMedKrav(varianter, 3, () => false)).toBe(3);
    expect(nivaMedKrav(varianter, 7, () => false)).toBe(3);
  });
});
