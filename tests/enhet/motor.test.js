import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skapaLasmotor, valjVariant } from '../../src/karna/lasmotor.js';
import { ljudningsdelar } from '../../src/karna/ljudning.js';
import { skapaValj, skapaFormel, skapaDop, skapaKrukor } from '../../src/karna/pussel.js';
import { skapaBerattelse } from '../../src/karna/berattelse.js';
import { nyttTillstand, aventyrFor, migrera } from '../../src/karna/sparning.js';
const AVENTYR = 'den-gomda-dalen';

const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));
const aventyr = las('den-gomda-dalen/aventyr.json');
const prolog = las('den-gomda-dalen/kap-00.json');
const P = (id) => prolog.pussel.find((p) => p.id === id);
const fast = () => 0.42; // förutsägbar "slump"

describe('läsmotorn', () => {
  it('3 rätt i rad → upp, 2 fel i rad → ned', () => {
    const larande = {}; const m = skapaLasmotor({ larande });
    const r = (ratt, hjalp = false) => m.registrera({ pussel_id: 'x', typ: 'P1_las_och_valj', niva: 'L2', ratt, antal_forsok: 1, hjalp_anvand: hjalp, tid: 1000 });
    expect(m.niva('L', 'P1_las_och_valj')).toBe(2);
    r(true); r(true); expect(m.niva('L', 'P1_las_och_valj')).toBe(2);
    r(true); expect(m.niva('L', 'P1_las_och_valj')).toBe(3);
    r(false); r(false); expect(m.niva('L', 'P1_las_och_valj')).toBe(2);
    r(true, true); expect(larande.lasning.P1_las_och_valj.streak).toBe(0);
    expect(larande.historik).toHaveLength(6);
  });
  it('gemener räknas för sig', () => {
    const m = skapaLasmotor({ larande: {} });
    for (let i = 0; i < 2; i++) m.registrera({ pussel_id: 'x', typ: 'P1_las_och_valj', niva: 'L2', ratt: false, antal_forsok: 2, hjalp_anvand: false, tid: 1, gemener: true });
    expect(m.niva('L', 'P1_las_och_valj', true)).toBe(1);
    expect(m.niva('L', 'P1_las_och_valj')).toBe(2);
  });
  it('variant: högsta som inte är över nivån, annars lägsta', () => {
    const v = { L2: 'två', L3: 'tre' };
    expect(valjVariant(v, 1)[0]).toBe('L2');
    expect(valjVariant(v, 2)[0]).toBe('L2');
    expect(valjVariant(v, 5)[0]).toBe('L3');
  });
});

describe('ljudningen', () => {
  it('ljudar bokstav för bokstav och sedan hela ordet', () => {
    expect(ljudningsdelar('filt').map((d) => d.text)).toEqual(['fff', 'i', 'lll', 'tö', 'filt!']);
    expect(ljudningsdelar('bär').at(-1)).toEqual({ text: 'bär!', lyser: 'alla' });
  });
  it('helord ljudas aldrig', () => {
    expect(ljudningsdelar('LJUS', { helord: true })).toEqual([{ text: 'ljus!', lyser: 'alla' }]);
  });
});

describe('pusslen', () => {
  it('läs och välj: fel, förenkling efter 2 fel, ungen pekar efter 3, aldrig automatisk lösning', () => {
    const p = skapaValj(P('p0_dinomat'), { niva: 3, slump: fast });
    expect(p.s.variantNyckel).toBe('L3');
    expect(p.valj('liten_rod').resultat).toBe('fel');
    const andra = p.valj('stor_bla');
    expect(andra.forenklad).toBe(true);
    expect(p.s.variantNyckel).toBe('L2'); // L3 byts mot L2
    expect(p.valj('bla').resultat).toBe('fel');
    expect(p.s.pekar).toBe('rod');
    expect(p.s.klar).toBe(false);
    expect(p.valj('rod').resultat).toBe('klar');
    expect(p.forstaForsoket).toBe(false);
  });
  it('läs och välj utan lägre variant: en distraktor tas bort, två alternativ kvar', () => {
    const p = skapaValj(P('p0_filt'), { niva: 2, slump: fast });
    p.valj('bil'); p.valj('ost');
    expect(p.s.alternativ).toHaveLength(2);
    expect(p.s.alternativ.some((a) => a.id === 'filt')).toBe(true);
  });
  it('dörrarna: förenklingen spikar igen de dörrar han redan har prövat, två dörrar finns kvar', () => {
    for (const slump of [fast, () => 0.99, () => 0.5]) {
      const p = skapaValj(P('p0_dorrar'), { niva: 1, slump });
      p.valj('bad'); const r = p.valj('toa');
      expect(r.forenklad).toBe(true);
      expect(p.s.alternativ.map((a) => a.id).sort()).toEqual(['mat', 'sov']); // den oprövade fel dörren står kvar
    }
  });
  it('förenklingen tar aldrig bort så många att bara det rätta är kvar', () => {
    const p = skapaValj(P('p0_filt'), { niva: 1, slump: fast });
    p.valj('bil'); p.valj('bil');
    expect(p.s.alternativ.length).toBeGreaterThanOrEqual(2);
  });
  it('felreaktionen kommer från alternativet', () => {
    const p = skapaValj(P('p0_filt'), { niva: 1, slump: fast });
    expect(p.valj('bil').reaktion.reaktion).toMatch(/leksaksbil/);
  });
  it('packa: alla rätt behövs, fel studsar', () => {
    const p = skapaValj(P('p0_packlista'), { niva: 1, slump: fast });
    expect(p.valj('filt').resultat).toBe('ratt');
    expect(p.valj('filt').resultat).toBe('redan');
    expect(p.valj('bil').resultat).toBe('fel');
    expect(p.valj('bar').resultat).toBe('ratt');
    expect(p.valj('rep').resultat).toBe('klar');
  });
  it('formel: rätt bokstav stannar, fel går tillbaka, tips efter 2 fel', () => {
    const f = skapaFormel(P('p0_ljus'), { slump: fast });
    const id = (b) => f.s.brickor.find((x) => x.bokstav === b).id;
    f.lagg(id('L')); f.lagg(id('U')); f.lagg(id('J'));
    expect(f.lagg(id('S')).resultat).toBe('fel');
    expect(f.s.platser.map((x) => x !== null)).toEqual([true, false, false, true]);
    f.lagg(id('U')); expect(f.lagg(id('J')).resultat).toBe('fel');
    expect(f.s.tips).toBe(id('J'));
    expect(f.skriv('j').resultat).toBe('lagd');
    expect(f.skriv('U').resultat).toBe('klar');
  });
  it('dop: versaler, max 10, bara bokstäver', () => {
    const d = skapaDop(P('p0_ungenamn'));
    expect(d.kanKlar).toBe(false);
    for (const b of 'knopp7åsa') d.skriv(b);
    expect(d.s.namn).toBe('KNOPPÅSA');
    for (const b of 'XXXXX') d.skriv(b);
    expect(d.s.namn).toHaveLength(10);
    expect(d.klar()).toBe('KNOPPÅSAXX');
  });
  it('krukorna: kartbiten kommer alltid sist', () => {
    for (const ordning of [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [2, 0, 4, 1, 3]]) {
      const k = skapaKrukor(P('p0_krukor'));
      const fynd = ordning.map((i) => k.sla(i));
      expect(fynd.at(-1)).toBe('kartbit_1');
      expect(fynd.slice(0, 4).sort()).toEqual(['bar', 'bar', 'tom', 'tom']);
      expect(k.s.klar).toBe(true);
    }
  });
});

describe('berättelsemotorn', () => {
  /** Spela tills villkoret är sant. Pussel löses direkt. */
  function spela(b, tills = () => false, max = 500) {
    const set = [];
    for (let i = 0; i < max && !b.slut; i++) {
      const st = b.aktuellt();
      set.push({ scen: b.scen.id, typ: st.typ, st });
      if (tills(st, b)) return set;
      const p = st.typ === 'pussel' ? b.pussel(st.pussel_id) : null;
      b.klar(p && p.typ === 'P12_dop' ? { namn: p.sparas_som === 'unge.namn' ? 'KNOPP' : 'TESTA' } : {});
    }
    return set;
  }

  it('spelar hela prologen: namn, formel, bär, kartbit, grad, tre pass', () => {
    const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr, kapitel: prolog, tillstand: t, aventyrId: AVENTYR });
    const steg = spela(b);
    const av = t.aventyr[AVENTYR];
    expect(b.slut).toBe(true);
    expect(t.spelare.hjalte.namn).toBe('TESTA');
    expect(t.spelare.unge.namn).toBe('KNOPP');
    expect(t.spelare.hjalte.formler).toEqual(['LJUS']);
    expect(t.spelare.hjalte.grad).toBe('Lärling');
    expect(av.bar).toBe(3);
    expect(av.kartbitar).toEqual([1]);
    expect(av.ui).toMatchObject({ nosknappen: true, barraknaren: true, radioramen: true });
    expect(steg.filter((s) => s.typ === 'sparpunkt')).toHaveLength(3);
    expect(av.lappar).toEqual(expect.arrayContaining(['p0_dinomat', 'p0_packlista']));
  });

  it('formeln tänder vinden, och scenen efter behåller ljuset', () => {
    const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr, kapitel: prolog, tillstand: t, aventyrId: AVENTYR });
    spela(b, (st, bb) => bb.scen.id === 's03_staven' && st.typ === 'pussel');
    expect(b.rumsTillstand('vinden')).toBe('natt');
    b.klar({});
    spela(b, (st, bb) => bb.scen.id === 's05_klackningen');
    expect(b.rumsTillstand('vinden')).toBe('natt_upplyst');
  });

  it('startar om vid sparad scen med vid_omstart', () => {
    const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr, kapitel: prolog, tillstand: t, aventyrId: AVENTYR });
    spela(b, (st, bb) => bb.scen.id === 's09_lappen');
    const igen = skapaBerattelse({ aventyr, kapitel: prolog, tillstand: JSON.parse(JSON.stringify(t)), aventyrId: AVENTYR });
    expect(igen.scen.id).toBe('s09_lappen');
    const forsta = igen.aktuellt();
    expect(forsta).toMatchObject({ typ: 'replik', omstart: true, talare: 'farfar' });
    igen.klar();
    expect(igen.aktuellt().text).toBe('Dinomaten är på vinden.');
  });

  it('en sparning hamnar i samma scen även när innehållet har fått nya scener före den', () => {
    const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr, kapitel: prolog, tillstand: t, aventyrId: AVENTYR });
    spela(b, (st, bb) => bb.scen.id === 's11_ladorna');
    const kopia = JSON.parse(JSON.stringify(t));
    const fler = { ...prolog, scener: [prolog.scener[0], { id: 's00b_ny', pass: 1, rum: null, steg: [{ typ: 'ljud', id: 'dunk' }] }, ...prolog.scener.slice(1)] };
    expect(skapaBerattelse({ aventyr, kapitel: fler, tillstand: kopia, aventyrId: AVENTYR }).scen.id).toBe('s11_ladorna');
  });

  it('en helt ny start spelar inte vid_omstart', () => {
    const b = skapaBerattelse({ aventyr, kapitel: prolog, tillstand: nyttTillstand('t'), aventyrId: AVENTYR });
    expect(b.aktuellt().typ).toBe('mellanscen');
  });
});

describe('formeln med dra och släpp', () => {
  const P = (id) => JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8')).pussel.find((p) => p.id === id);
  it('dra till valfri plats, flytta om, ta tillbaka', () => {
    const f = skapaFormel(P('p0_ljus'), { slump: () => 0.42 });
    const id = (b) => f.s.brickor.find((x) => x.bokstav === b).id;
    expect(f.laggPa(id('S'), 3).resultat).toBe('lagd');
    expect(f.laggPa(id('U'), 1).resultat).toBe('lagd');
    expect(f.laggPa(id('U'), 2).resultat).toBe('lagd'); // flyttad: plats 1 blir tom
    expect(f.s.platser[1]).toBeNull();
    expect(f.taBort(2)).toBe(true);
    f.laggPa(id('U'), 2); f.laggPa(id('J'), 1);
    expect(f.laggPa(id('L'), 0).resultat).toBe('klar');
  });
  it('två bokstäver byter plats när man drar den ena på den andra', () => {
    const f = skapaFormel(P('p0_ljus'), { slump: () => 0.42 });
    const id = (b) => f.s.brickor.find((x) => x.bokstav === b).id;
    f.laggPa(id('J'), 0); f.laggPa(id('L'), 1);
    f.laggPa(id('J'), 1); // J dras till L:s plats → de byter
    expect(f.s.platser.slice(0, 2)).toEqual([id('L'), id('J')]);
  });
  it('låsta (rätta) bokstäver går inte att flytta', () => {
    const f = skapaFormel(P('p0_ljus'), { slump: () => 0.42 });
    const id = (b) => f.s.brickor.find((x) => x.bokstav === b).id;
    f.laggPa(id('L'), 0); f.laggPa(id('U'), 1); f.laggPa(id('J'), 2);
    expect(f.laggPa(id('S'), 3).resultat).toBe('fel'); // L rätt och låst, U och J tillbaka
    expect(f.s.last[0]).toBe(true);
    expect(f.taBort(0)).toBe(false);
    expect(f.laggPa(id('U'), 0).resultat).toBe('ingen');
  });
});

describe('fortsätt där man var, och stabila id:n', () => {
  const kopiera = (x) => JSON.parse(JSON.stringify(x));
  const ny = (t, kap = prolog) => skapaBerattelse({ aventyr, kapitel: kap, tillstand: t, aventyrId: AVENTYR });
  function spelaTill(b, scenId, stegNr) {
    for (let i = 0; i < 500 && !(b.scen.id === scenId && b.stegIndex === stegNr); i++) {
      const st = b.aktuellt(); const p = st.typ === 'pussel' ? b.pussel(st.pussel_id) : null;
      b.klar(p && p.typ === 'P12_dop' ? { namn: 'KNOPP' } : {});
    }
  }
  it('fortsätter på samma steg mitt i en scen, efter "Var var vi?"', () => {
    const t = nyttTillstand('t'); const b = ny(t);
    spelaTill(b, 's09_lappen', 4);
    const igen = ny(kopiera(t));
    expect(igen.aktuellt()).toMatchObject({ omstart: true });
    igen.klar();
    expect(igen.scen.id).toBe('s09_lappen');
    expect(igen.stegIndex).toBe(4);
  });
  it('ett steg som ger något ger det bara en gång, även om spelet startas om mitt i steget', () => {
    const t = nyttTillstand('t'); const b = ny(t);
    spelaTill(b, 's12_pasarna', 3); // ge_bar 3
    b.aktuellt();
    const bar = aventyrFor(t, AVENTYR).bar;
    const t2 = kopiera(t); const igen = ny(t2);
    igen.aktuellt(); // vid_omstart eller steget
    if (igen.stegIndex === -1) { igen.klar(); igen.aktuellt(); }
    expect(t2.aventyr[AVENTYR].bar).toBe(bar);
  });
  it('ett omdöpt scen-id följer sitt alias, en borttagen scen börjar om i samma pass', () => {
    const t = nyttTillstand('t'); const b = ny(t);
    spelaTill(b, 's12_pasarna', 1);
    const omdopt = { ...prolog, alias: { scener: { s12_pasarna: 's12_paserna' } }, scener: prolog.scener.map((s) => (s.id === 's12_pasarna' ? { ...s, id: 's12_paserna' } : s)) };
    expect(ny(kopiera(t), omdopt).scen.id).toBe('s12_paserna');
    const borttagen = { ...prolog, scener: prolog.scener.filter((s) => s.id !== 's12_pasarna') };
    const forsta2 = prolog.scener.find((s) => s.pass === 2).id;
    expect(ny(kopiera(t), borttagen).scen.id).toBe(forsta2);
  });
  it('lappar med omdöpta id följer sitt alias, borttagna försvinner', () => {
    const t = nyttTillstand('t'); aventyrFor(t, AVENTYR).lappar = ['p0_dinomat_gammal', 'p0_finnsinte'];
    const kap = { ...prolog, alias: { pussel: { p0_dinomat_gammal: 'p0_dinomat' } } };
    ny(t, kap);
    expect(t.aventyr[AVENTYR].lappar).toEqual(['p0_dinomat']);
  });
  it('läser en sparning från en äldre version av innehållet (fixtur)', () => {
    const gammal = migrera(JSON.parse(readFileSync(new URL('../fixturer/spar-aldre-innehall.json', import.meta.url), 'utf8')));
    const kap = { ...prolog, alias: { scener: { s10_ladorna: 's11_ladorna' } } };
    const b = ny(gammal, kap);
    expect(b.scen.id).toBe('s11_ladorna');
    expect(gammal.aventyr[AVENTYR].lappar).toEqual(['p0_dinomat']);
  });
});

describe('ungen följer', () => {
  it('unge_folj sätter att ungen följer, och kan stängas av', () => {
    const t = nyttTillstand('t');
    const kap = { ...prolog, scener: [{ id: 'x', pass: 1, rum: null, steg: [{ typ: 'unge_folj', folj: true }, { typ: 'unge_folj', folj: false }] }] };
    const b = skapaBerattelse({ aventyr, kapitel: kap, tillstand: t, aventyrId: AVENTYR });
    b.aktuellt(); expect(t.spelare.unge.folj).toBe(true);
    b.klar(); b.aktuellt(); expect(t.spelare.unge.folj).toBe(false);
  });
});
