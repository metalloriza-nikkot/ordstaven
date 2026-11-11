import { describe, it, expect } from 'vitest';
import { geSak, bytLager, lagerFor, ristasNu } from '../../src/karna/hjalte.js';
import { readFileSync, readdirSync } from 'node:fs';
import { skapaSparning, skapaPlatser, nyckelFor, fotoNyckel, spelareAttVisa, nyttTillstand, migrera, FORMAT, NYCKEL, NYCKEL_TRASIG, NYCKEL_PLATSER, aventyrFor } from '../../src/karna/sparning.js';
const AVENTYR = 'den-gomda-dalen';
import { skapaLogg } from '../../src/karna/logg.js';

const minne = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const fast = () => new Date('2026-10-24T10:00:00Z');

describe('sparning', () => {
  it('ett nytt tillstånd har formatfält och en egen hjältedel', () => {
    const t = nyttTillstand('0.1.0', fast);
    expect(t.app).toBe('ORDSTAVEN');
    expect(t.format).toBe(FORMAT);
    expect(t.spelare.hjalte.format).toBe(2);
    expect(t.aventyr).toEqual({});
    expect(aventyrFor(t, AVENTYR)).toBe(t.aventyr[AVENTYR]);
  });

  it('sparar och läser tillbaka', () => {
    const l = minne(); const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast });
    const t = s.las(); aventyrFor(t, AVENTYR).plats = { rum: 'testrum', x: 42, y: 99 };
    expect(s.spara(t)).toBe(true);
    expect(s.las().aventyr[AVENTYR].plats).toEqual({ rum: 'testrum', x: 42, y: 99 });
  });

  it('en trasig sparning läggs undan och raderas inte', () => {
    const l = minne(); l.setItem(NYCKEL, '{trasig');
    const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast });
    expect(s.las().format).toBe(FORMAT);
    expect(l.getItem(NYCKEL_TRASIG)).toBe('{trasig');
  });

  it('full lagring kraschar inte, utan returnerar false och loggas', () => {
    const l = minne(); l.setItem = () => { throw new Error('QuotaExceededError'); };
    const logg = skapaLogg({ lagring: minne(), version: 't' });
    const s = skapaSparning({ lagring: l, spelversion: '0.1.0', logg });
    expect(s.spara(nyttTillstand('0.1.0'))).toBe(false);
    expect(logg.text()).toContain('kunde inte spara');
  });

  it('vägrar sparningar från andra spel och nyare format', () => {
    expect(() => migrera({ app: 'TURBO-RACE', format: 1 })).toThrow();
    expect(() => migrera({ app: 'ORDSTAVEN', format: FORMAT + 1 })).toThrow();
  });

  it('inläsning från fil kan ångras', () => {
    const l = minne(); const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast });
    const gammal = s.las(); gammal.spelare.hjalte.namn = 'GAMMAL'; s.spara(gammal);
    const fil = nyttTillstand('0.1.0', fast); fil.spelare.hjalte.namn = 'NY';
    s.franText(JSON.stringify(fil), gammal);
    expect(s.las().spelare.hjalte.namn).toBe('NY');
    s.angra();
    expect(s.las().spelare.hjalte.namn).toBe('GAMMAL');
  });

  it('hjälten kan exporteras som egen fil', () => {
    const s = skapaSparning({ lagring: minne(), spelversion: '0.1.0', klocka: fast });
    const t = nyttTillstand('0.1.0', fast); t.spelare.hjalte.namn = 'TESTA';
    const h = JSON.parse(s.hjalteTillText(t));
    expect(h).toMatchObject({ app: 'ORDSTAVEN-HJALTE', format: 2, hjalte: { namn: 'TESTA', lager: { hjalmdekor: null, ryggsack: null }, garderob: [] } });
  });

  it('format 1 → 2: ungen flyttar från äventyret till spelaren, med namn och växtsteg', () => {
    const gammal = JSON.parse(readFileSync(new URL('../fixturer/spar-format-1.json', import.meta.url), 'utf8'));
    gammal.aventyr['den-gomda-dalen'].ungen = { namn: 'KNOPP', steg: 2 };
    const d = migrera(gammal);
    expect(d.spelare.unge).toMatchObject({ namn: 'KNOPP', steg: 2, format: 1 });
  });

  it('format 1 → 2: inställningen foralderLaserFarfar heter foralderLaser och behåller sitt värde', () => {
    const gammal = JSON.parse(readFileSync(new URL('../fixturer/spar-format-1.json', import.meta.url), 'utf8'));
    gammal.installningar = { foralderLaserFarfar: true, etiketter: false };
    const d = migrera(gammal);
    expect(d.installningar).toEqual({ foralderLaser: true });
  });

  it('format 2 → 3: den gamla etikettinställningen (förvalet på) tas bort, föremålens namn är avstängda från början', () => {
    const gammal = JSON.parse(readFileSync(new URL('../fixturer/spar-format-2.json', import.meta.url), 'utf8'));
    expect(gammal.installningar.etiketter).toBe(true);
    const d = migrera(gammal);
    expect(d.format).toBe(FORMAT);
    expect(d.installningar).toEqual({ foralderLaser: false });
    expect(d.spelare.unge.namn).toBe('KNOPP');
  });

  it('format 3 → 4: hjältens hud och dräkt blir palettbyten, och hjälten får lager och garderob', () => {
    const gammal = JSON.parse(readFileSync(new URL('../fixturer/spar-format-3.json', import.meta.url), 'utf8'));
    expect(gammal.spelare.hjalte.utseende).toEqual({ hudton: 2, klader: 1, hatt: 3, kropp: 1 });
    const d = migrera(gammal);
    expect(d.spelare.hjalte).toMatchObject({ format: 2, utseende: { hudfarg: 2, drakt: 1 }, lager: { hjalmdekor: null, ryggsack: null }, garderob: [] });
    expect(d.spelare.hjalte.utseende).not.toHaveProperty('hatt');
    expect(d.spelare.hjalte.namn).toBe('TESTA');
  });
  it('gåvor tas på direkt och hamnar i garderoben en gång, och garderoben byter tillbaka', () => {
    const t = nyttTillstand('t'); const h = t.spelare.hjalte;
    expect(geSak(h, 'hjalmdekor', 'taggkam')).toBe(true);
    expect(geSak(h, 'hjalmdekor', 'taggkam')).toBe(false);
    expect(lagerFor(h)).toEqual({ hjalmdekor: 'taggkam', ryggsack: null, drakt: null });
    expect(bytLager(h, 'hjalmdekor', null)).toBe(true);
    expect(bytLager(h, 'ryggsack', 'finns_inte')).toBe(false);
    expect(bytLager(h, 'hjalmdekor', 'taggkam')).toBe(true);
    expect(h.garderob).toEqual([{ sort: 'hjalmdekor', id: 'taggkam' }]);
  });
  it('en dräkt han får (72.11) tas på direkt, och garderoben tar av den igen', () => {
    const t = nyttTillstand('t'); const h = t.spelare.hjalte;
    expect(geSak(h, 'drakt', 'drakt_grodgron')).toBe(true);
    expect(lagerFor(h).drakt).toBe('drakt_grodgron');
    expect(bytLager(h, 'drakt', null)).toBe(true);
    expect(lagerFor(h).drakt).toBe(null);
    // en gammal sparning utan dräkt i lagret går att läsa
    const gammal = { lager: { hjalmdekor: 'taggkam', ryggsack: null }, garderob: [] };
    expect(lagerFor(gammal)).toEqual({ hjalmdekor: 'taggkam', ryggsack: null, drakt: null });
  });

  // Varje gammalt format har en fixturfil som alltid måste gå att läsa.
  for (const fil of readdirSync(new URL('../fixturer/', import.meta.url)).filter((f) => f.startsWith('spar-format-'))) {
    it(`fixturen ${fil} går att läsa`, () => {
      const d = migrera(JSON.parse(readFileSync(new URL('../fixturer/' + fil, import.meta.url), 'utf8')));
      expect(d.format).toBe(FORMAT);
      expect(d.spelare.hjalte).toBeTruthy();
      expect(d.spelare.unge).toMatchObject({ format: 1 });
      for (const a of Object.values(d.aventyr)) expect(a.ungen).toBeUndefined();
    });
  }
});

describe('formeln ristas in på staven (beslut 67.6)', () => {
  const svard = { typ: 'P11_formel', svar: 'SVÄRD', formler: [{ ord: 'SVÄRD' }] };
  it('bara en ny formel ristas, och inte ett ord med ristas: false', () => {
    expect(ristasNu(svard, ['LJUS'])).toBe(true);
    expect(ristasNu(svard, ['LJUS', 'SVÄRD'])).toBe(false); // SVÄRD igen (k1_svard_igen)
    expect(ristasNu({ ...svard, formler: [{ ord: 'SVÄRD', ristas: false }] }, [])).toBe(false);
    expect(ristasNu({ typ: 'P15_raddning', svar: 'STEGE' }, [])).toBe(false);
  });
});

describe('spelarna på enheten (F1)', () => {
  const spelad = (l, plats, namn) => {
    const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast, plats });
    const t = s.las(); t.spelare.hjalte.namn = namn; t.spelare.hjalte.utseende = { hudfarg: 2, drakt: 1 };
    aventyrFor(t, AVENTYR).scenId = 's03'; t.installningar = { rost: false, oppnadeKapitel: ['kap-01'] };
    s.spara(t); return t;
  };

  it('en sparning från före platserna är plats 1 och ligger kvar i samma nyckel', () => {
    const l = minne(); spelad(l, '1', 'Ture');
    const p = skapaPlatser({ lagring: l });
    expect(nyckelFor('1')).toBe(NYCKEL);
    expect(p.aktiv()).toBe('1');
    expect(p.lista()).toEqual(['1']);
    expect(p.info('1')).toMatchObject({ namn: 'Ture', borjat: true, utseende: { hudfarg: 2, drakt: 1 } });
  });

  it('första gången finns en plats, och ingen har börjat', () => {
    const p = skapaPlatser({ lagring: minne() });
    expect(p.aktiv()).toBe('1');
    expect(p.info('1').borjat).toBe(false);
  });

  it('ett nytt äventyr raderar ingenting: den nya hjälten får en egen plats, med enhetens inställningar', () => {
    const l = minne(); const gammal = spelad(l, '1', 'Ture');
    const fore = l.getItem(NYCKEL);
    const p = skapaPlatser({ lagring: l });
    const ny = p.ny(gammal, '0.31.0');
    expect(ny).toBe('p2');
    expect(p.aktiv()).toBe('p2');
    expect(p.lista()).toEqual(['1', 'p2']);
    expect(l.getItem(NYCKEL)).toBe(fore);
    const t = skapaSparning({ lagring: l, spelversion: '0.31.0', plats: 'p2' }).las();
    expect(t.spelare.hjalte.namn).toBe('');
    expect(t.aventyr).toEqual({});
    expect(t.installningar).toEqual({ rost: false, oppnadeKapitel: ['kap-01'] });
    expect(t.spelare.hjalte.id).not.toBe(gammal.spelare.hjalte.id);
  });

  it('platserna sparar var för sig, och man kan byta tillbaka', () => {
    const l = minne(); spelad(l, '1', 'Ture');
    const p = skapaPlatser({ lagring: l });
    p.ny(null); spelad(l, 'p2', 'Vilma');
    expect(p.info('1').namn).toBe('Ture');
    expect(p.info('p2').namn).toBe('Vilma');
    expect(p.valj('1')).toBe(true);
    expect(p.aktiv()).toBe('1');
    expect(p.valj('p9')).toBe(false);
    expect(JSON.parse(l.getItem(NYCKEL_PLATSER))).toMatchObject({ format: 1, aktiv: '1', platser: ['1', 'p2'] });
  });

  it('ett nytt äventyr som aldrig spelades används igen, så att platserna inte blir fler', () => {
    const l = minne(); spelad(l, '1', 'Ture');
    const p = skapaPlatser({ lagring: l });
    expect(p.ny(null)).toBe('p2');
    p.valj('1');
    expect(p.ny(null)).toBe('p2');
    expect(p.lista()).toEqual(['1', 'p2']);
  });

  it('den som spelas kan inte tas bort, och en borttagen hamnar i sin backup', () => {
    const l = minne(); spelad(l, '1', 'Ture');
    const p = skapaPlatser({ lagring: l });
    p.ny(null); spelad(l, 'p2', 'Vilma');
    expect(p.taBort('p2')).toBe(false);
    p.valj('1');
    expect(p.taBort('p2')).toBe(true);
    expect(p.lista()).toEqual(['1']);
    expect(l.getItem(nyckelFor('p2'))).toBeNull();
    expect(JSON.parse(l.getItem(nyckelFor('p2') + '_backup')).tillstand.spelare.hjalte.namn).toBe('Vilma');
    // numret används inte igen så länge backupen finns
    expect(p.ny(null)).toBe('p3');
  });

  it('NYTT ÄVENTYR (F4): samma hjälte och samma lärande på en egen plats, äventyret och ungen från början', () => {
    const l = minne(); const gammal = spelad(l, '1', 'Ture');
    gammal.spelare.unge.namn = 'KNOPP'; gammal.spelare.larande.lasning = { P1_las_och_valj: { niva: 3 } }; gammal.spelare.hjalte.formler = ['LJUS'];
    skapaSparning({ lagring: l, spelversion: '0.1.0', plats: '1' }).spara(gammal);
    const fore = l.getItem(NYCKEL);
    const p = skapaPlatser({ lagring: l });
    expect(p.ny(gammal, '0.36.0', { sammaHjalte: true })).toBe('p2');
    expect(l.getItem(NYCKEL)).toBe(fore);
    const t = skapaSparning({ lagring: l, spelversion: '0.36.0', plats: 'p2' }).las();
    expect(t.spelare.hjalte).toMatchObject({ id: gammal.spelare.hjalte.id, namn: 'Ture', utseende: { hudfarg: 2, drakt: 1 }, formler: [] });
    expect(t.spelare.larande.lasning).toEqual({ P1_las_och_valj: { niva: 3 } });
    expect(t.spelare.unge.namn).toBe('');
    expect(t.aventyr).toEqual({});
  });

  it('startskärmens foto hör till platsen och tas bort med den', () => {
    const l = minne(); spelad(l, '1', 'Ture');
    const p = skapaPlatser({ lagring: l });
    expect(fotoNyckel('1')).toBe('ordstaven_spar_foto');
    expect(fotoNyckel('p2')).toBe('ordstaven_spar_p2_foto');
    p.ny(null); spelad(l, 'p2', 'Vilma');
    expect(p.sparaFoto('p2', 'data:image/png;base64,AAA')).toBe(true);
    expect(p.foto('p2')).toBe('data:image/png;base64,AAA');
    expect(p.foto('1')).toBeNull();
    p.valj('1'); p.taBort('p2');
    expect(l.getItem(fotoNyckel('p2'))).toBeNull();
  });

  it('spelarna på startskärmen: en per hjälte, den som spelas eller den som sparades senast', () => {
    const x = (plats, hjalteId, sparad, borjat = true) => ({ plats, hjalteId, sparad, borjat });
    // samma hjälte på plats 1 och p3 (ett nytt äventyr), en annan på p2, och en tom plats som inte visas
    const alla = [x('1', 'a', '2026-11-01'), x('p2', 'b', '2026-11-02'), x('p3', 'a', '2026-11-05'), x('p4', 'c', null, false)];
    expect(spelareAttVisa(alla, 'p2').map((s) => s.plats)).toEqual(['p3', 'p2']);
    expect(spelareAttVisa(alla, '1').map((s) => s.plats)).toEqual(['1', 'p2']);
    // platsen som spelas syns alltid, och äldre platser utan hjälte-id räknas var för sig
    expect(spelareAttVisa(alla, 'p4').map((s) => s.plats)).toEqual(['p3', 'p2', 'p4']);
    expect(spelareAttVisa([x('1', null, 'b'), x('p2', null, 'a')], '1').map((s) => s.plats)).toEqual(['1', 'p2']);
  });

  it('ett trasigt platsregister börjar om från sparningarna', () => {
    const l = minne(); spelad(l, '1', 'Ture'); l.setItem(NYCKEL_PLATSER, '{trasig');
    const p = skapaPlatser({ lagring: l });
    expect(p.lista()).toEqual(['1']);
    expect(p.aktiv()).toBe('1');
  });
});

describe('logg', () => {
  it('ringbufferten kapas', () => {
    const logg = skapaLogg({ lagring: minne(), version: 't', max: 10 });
    for (let k = 0; k < 25; k++) logg.handelse('test', 'rad ' + k);
    expect(logg.antal).toBe(10);
    expect(logg.text()).toContain('rad 24');
    expect(logg.text()).not.toContain('rad 14');
  });
  it('förra sessionens logg finns kvar', () => {
    const l = minne();
    const a = skapaLogg({ lagring: l, version: 't' }); a.handelse('test', 'förra'); a.spara();
    const b = skapaLogg({ lagring: l, version: 't' });
    expect(b.text()).toContain('FÖRRA SESSIONEN');
  });
  it('en trasig del av ögonblicksbilden kraschar inte loggen', () => {
    const logg = skapaLogg({ lagring: minne(), version: 't' });
    logg.registrera('dum', () => { throw new Error('pang'); });
    expect(logg.ogonblick().dum).toContain('pang');
  });
});
