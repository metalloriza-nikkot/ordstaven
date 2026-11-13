// Kapitel 3 i gråbox, steg 1 (beslut 87.9.3): schema 2.47, hornet, mossan med sak_vid, bubblan i gemener,
// strecket i sköld|padda, budgeten och skepparens röst.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skapaTryck, reaktionForAntal, skapaKrukor, skapaMeddelande } from '../../src/karna/pussel.js';
import { skapaBerattelse } from '../../src/karna/berattelse.js';
import { skapaOrdduell, MAX_NARMARE } from '../../src/karna/ordduell.js';
import { nyttTillstand } from '../../src/karna/sparning.js';
import { bubblaFor, bubblaText } from '../../src/karna/bubblor.js';
import { ord, forSkarm } from '../../src/karna/text.js';
import { tonFor } from '../../src/grans/rost.js';
import { kontrollera } from '../../verktyg/innehall/kontroll.js';
import { budgetVarningar } from '../../verktyg/innehall/budget.js';

const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));
const kopia = (x) => JSON.parse(JSON.stringify(x));
const kap3 = () => las('den-gomda-dalen/kap-03.json');
const alla = () => ({ aventyr: las('den-gomda-dalen/aventyr.json'), kapitel: ['00', '01', '02', '03'].map((n) => las(`den-gomda-dalen/kap-${n}.json`)), ordlistor: las('ordlistor.json') });
const pusselI = (k, id) => k.pussel.find((p) => p.id === id);

describe('hornet (P29_tryck)', () => {
  const horn = { ratt: 1, vid_antal: { 2: { reaktion: 'två' }, '3+': { reaktion: 'tre eller fler' } } };
  it('ett tut är rätt, och inget bedöms före första trycket', () => {
    const r = skapaTryck(horn);
    expect(r.bedom().resultat).toBe('inget');
    r.tryck();
    expect(r.bedom()).toEqual({ resultat: 'ratt', antal: 1 });
    expect(r.s.klar).toBe(true);
  });
  it('två och tre eller fler har var sin reaktion, och han kan tuta igen', () => {
    const r = skapaTryck(horn);
    r.tryck(); r.tryck();
    expect(r.bedom().reaktion.reaktion).toBe('två');
    for (let i = 0; i < 5; i++) r.tryck();
    expect(r.bedom().reaktion.reaktion).toBe('tre eller fler');
    r.tryck();
    expect(r.bedom().resultat).toBe('ratt');
    expect(r.s).toMatchObject({ fel: 2, forsok: 3, klar: true });
  });
  it('n+ gäller från n, och det största som räcker', () => {
    expect(reaktionForAntal({ '2+': 'a', '4+': 'b' }, 3)).toBe('a');
    expect(reaktionForAntal({ '2+': 'a', '4+': 'b' }, 9)).toBe('b');
    expect(reaktionForAntal({ 2: 'a' }, 3)).toBeNull();
  });
});

describe('mossan (P26 med verb lyfta och sak_vid)', () => {
  it('skylten hittas alltid som nummer fyra, oavsett vilken tuva han lyfter', () => {
    const p = pusselI(kap3(), 'k3_mossan');
    for (const ordning of [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [2, 0, 4, 1, 3]]) {
      const k = skapaKrukor(p, { slump: () => 0.3 });
      const fynd = [];
      for (const i of ordning) { const f = k.sla(i); if (f) fynd.push(f); if (k.s.klar) break; }
      expect(fynd).toHaveLength(4);
      expect(fynd[3]).toBe('skylt');
      expect(fynd.slice(0, 3)).not.toContain('skylt');
      expect(k.sista).toBe('skylt');
    }
  });
});

describe('bubblan i gemener (87.7)', () => {
  it('ahoj! står som det är skrivet, och en vanlig bubbla i versaler', () => {
    const floden = kap3().rum.find((r) => r.id === 'floden');
    const b = bubblaText(bubblaFor(floden, 'flodman', 'morgon'));
    expect(b).toEqual({ text: 'ahoj!', gemener: true });
    expect(forSkarm(b.text, { skrift: 'vanlig' })).toEqual(['ahoj!']);
    expect(bubblaText('hej')).toEqual({ text: 'hej', gemener: false });
    expect(bubblaText(null)).toBeNull();
  });
});

describe('strecket i ett ord (2.47)', () => {
  it('sköld|padda är ett ord för kontrollen och ordlistan', () => {
    expect(ord('Det är en sköld|padda.')).toEqual(['Det', 'är', 'en', 'sköldpadda']);
  });
});

describe('kapitel 3 i kontrollen och budgeten', () => {
  it('kap-03 går igenom kontrollen utan fel', () => {
    const r = kontrollera(alla());
    expect(r.fel).toEqual([]);
    expect(r.pass.filter((p) => p.kapitel === 'kap-03').map((p) => p.lasuppgifter)).toEqual([4, 2, 2]);
  });
  it('kontrollen fångar fel i de nya fälten', () => {
    const fel = (andra) => { const d = alla(); const k = d.kapitel[3]; andra(k); return kontrollera(d).fel.join('\n'); };
    expect(fel((k) => { pusselI(k, 'k3_hornet').foremal = 'trumman'; })).toMatch(/trycker på trumman/);
    expect(fel((k) => { pusselI(k, 'k3_hornet').vid_antal = { 1: { reaktion: 'x' } }; })).toMatch(/vid_antal 1 är det rätta antalet/);
    expect(fel((k) => { pusselI(k, 'k3_mossan').sak_vid = 9; })).toMatch(/sak_vid 9/);
    expect(fel((k) => { pusselI(k, 'k3_chiffret').svar = 'under fena'; })).toMatch(/tecknen ger UNDER FENAN/);
    expect(fel((k) => { pusselI(k, 'k3_duellen').ronder[0].utfall[0].alternativ[1].ratt = true; })).toMatch(/exakt ett kort/);
    expect(fel((k) => { k.scener.find((s) => s.id === 'k3s06_skalkant').startar_vid = 'tuva_1'; })).toMatch(/startar_vid tuva_1/);
    expect(fel((k) => { k.scener.find((s) => s.id === 'k3s05_resan').steg.find((x) => x.typ === 'tryck').foremal = 'bryggan'; })).toMatch(/bryggan finns inte i rummet floden/);
    expect(fel((k) => { k.scener[0].steg[13].tillstand_efter = 'natt'; })).toMatch(/tillstand_efter natt/);
  });
  it('chiffret som meddelande är en skrivuppgift, och hornet och duellen är läsval (87.6)', () => {
    const tidigare = new Set(['farfar', 'berattare', 'baronen', 'herr_skata']);
    const k = kap3();
    expect(budgetVarningar(k, { tidigareTalare: tidigare })).toEqual([]);
    // utan läget är chiffret vila som kodlåset, och då saknar pass 2 en skrivuppgift som budgeten kan räkna
    const utan = kopia(k); delete pusselI(utan, 'k3_chiffret').lage;
    const r = kontrollera({ ...alla(), kapitel: [...alla().kapitel.slice(0, 3), utan] });
    expect(r.pass.find((p) => p.kapitel === 'kap-03' && p.pass === 2).lasuppgifter).toBe(1);
  });
});

describe('skepparens röst (87.9)', () => {
  it('skepparen har en egen röst, mellan Farfar och Tant Rosa', () => {
    expect(las('den-gomda-dalen/aventyr.json').talare.skepparen.rollrost).toBe('skeppare');
    const s = tonFor('skeppare', 'Ahoj! Ön?'), farfar = tonFor('gammal', 'Ahoj! Ön?'), tant = tonFor('tant', 'Ahoj! Ön?');
    expect(s.pitch).toBeGreaterThan(farfar.pitch);
    expect(s.pitch).toBeLessThan(tant.pitch);
  });
});

describe('chiffret som meddelande (steg 2)', () => {
  const p = () => pusselI(kap3(), 'k3_chiffret');
  it('en ruta i taget, mellanslaget hoppas över, och rätt bokstav står kvar', () => {
    let klocka = 0;
    const m = skapaMeddelande(p(), { nu: () => klocka });
    expect(m.tecknetNu).toBe('vag');
    for (const b of 'UNDER') { klocka += 1000; expect(m.skriv(b).resultat).toBe('ratt'); }
    expect(m.tecknetNu).toBe('fjaril'); // mellanslaget hoppas över
    for (const b of 'FENA') m.skriv(b);
    expect(m.skriv('N').resultat).toBe('klar');
    expect(m.text).toBe('UNDER FENAN');
    expect(m.s.logg).toHaveLength(10);
    expect(m.s.logg[0]).toMatchObject({ tecken: 'vag', bokstav: 'U', fel: 0, hjalp: false, ms: 1000 });
  });
  it('fel per tecken, förenklingen efter två och hjälpen i loggen för just det tecknet', () => {
    const m = skapaMeddelande(p());
    expect(m.skriv('x')).toMatchObject({ resultat: 'fel', felNu: 1 });
    expect(m.forenklad).toBe(false);
    m.skriv('Q');
    expect(m.forenklad).toBe(true);
    expect(m.skriv('u').resultat).toBe('ratt'); // gemen räknas som versal
    expect(m.s.logg[0]).toMatchObject({ fel: 2, hjalp: true });
    m.skriv('N');
    expect(m.s.logg[1]).toMatchObject({ fel: 0, hjalp: false });
    m.hjalp(); m.skriv('D');
    expect(m.s.logg[2].hjalp).toBe(true); // nosen på tecknet
    expect(m.s.fel).toBe(2);
  });
});

describe('skalkanten är öppen från pass 2 tills duellen börjar (88.6)', () => {
  const nu = (scenId, steg) => {
    const k = kap3(); const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr: {}, kapitel: k, tillstand: t, aventyrId: 'den-gomda-dalen' });
    for (let i = 0; i < 200 && !(b.scen.id === scenId && b.stegIndex === steg); i++) { b.aktuellt(); b.klar({}); }
    expect([b.scen.id, b.stegIndex]).toEqual([scenId, steg]);
    return b;
  };
  const oppen = (b) => b.frivilligaVid('sandbanken').map((s) => s.id);
  it('stängd i pass 1, öppen i pass 2 och i början av pass 3, stängd när duellen börjar', () => {
    const k = kap3();
    const ankaret = k.scener.find((s) => s.id === 'k3s04_ankaret');
    const duell = ankaret.steg.findIndex((x) => x.pussel_id === 'k3_duellen');
    expect(oppen(nu('k3s02_on', 1))).toEqual([]);
    expect(oppen(nu('k3s03_sandbanken', 1))).toEqual(['k3s06_skalkant']);
    expect(oppen(nu('k3s04_ankaret', 0))).toEqual(['k3s06_skalkant']);
    expect(oppen(nu('k3s04_ankaret', duell - 1))).toEqual(['k3s06_skalkant']);
    expect(oppen(nu('k3s04_ankaret', duell))).toEqual([]);
    expect(oppen(nu('k3s05_resan', 0))).toEqual([]);
  });
  it('en gång: efter besöket är den stängd, och den startar inte när han går in i rummet', () => {
    const b = nu('k3s03_sandbanken', 1);
    expect(b.frivilligScen('sandbanken')).toBeNull();
    b.frivilligtKlart('k3s06_skalkant');
    expect(oppen(b)).toEqual([]);
  });
});

describe('ordduellen (P16, steg 3)', () => {
  const duell = () => pusselI(kap3(), 'k3_duellen');
  const rattIndex = (d) => d.kort.findIndex((a) => a.ratt);
  it('tre ronder i ordning, och det sista rätta kortet vinner', () => {
    const d = skapaOrdduell(duell(), { slump: () => 0.7 });
    expect(d.rond.form).toBe('ord');
    expect(d.valj(rattIndex(d)).resultat).toBe('ratt');
    expect(d.rond.form).toBe('mening');
    expect(d.valj(rattIndex(d)).resultat).toBe('ratt');
    expect(d.sista).toBe(true);
    const r = d.valj(rattIndex(d));
    expect(r).toMatchObject({ resultat: 'vinst', steg: 0 });
    expect(d.s.klar).toBe(true);
    expect(d.s.logg.map((x) => [x.form, x.niva, x.forsok])).toEqual([['ord', 'L2', 1], ['mening', 'L3', 1], ['sammansatt', 'L4', 1]]);
    expect(d.valj(0).resultat).toBe('ingen');
  });
  it('fel: han klättrar ned och ronden står kvar, hjälpen efter två fel, och det går inte att förlora', () => {
    const d = skapaOrdduell(duell(), { slump: () => 0.2 });
    const fel = () => d.kort.findIndex((a) => !a.ratt);
    const start = d.s.steg;
    expect(d.valj(fel())).toMatchObject({ resultat: 'fel', hjalpNu: false, steg: start + 1 });
    expect(d.valj(fel())).toMatchObject({ resultat: 'fel', hjalpNu: true });
    expect(d.hjalp).toBe(true);
    for (let i = 0; i < 6; i++) d.valj(fel());
    expect(d.s.steg).toBe(start + MAX_NARMARE);
    expect(d.rond.form).toBe('ord');
    expect(d.valj(rattIndex(d)).resultat).toBe('ratt');
    expect(d.hjalp).toBe(false); // ny rond, nya fel
    expect(d.s.logg[0]).toMatchObject({ forsok: 9, fel: 8 });
  });
  it('korten blandas, så att det rätta inte alltid står först', () => {
    const forst = new Set();
    for (const s of [0, 0.3, 0.6, 0.9]) { const d = skapaOrdduell(duell(), { slump: () => s }); forst.add(rattIndex(d)); }
    expect(forst).toEqual(new Set([0, 1]));
  });
});

describe('testrummet för ordduellen (steg 4, 61.1)', () => {
  it('Innehålls dueller blir ett kapitel med samma kontroll, och testrummets talare läggs till', async () => {
    const { testrumDuellKapitel, testrumDuellAventyr, TESTRUM_DUELL } = await import('../../src/karna/testrum.js');
    const prov = JSON.parse(readFileSync(new URL('../fixturer/testrum-duell-prov.json', import.meta.url), 'utf8'));
    const k = testrumDuellKapitel(prov);
    expect(k.id).toBe(TESTRUM_DUELL.kapitel);
    expect(k.scener[0].steg).toEqual([{ typ: 'pussel', pussel_id: 'tr_duell_1' }]);
    const av = testrumDuellAventyr(las('den-gomda-dalen/aventyr.json'), prov);
    expect(av.kapitel).toEqual([TESTRUM_DUELL.kapitel]);
    expect(av.talare.halmdockan.namn).toBe('Halmdockan');
    expect(av.talare.farfar).toBeTruthy();
    const r = kontrollera({ aventyr: av, kapitel: [k], ordlistor: las('ordlistor.json'), kartor: {} });
    expect(r.fel).toEqual([]);
    // samma regler som i kapitel 3
    const d = skapaOrdduell(k.pussel[0], { slump: () => 0.5 });
    for (let i = 0; i < 3; i++) d.valj(d.kort.findIndex((a) => a.ratt));
    expect(d.s.klar).toBe(true);
  });
});
