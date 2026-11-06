// @ts-check
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { kompileraUppdrag, lappenNu, klaraFore, ersatts, lappenSagerVad, hittaSteg } from '../../src/karna/uppdrag.js';

const R = (text) => ({ typ: 'replik', talare: 'berattare', text, upplast: true });
/** Ett påhittat kapitel med två uppdrag (som prologens första): gå ut, gå upp, tänd; sedan värm ägget. */
const kapitel = () => ({
  id: 'kap-99',
  scener: [
    { id: 'a', steg: [R('Hej.'), R('Gå ut!'), { typ: 'ga_till', mal: 'dorr' }, R('Ute.')] },
    { id: 'b', steg: [{ typ: 'ga_till', mal: 'stege' }, { typ: 'pussel', pussel_id: 'p_ljus' }, R('Ljus!'), R('En ägg.')] },
    { id: 'c', steg: [R('Gå till lådan!'), { typ: 'ga_till', mal: 'lada' }, { typ: 'replik', talare: 'berattare', text: 'Mata.', upplast: true, vantar_pa: 'mata', paminnelse: { efter_sek: 8, replik: R('Ge ett bär.') } }, R('Klart.')] },
  ],
  pussel: [{ id: 'p_ljus', typ: 'P11_formel', instruktion: R('Skriv LJUS!') }],
  uppdrag: [
    { id: 'u1', rubrik: 'TITTA', bild: 'x', pass: 1, steg: [
      { text: 'GÅ UT', klart: { scen: 'a', ga_till: 'dorr' }, ersatter: [{ scen: 'a', text: 'Gå ut!' }] },
      { text: 'GÅ UPP', klart: { scen: 'b', ga_till: 'stege' } },
      { text: 'TÄND', klart: { scen: 'b', pussel: 'p_ljus' }, ersatter: [{ scen: 'p_ljus', text: 'Skriv LJUS!' }] }],
    stampel: { scen: 'b', efter: { replik: 'Ljus!' } } },
    { id: 'u2', rubrik: 'VÄRM', bild: 'y', pass: 1, steg: [
      { text: 'GÅ TILL LÅDAN', klart: { scen: 'c', ga_till: 'lada' }, ersatter: [{ scen: 'c', text: 'Gå till lådan!' }] },
      { text: 'MATA', klart: { scen: 'c', vantar_pa: 'mata' }, visas: 'med_paminnelse' }],
    stampel: { scen: 'c', efter: { replik: 'Klart.' } } },
  ],
});

describe('uppdragslappen (2d)', () => {
  it('stegen, starten och stämpeln läses ut ur kapitlet', () => {
    const { lista, fel } = kompileraUppdrag(kapitel());
    expect(fel).toEqual([]);
    expect(lista.map((x) => [x.u.id, x.start, x.stampel])).toEqual([['u1', [0, 1], [1, 2]], ['u2', [2, 0], [2, 3]]]);
    expect(hittaSteg(kapitel(), 'c', { vantar_pa: 'mata' })).toEqual([2, 2]);
  });
  it('lappen börjar när berättelsen har ställt frågan, bockar av stegen och slutar efter berättelsens stund', () => {
    const { lista } = kompileraUppdrag(kapitel());
    expect(lappenNu(lista, [0, 0])).toBeNull(); // före frågan
    const forst = lappenNu(lista, [0, 1]);
    expect(forst?.k.u.id).toBe('u1'); expect(forst?.nu?.text).toBe('GÅ UT'); expect(forst?.gjorda).toEqual([]);
    expect(lappenSagerVad(forst, [0, 2])).toBe(true); // målet är lappens steg: inget moln
    const sen = lappenNu(lista, [1, 1]);
    expect(sen?.gjorda.map((s) => s.text)).toEqual(['GÅ UT', 'GÅ UPP']); expect(sen?.nu?.text).toBe('TÄND');
    expect(lappenNu(lista, [1, 2])?.nu).toBeNull(); // alla steg gjorda, stämpeln kommer efter repliken
    expect(lappenNu(lista, [1, 3])).toBeNull(); // stämplat
    expect(klaraFore(lista, [1, 3]).map((u) => u.id)).toEqual(['u1']);
  });
  it('ett steg som visas med påminnelsen syns först när den har kommit', () => {
    const { lista } = kompileraUppdrag(kapitel());
    expect(lappenNu(lista, [2, 2])?.nu).toBeNull();
    expect(lappenNu(lista, [2, 2], new Set(['u2/1']))?.nu?.text).toBe('MATA');
  });
  it('ersatter gäller repliker i scenen och pusslets instruktion', () => {
    expect(ersatts(kapitel(), 'a', 'Gå ut!')).toBe(true);
    expect(ersatts(kapitel(), 'a', 'Hej.')).toBe(false);
    expect(ersatts(kapitel(), 'p_ljus', 'Skriv LJUS!')).toBe(true);
  });
  it('ett uppdrag vars steg inte finns hoppas över (ett provkapitel), och felet sägs', () => {
    const k = kapitel(); k.uppdrag[0].steg[1].klart = { scen: 'b', ga_till: 'finns_inte' };
    const { lista, fel } = kompileraUppdrag(k);
    expect(lista.map((x) => x.u.id)).toEqual(['u2']);
    expect(fel[0]).toMatch(/u1: stegen GÅ UPP/);
  });
  it('prologen och kapitel 1 har sina uppdrag, och alla går att hitta', () => {
    for (const id of ['kap-00', 'kap-01']) {
      const k = JSON.parse(readFileSync(new URL(`../../content/den-gomda-dalen/${id}.json`, import.meta.url), 'utf8'));
      const { lista, fel } = kompileraUppdrag(k);
      expect(fel).toEqual([]);
      expect(lista.length).toBe(id === 'kap-00' ? 12 : 8);
    }
  });
});
