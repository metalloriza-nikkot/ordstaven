import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MUSIK, MUSIK_SANKT_DB, MUSIK_BYTE_S } from '../../src/grans/ljud.js';
import { SLINGOR, STANDARD, musikFor, stegetsMusik, pausPlan, PAUS_S } from '../../src/karna/musik.js';
import { EFFEKT_FOR, INSPELAT_FOR, INSPELAT_SPELAS, kandaLjud, ljudLista } from '../../src/karna/ljudid.js';
import { kontrollera } from '../../verktyg/innehall/kontroll.js';

const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));
const riktigt = () => ({ aventyr: las('den-gomda-dalen/aventyr.json'), kapitel: [las('den-gomda-dalen/kap-00.json'), las('den-gomda-dalen/kap-01.json')], ordlistor: las('ordlistor.json') });
const effekter = Object.keys(JSON.parse(readFileSync(new URL('../../assets/ljud/effekter/ljud.json', import.meta.url), 'utf8')));

describe('musiken (F5 och 27)', () => {
  it('Stils sex slingor med looppunkterna räknade ur takten (10c v0.5)', () => {
    expect(Object.keys(MUSIK).sort()).toEqual([...SLINGOR].sort());
    for (const m of Object.values(MUSIK)) { expect(m.loopStart).toBe(0.5); expect(m.m4a).toMatch(/\.m4a/); expect(m.ogg).toMatch(/\.ogg/); }
    const varv = (n) => MUSIK[n].loopEnd - MUSIK[n].loopStart;
    expect(varv('meny')).toBeCloseTo(41.7391304, 6);
    expect(varv('spel')).toBeCloseTo(48, 6);
    // tabellen avrundar till millisekunder: de exakta längderna (uppmätta i filerna med korrelation)
    expect(varv('natten')).toBeCloseTo(320 / 7, 9);
    expect(varv('skogen')).toBeCloseTo(480 / 11, 9);
    expect(varv('raddning')).toBeCloseTo(240 / 7, 9);
    expect(varv('lagerelden')).toBeCloseTo(160 / 3, 9);
    expect(MUSIK.natten.loopEnd).toBeCloseTo(46.214, 3);
    expect(MUSIK.lagerelden.loopEnd).toBeCloseTo(53.833, 3);
  });
  it('sänks ca 12 dB när något läses (62.10), och byten tonas på ca 1 s', () => {
    expect(MUSIK_SANKT_DB).toBe(-12);
    expect(MUSIK_BYTE_S).toBe(1);
  });
});

describe('var slingorna spelas (64.5)', () => {
  const kapitel = { musik: 'skogen', rum: [{ id: 'brynet', musik: 'natten' }, { id: 'glantan' }, { id: 'tyst_rum', musik: null }] };
  it('rummet före kapitlet, kapitlet före spel', () => {
    expect(musikFor({ kapitel, rumId: 'brynet' })).toBe('natten');
    expect(musikFor({ kapitel, rumId: 'glantan' })).toBe('skogen');
    expect(musikFor({ kapitel, rumId: 'tyst_rum' })).toBeNull();
    expect(musikFor({ kapitel: { rum: [] }, rumId: 'x' })).toBe(STANDARD);
    expect(musikFor({})).toBe('spel');
  });
  it('scenens undantag före rummet, null är tyst', () => {
    expect(musikFor({ kapitel, scen: { musik: 'lagerelden' }, rumId: 'brynet' })).toBe('lagerelden');
    expect(musikFor({ kapitel, scen: { musik: null }, rumId: 'brynet' })).toBeNull();
    expect(musikFor({ kapitel, scen: { id: 'utan' }, rumId: 'brynet' })).toBe('natten');
  });
  it('steget musik gäller från steget till scenens slut, också när spelet startas om senare i scenen', () => {
    const scen = { musik: 'natten', steg: [{ typ: 'replik' }, { typ: 'musik', slinga: 'spel' }, { typ: 'replik' }, { typ: 'musik', slinga: null }, { typ: 'replik' }] };
    expect(stegetsMusik(scen, 0)).toBeUndefined();
    expect(stegetsMusik(scen, -1)).toBeUndefined(); // "Var var vi?"
    expect(stegetsMusik(scen, 1)).toBe('spel');
    expect(stegetsMusik(scen, 2)).toBe('spel');
    expect(stegetsMusik(scen, 4)).toBeNull();
    expect(musikFor({ kapitel, scen, rumId: 'brynet', stegIndex: 0 })).toBe('natten');
    expect(musikFor({ kapitel, scen, rumId: 'brynet', stegIndex: 2 })).toBe('spel');
    expect(musikFor({ kapitel, scen, rumId: 'brynet' })).toBe('natten'); // en frivillig scen räknar inte stegen
  });
  it('räddningen spelar alltid raddning', () => {
    expect(musikFor({ kapitel, scen: { musik: null }, rumId: 'brynet', raddning: true })).toBe('raddning');
  });
  it('pausen: två varv, tonas ut på slutet, vilar 20–40 s, och aldrig i räddningen', () => {
    const p = pausPlan('skogen', 480 / 11, 0.5);
    expect(p?.spelaS).toBeCloseTo(960 / 11, 9);
    expect(p?.tonaUtS).toBeGreaterThan(1);
    expect(p?.vilaS).toBe(30);
    expect(pausPlan('natten', 45, 0)?.vilaS).toBe(PAUS_S[0]);
    expect(pausPlan('natten', 45, 1)?.vilaS).toBe(PAUS_S[1]);
    expect(pausPlan('natten', 45, 7)?.vilaS).toBe(40); // slumpen hålls inom 0–1
    expect(pausPlan('raddning', 34)).toBeNull();
    expect(pausPlan('meny', 0)).toBeNull();
  });
});

describe('ljuden i datan (64.6)', () => {
  it('ljud är ett id eller upp till tre', () => {
    expect(ljudLista('tut')).toEqual(['tut']);
    expect(ljudLista(['badanka', 'spolning'])).toEqual(['badanka', 'spolning']);
    expect(ljudLista(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(ljudLista(undefined)).toEqual([]);
    expect(ljudLista('')).toEqual([]);
  });
  it('kända ljud: Stils effekter och de inspelade, och de äldre namnen pekar på något som finns', () => {
    const k = kandaLjud(effekter);
    for (const id of ['tut', 'kastrull', 'badanka', 'spolning', 'vackarklocka', 'kvack', 'fras', 'mammas_rop', 'unge', 'fagel_late', 'mage_kurrar']) expect(k.has(id)).toBe(true);
    expect(k.has('okant_ljud')).toBe(false);
    for (const v of Object.values(EFFEKT_FOR)) expect(effekter).toContain(v);
    expect(INSPELAT_FOR.mammas_rop).toBe('unge_late_02');
    expect(INSPELAT_SPELAS.mammas_rop).toEqual({ fart: 0.7, db: -6 });
  });
  it('innehållskontrollen: en okänd slinga eller ett okänt ljud är fel', () => {
    const d = riktigt();
    const k = d.kapitel[0];
    k.musik = 'spel';
    k.rum[0].musik = 'natten';
    k.scener[1].musik = null;
    k.scener[1].steg.splice(1, 0, { typ: 'musik', slinga: 'lagerelden' });
    const dorrar = k.pussel.find((p) => p.id === 'p0_dorrar');
    const fel = Object.values(dorrar.varianter)[0].alternativ.find((a) => !a.ratt);
    fel.vid_valj.ljud = ['kastrull', 'badanka'];
    k.scener[1].steg.find((s) => s.typ === 'mellanscen').ljud = 'kvitter';
    expect(kontrollera(d).fel).toEqual([]);
    k.rum[1].musik = 'byn_okand';
    k.scener[2].steg.push({ typ: 'musik', slinga: 'diskot' });
    fel.vid_valj.ljud = ['kastrull', 'trumpet'];
    k.scener[1].steg.find((s) => s.typ === 'ljud').id = 'oljud';
    const f = kontrollera(d).fel.join('\n');
    expect(f).toMatch(/okänd slinga byn_okand/);
    expect(f).toMatch(/okänd slinga diskot/);
    expect(f).toMatch(/okänt ljud trumpet/);
    expect(f).toMatch(/okänt ljud oljud/);
    // ljud med fyra id stoppas av schemat
    fel.vid_valj.ljud = ['tut', 'tut', 'tut', 'tut'];
    expect(kontrollera(d).fel.join('\n')).toMatch(/ljud/);
  });
});
