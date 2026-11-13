// Kapitel 3 i gråbox, steg 1 (beslut 87.9.3): schema 2.47, hornet, mossan med sak_vid, bubblan i gemener,
// strecket i sköld|padda, budgeten och skepparens röst.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skapaTryck, reaktionForAntal, skapaKrukor } from '../../src/karna/pussel.js';
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
