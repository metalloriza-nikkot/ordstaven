import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { forSkarm, namnISkrift, ord } from '../../src/karna/text.js';
import { kontrollera, antalRader } from '../../verktyg/innehall/kontroll.js';

const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));
const riktigt = () => ({ aventyr: las('den-gomda-dalen/aventyr.json'), kapitel: [las('den-gomda-dalen/kap-00.json'), las('den-gomda-dalen/kap-01.json')], ordlistor: las('ordlistor.json') });
const kopia = (x) => JSON.parse(JSON.stringify(x));

describe('textmotorn', () => {
  it('vanlig skrift i datan blir versaler på skärmen', () => {
    expect(forSkarm('Ta den röda lådan.')).toEqual(['TA DEN RÖDA LÅDAN.']);
    expect(forSkarm(['Dinomat.', 'Ta den röda lådan.'], { skrift: 'vanlig' })).toEqual(['Dinomat.', 'Ta den röda lådan.']);
  });
  it('platshållare ersätts med namnet i rätt skrift', () => {
    expect(forSkarm('Hej, {unge}!', { varden: { unge: 'KNOPP' } })).toEqual(['HEJ, KNOPP!']);
    expect(forSkarm('Hej, {unge}!', { skrift: 'vanlig', varden: { unge: 'KNOPP' } })).toEqual(['Hej, Knopp!']);
    expect(namnISkrift('åsa', 'vanlig')).toBe('Åsa');
  });
  it('okända platshållare lämnas kvar', () => {
    expect(forSkarm('Hej {okand}', { skrift: 'vanlig' })).toEqual(['Hej {okand}']);
  });
  it('ord plockar ut orden utan skiljetecken och platshållare', () => {
    expect(ord('Hej, {unge}! Ägget är kallt.')).toEqual(['Hej', 'Ägget', 'är', 'kallt']);
  });
});

describe('innehållskontrollen', () => {
  it('prologen går igenom utan fel', () => {
    const r = kontrollera(riktigt());
    expect(r.fel).toEqual([]);
    expect(r.pass.map((p) => `${p.kapitel}:${p.pass}`)).toEqual(['kap-00:1', 'kap-00:2', 'kap-00:3', 'kap-01:1', 'kap-01:2']);
  });

  it('en kort mening ryms på en rad, en lång blir flera', () => {
    expect(antalRader('Skatten är inte i grottan.')).toBe(1);
    expect(antalRader('Var försiktig. Det finns de som gör allt för att stjäla en sån här unge.')).toBeGreaterThan(2);
  });

  const medFel = (andra) => { const d = riktigt(); andra(d.kapitel[0], d); return kontrollera(d).fel.join('\n'); };

  it('fångar text i versaler', () => {
    expect(medFel((k) => { k.scener[1].steg[1].text = 'DET ÄR HÖSTLOV.'; })).toMatch(/vanlig skrift/);
  });
  it('tillåter formler i versaler i text', () => {
    expect(medFel((k) => { k.scener[1].steg[1].text = 'Staven säger LJUS.'; })).toBe('');
  });
  it('fångar gamla platshållare i versaler och okända platshållare', () => {
    expect(medFel((k) => { k.scener[6].steg[2].text = 'Hej, {UNGE}!'; })).toMatch(/små bokstäver/);
    expect(medFel((k) => { k.scener[6].steg[2].text = 'Hej, {katt}!'; })).toMatch(/okänd platshållare/);
  });
  it('fångar okänd talare, saknat rum, saknat mål och saknat pussel', () => {
    expect(medFel((k) => { k.scener[1].steg[1].talare = 'tomten'; })).toMatch(/okänd talare/);
    expect(medFel((k) => { k.scener[2].rum = 'kallaren'; })).toMatch(/rummet kallaren finns inte/);
    expect(medFel((k) => { k.scener[2].steg[2].mal = 'garderob'; })).toMatch(/garderob finns inte i rummet/);
    expect(medFel((k) => { k.scener[3].steg[2].pussel_id = 'p0_finns_inte'; })).toMatch(/pusslet p0_finns_inte finns inte/);
  });
  it('fångar ett tillstånd som aldrig kan uppstå', () => {
    expect(medFel((k) => { k.scener[4].tillstand = 'kvall'; })).toMatch(/tillståndet kvall/);
  });
  it('fångar läs och välj utan exakt ett rätt svar', () => {
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_filt').varianter.L1.alternativ[1].ratt = true; })).toMatch(/exakt ett alternativ/);
  });
  it('fångar förbjudna Å/Ä-par och spärrade ord i lästext', () => {
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_bar').varianter.L1.alternativ[1].ord = 'bår'; })).toMatch(/får inte stå på samma skärm|bara på Å\/Ä/);
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_dinomat').varianter.L2.text = ['Gå till berget.']; })).toMatch(/berget är spärrat/);
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_dinomat').varianter.L2.text = ['Ta den i köket.']; })).toMatch(/köket är spärrat/);
  });
  it('fångar formelbrickor som inte räcker och förebild som inte stämmer', () => {
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_ljus').brickor = ['S', 'U', 'L']; })).toMatch(/saknar J/);
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_ljus').brickor = ['S', 'U', 'L', 'J', 'A']; })).toMatch(/S1 har bara rätt bokstäver/);
  });
  it('fångar stavfel i fältnamn (schemat är strikt)', () => {
    expect(medFel((k) => { k.scener[0].steg[1].uppläst = true; })).toMatch(/must NOT have additional properties/);
  });
  it('fångar dubbla id:n', () => {
    expect(medFel((k) => { k.pussel[1].id = 'p0_hjaltenamn'; })).toMatch(/används både/);
  });
  it('räknar läsuppgifter per pass och varnar under två', () => {
    const d = riktigt();
    expect(kontrollera(d).varningar.join('\n')).not.toMatch(/läsuppgift/);
    const s07 = d.kapitel[0].scener.find((s) => s.id === 's07_dorrarna');
    s07.steg = s07.steg.filter((st) => st.typ !== 'pussel');
    expect(kontrollera(d).varningar.join('\n')).toMatch(/kap-00 pass 1: 1 läsuppgift/);
  });
  it('kodlåset: tecknen måste ge svaret med nyckeln', () => {
    expect(medFel((k, d) => { d.kapitel[1].pussel.find((p) => p.id === 'k1_kodlas').svar = 'hej'; })).toMatch(/tecknen ger HEM/);
  });
  it('packa: flera rätt är tillåtet, men inte alla', () => {
    expect(medFel(() => {})).toBe('');
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'p0_packlista').varianter.L1.alternativ.forEach((a) => { a.ratt = true; }); })).toMatch(/minst ett fel/);
  });
});

describe('läs i rummet, syns_i och kartor (format 2)', () => {
  const medFel = (andra, kartor) => { const d = riktigt(); andra(d.kapitel[0], d); return kontrollera({ ...d, kartor }).fel.join('\n'); };
  const filt = (k) => k.pussel.find((p) => p.id === 'p0_filt');
  it('i_rummet: varje alternativ ska ligga i ett föremål som finns i rummet och ha ett ord', () => {
    expect(medFel((k) => { delete filt(k).varianter.L1.alternativ[0].objekt; })).toMatch(/saknar objekt/);
    expect(medFel((k) => { filt(k).varianter.L1.alternativ[1].objekt = 'lada_i_koket'; })).toMatch(/lada_i_koket, som inte finns i rummet vinden/);
  });
  it('syns_i får bara använda rummets tillstånd', () => {
    expect(medFel((k) => { k.rum[0].innehall.find((x) => typeof x !== 'string').syns_i = ['dag']; })).toMatch(/syns_i dag/);
  });
  it('gamla kapitelfiler i format 1 godtas inte (P27_packa heter P28_packa)', () => {
    expect(medFel((k) => { k.format = 1; })).toMatch(/format/);
  });
  it('kartan: alla föremål ska finnas, inga okända, och utgångar leder till rum som finns', () => {
    const karta = (objekt) => ({ hallen: { objekt, start: null } });
    const hallen = ['stege_upp', 'dorr_mat', 'dorr_bad', 'dorr_toa', 'dorr_sov'].map((id, i) => ({ id, x: 10 + i * 40, y: 4, b: 20, h: 20 }));
    expect(medFel(() => {}, karta(hallen))).toBe('');
    expect(medFel(() => {}, karta(hallen.slice(1)))).toMatch(/stege_upp saknas i kartan/);
    expect(medFel(() => {}, karta([...hallen, { id: 'pianot', x: 0, y: 0, b: 10, h: 10 }]))).toMatch(/pianot finns inte/);
    expect(medFel(() => {}, karta([...hallen.slice(1), { ...hallen[0], till: 'kallaren' }]))).toMatch(/leder till kallaren/);
  });
});
