import { describe, it, expect } from 'vitest';
import { skapaInmatning } from '../../src/karna/inmatning.js';
import { steg, FIGUR } from '../../src/karna/rorelse.js';

describe('inmatning', () => {
  it('piltangenter ger riktning, diagonalen är normaliserad', () => {
    const i = skapaInmatning();
    i.tangentNer('ArrowRight'); expect(i.riktning()).toEqual({ x: 1, y: 0 });
    i.tangentNer('ArrowDown');
    const r = i.riktning(); expect(Math.hypot(r.x, r.y)).toBeCloseTo(1);
    i.tangentUpp('ArrowRight'); i.tangentUpp('ArrowDown'); expect(i.riktning()).toEqual({ x: 0, y: 0 });
  });

  it('en ny piltangent är handlingen ga, tangentrepetition är det inte', () => {
    const i = skapaInmatning(); const h = [];
    i.lyssna((x) => h.push(x.typ));
    i.tangentNer('ArrowLeft'); i.tangentNer('ArrowLeft'); i.tangentNer('ArrowLeft');
    expect(h).toEqual(['ga']);
    i.tangentUpp('ArrowLeft'); i.tangentNer('ArrowLeft');
    expect(h).toEqual(['ga', 'ga']);
  });
  it('motsatta tangenter tar ut varandra', () => {
    const i = skapaInmatning(); i.tangentNer('ArrowLeft'); i.tangentNer('ArrowRight');
    expect(i.riktning()).toEqual({ x: 0, y: 0 });
  });

  it('tryck sätter mål, pil avbryter målet', () => {
    const i = skapaInmatning(); i.tryck(100, 50);
    expect(i.gaTillMal()).toEqual({ x: 100, y: 50 });
    i.tangentNer('ArrowUp'); expect(i.gaTillMal()).toBeNull();
  });

  it('bokstäver blir versaler, Å Ä Ö fungerar, A är ingen riktning', () => {
    const i = skapaInmatning();
    i.tangentNer('KeyA', 'a'); i.tangentNer('BracketLeft', 'å'); i.tangentNer('Quote', 'ä');
    expect(i.hamtaHandlingar().map((h) => h.tecken)).toEqual(['A', 'Å', 'Ä']);
    expect(i.hamtaHandlingar()).toEqual([]);
  });

  it('släpp allt när fönstret tappar fokus', () => {
    const i = skapaInmatning(); i.tangentNer('ArrowUp'); i.slappAllt();
    expect(i.riktning()).toEqual({ x: 0, y: 0 });
  });
});

describe('rörelse', () => {
  const stilla = { riktning: { x: 0, y: 0 }, gaTill: null };
  it('går med riktning och stannar vid kanten', () => {
    let p = { x: 160, y: 120 };
    for (let k = 0; k < 100; k++) p = steg(p, { riktning: { x: 1, y: 0 }, gaTill: null }, 0.1);
    expect(p.x).toBe(320 - FIGUR.bredd / 2);
  });
  it('går till målet och säger till när det är framme', () => {
    let p = { x: 50, y: 100, framme: false };
    for (let k = 0; k < 100 && !p.framme; k++) p = steg(p, { riktning: { x: 0, y: 0 }, gaTill: { x: 200, y: 150 } }, 0.05);
    expect(p).toEqual({ x: 200, y: 150, framme: true });
  });
  it('ett mål utanför rummet hamnar på kanten', () => {
    let p = { x: 50, y: 100, framme: false };
    for (let k = 0; k < 200 && !p.framme; k++) p = steg(p, { riktning: { x: 0, y: 0 }, gaTill: { x: -40, y: 5 } }, 0.05);
    expect(p).toEqual({ x: FIGUR.bredd / 2, y: FIGUR.hojd, framme: true });
  });
  it('står still utan styrning', () => {
    expect(steg({ x: 10, y: 30 }, stilla, 1)).toEqual({ x: 10, y: 30, framme: false });
  });
  it('en hackande bildruta teleporterar inte', () => {
    const p = steg({ x: 100, y: 100 }, { riktning: { x: 1, y: 0 }, gaTill: null }, 5);
    expect(p.x).toBeLessThanOrEqual(100 + FIGUR.fart * 0.1 + 1e-9);
  });
});

describe('nosen och bokstäverna', () => {
  it('N är en bokstav, nosen ligger på Tab', () => {
    const i = skapaInmatning();
    i.tangentNer('KeyN', 'n'); i.tangentNer('Tab', 'Tab');
    expect(i.hamtaHandlingar()).toEqual([{ typ: 'bokstav', tecken: 'N' }, { typ: 'hjalp' }]);
  });
  it('en fångare (nosen) tar Mellanslag före lyssnarna, och släpper när den är klar', () => {
    const i = skapaInmatning();
    const fick = [];
    i.lyssna((h) => fick.push(h.typ));
    let tand = true;
    const sluta = i.fanga((h) => tand && (h.typ === 'interagera' || h.typ === 'stang'));
    i.tangentNer('Space'); i.tangentNer('Escape');
    expect(fick).toEqual([]);
    expect(i.hamtaHandlingar()).toEqual([]);
    tand = false;
    i.tangentNer('Space');
    expect(fick).toEqual(['interagera']);
    sluta(); tand = true;
    i.tangentNer('Enter');
    expect(fick).toEqual(['interagera', 'interagera']);
  });
  it('en fångare som kastar ett fel stoppar inte inmatningen', () => {
    const i = skapaInmatning();
    const fick = [];
    i.lyssna((h) => fick.push(h.typ));
    i.fanga(() => { throw new Error('trasig'); });
    i.tangentNer('Tab');
    expect(fick).toEqual(['hjalp']);
  });
});

import { skapaHinder } from '../../src/karna/vag.js';
import { framfor, framforFran, hinderFran, rumsObjekt, vidObjekt, vaggar, genom, lasplats, objektFarg, VAGG, RACKVIDD, aktivSak, glipa, avstandTill } from '../../src/karna/rumslayout.js';

describe('kollision och vägsökning', () => {
  const lada = { x: 140, y: 80, b: 40, h: 30 };
  const h = skapaHinder([lada]);
  it('fötterna kan inte stå i en låda', () => {
    expect(h.fri({ x: 160, y: 100 })).toBe(false);
    expect(h.fri({ x: 160, y: 130 })).toBe(true);
  });
  it('vägen går runt lådan och varje bit har fri sikt', () => {
    const fran = { x: 160, y: 150 }, till = { x: 160, y: 60 };
    const v = h.vag(fran, till);
    expect(v.length).toBeGreaterThan(1);
    let a = fran;
    for (const p of v) { expect(h.sikt(a, p)).toBe(true); a = p; }
    expect(v.at(-1)).toEqual(till);
  });
  it('ett mål inne i lådan blir närmaste fria punkt', () => {
    const v = h.vag({ x: 60, y: 150 }, { x: 160, y: 95 });
    expect(h.fri(v.at(-1))).toBe(true);
  });
  it('piltangenterna glider längs kanten', () => {
    const p = h.glid({ x: 130, y: 120 }, 2, -2); // snett upp mot lådans hörn
    expect(h.fri(p)).toBe(true);
  });
  it('i varje rum och tillstånd i prologen går det att nå framför varje föremål från där hjälten kommer in', async () => {
    const { readFileSync } = await import('node:fs');
    const prolog = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8'));
    for (const rum of prolog.rum) {
      const karta = lasKarta(JSON.parse(readFileSync(new URL(`../../kartor/den-gomda-dalen/${rum.id}.tmj`, import.meta.url), 'utf8')));
      for (const t of rum.tillstand || [null]) {
        const obj = rumsObjekt(rum.innehall, t, karta);
        const hh = skapaHinder([...hinderFran(obj), ...(karta.inomhus ? vaggar(karta.vagg) : [])]);
        // alla ingångar: kartans start, in-punkterna och varje utgång
        const starter = [karta.start, ...Object.values(karta.in), ...obj.filter((o) => o.till).map(framfor)].filter(Boolean).map((p) => hh.narmasteFria(p));
        // fönster och annat som sitter högt upp på bakväggen är bara utsmyckning, man går inte fram till dem
        const iVaggen = (o) => karta.inomhus && o.sort !== 'utgang' && o.y + o.h <= 30;
        for (const start of starter) for (const o of obj.filter((x) => !iVaggen(x))) {
          const f = framfor(o);
          const v = hh.vag(start, f);
          expect(v.length, `${rum.id}/${t}: ${o.id}`).toBeGreaterThan(0);
          const slut = v.at(-1);
          const nar = vidObjekt(slut, o) || (o.sort === 'utgang' && genom(o, slut));
          expect(nar, `${rum.id}/${t}: ${o.id} nås inte (hamnar ${slut.x},${slut.y}, mål ${f.x},${f.y})`).toBe(true);
          if (o.sort === 'utgang' && !o.golv) expect(genom(o, slut) || vidObjekt(slut, o), `${rum.id}: går inte att gå igenom ${o.id}`).toBe(true);
        }
      }
    }
  });
});

import { lasKarta, synligaIds } from '../../src/karna/karta.js';

describe('Tiled-kartor och synliga föremål', () => {
  const tmj = (objekt) => ({ type: 'map', width: 20, height: 12, tilewidth: 16, tileheight: 16, layers: [{ type: 'objectgroup', objects: objekt }] });
  it('läser föremål, utgångar och startpunkten', () => {
    const k = lasKarta(tmj([
      { name: 'dorr_mat', type: 'utgang', x: 64, y: 4, width: 26, height: 32, properties: [{ name: 'till', value: 'koket' }] },
      { name: 'lada', x: 10.4, y: 20, width: 20, height: 16, properties: [{ name: 'sida', value: 'vanster' }] },
      { name: 'start', point: true, x: 40, y: 150, width: 0, height: 0 },
    ]));
    expect(k.start).toEqual({ x: 40, y: 150 });
    expect(k.objekt).toEqual([
      { id: 'dorr_mat', x: 64, y: 4, b: 26, h: 32, sort: 'utgang', till: 'koket' },
      { id: 'lada', x: 10, y: 20, b: 20, h: 16, sort: 'sak', sida: 'vanster' },
    ]);
  });
  it('en karta i fel storlek godtas inte', () => {
    expect(() => lasKarta({ ...tmj([]), width: 21 })).toThrow(/rummet är 320×192/);
  });
  it('syns_i döljer föremål tills rummet har rätt tillstånd', () => {
    const inn = ['stav', { id: 'agg', syns_i: ['natt_upplyst', 'morgon'] }];
    expect(synligaIds(inn, 'natt')).toEqual(['stav']);
    expect(synligaIds(inn, 'natt_upplyst')).toEqual(['stav', 'agg']);
    expect(synligaIds(inn, null)).toEqual(['stav']);
  });
});

describe('husets plan', () => {
  const MOT = { vanster: 'hoger', hoger: 'vanster', upp: 'ned', ned: 'upp' };
  const kartor = async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const dir = new URL('../../kartor/den-gomda-dalen/', import.meta.url);
    return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.tmj')).map((f) => [f.slice(0, -4), lasKarta(JSON.parse(readFileSync(new URL(f, dir), 'utf8')))]));
  };
  it('två rum som hänger ihop har sina utgångar på motsatta väggar, och varje utgång har en riktning', async () => {
    const k = await kartor();
    for (const [rum, karta] of Object.entries(k)) for (const o of karta.objekt.filter((x) => x.till)) {
      expect(o.riktning, `${rum}: ${o.id} saknar riktning`).toBeTruthy();
      const tillbaka = k[o.till]?.objekt.find((x) => x.till === rum);
      if (tillbaka) expect(tillbaka.riktning, `${rum}.${o.id} (${o.riktning}) och ${o.till}.${tillbaka.id}`).toBe(MOT[o.riktning]);
    }
  });
  it('stegen klättras upp från hallen och ned från vinden', async () => {
    const k = await kartor();
    expect(k.hallen.objekt.find((o) => o.till === 'vinden')).toMatchObject({ klattra: 'upp', riktning: 'upp' });
    expect(k.vinden.objekt.find((o) => o.till === 'hallen')).toMatchObject({ klattra: 'ned', riktning: 'ned' });
  });
  it('utedörren är ljusare än innedörrarna, och alla innedörrar har samma färg', async () => {
    const { ljushet } = await import('../../src/karna/egenskaper.js');
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    const k = await kartor();
    const dorrar = Object.values(k).flatMap((x) => x.objekt).filter((o) => /^dorr_/.test(o.id));
    const ute = dorrar.filter((o) => o.ute), inne = dorrar.filter((o) => !o.ute);
    expect(ute.length).toBeGreaterThan(0);
    expect(new Set(inne.map(objektFarg)).size).toBe(1);
    for (const u of ute) expect(ljushet(hex(objektFarg(u))) - ljushet(hex(objektFarg(inne[0])))).toBeGreaterThan(20);
  });
  it('inomhus har rummen väggram, och dörrarna sitter i väggarna', async () => {
    const k = await kartor();
    for (const rum of ['vinden', 'hallen', 'koket', 'sovrummet']) {
      expect(k[rum].inomhus, rum).toBe(true);
      for (const o of k[rum].objekt.filter((x) => /^dorr_/.test(x.id))) {
        const v = k[rum].vagg;
        const iVagg = o.y + o.h <= v.bak || o.x + o.b <= v.sida || o.x >= 320 - v.sida || o.y >= 192 - v.fram;
        expect(iVagg, `${rum}: ${o.id} sitter inte i väggen`).toBe(true);
      }
    }
    expect(k.tradgarden.inomhus).toBe(false);
  });
  it('läsplatsen ligger en ruta in i rummet från dörren', async () => {
    const k = await kartor();
    const d = k.hallen.objekt.find((o) => o.id === 'dorr_mat');
    expect(lasplats(d).x).toBeGreaterThan(framfor(d).x);
  });
});

describe('föremål utan framsida (sida alla)', () => {
  const kruka = { id: 'kruka', x: 100, y: 100, b: 20, h: 18, sort: 'sak', sida: 'alla' };
  it('hjälten går till närmaste håll, inte alltid runt till undersidan', () => {
    expect(framforFran(kruka, { x: 110, y: 60 })).toEqual({ x: 110, y: 98 }); // ovanför
    expect(framforFran(kruka, { x: 60, y: 108 })).toEqual({ x: 90, y: 118 }); // vänster
    expect(framforFran(kruka, { x: 170, y: 110 })).toEqual({ x: 130, y: 118 }); // höger
    expect(framforFran(kruka, { x: 110, y: 170 })).toEqual({ x: 110, y: 130 }); // under
  });
  it('han står vid föremålet från alla håll', () => {
    for (const p of [{ x: 110, y: 98 }, { x: 90, y: 118 }, { x: 130, y: 118 }, { x: 110, y: 130 }]) expect(vidObjekt(p, kruka), JSON.stringify(p)).toBe(true);
    expect(vidObjekt({ x: 110, y: 70 }, kruka)).toBe(false);
  });
  it('nära nog räcker: ett föremål nås från alla håll inom ca 1,5 rutor, även med en framsida (grind A)', () => {
    const lada = { ...kruka, sida: 'under' };
    expect(framforFran(lada, { x: 110, y: 60 })).toEqual(framfor(lada)); // ett tryck går fortfarande till framsidan
    const mitt = { x: lada.x + lada.b / 2, y: lada.y + lada.h / 2 };
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const kant = { x: dx < 0 ? lada.x : dx > 0 ? lada.x + lada.b : mitt.x, y: dy < 0 ? lada.y : dy > 0 ? lada.y + lada.h : mitt.y };
      expect(vidObjekt({ x: kant.x + dx * (RACKVIDD - 2), y: kant.y + dy * (RACKVIDD - 2) }, lada)).toBe(true);
      expect(vidObjekt({ x: kant.x + dx * (RACKVIDD + 4), y: kant.y + dy * (RACKVIDD + 4) }, lada)).toBe(false);
    }
  });
  it('inomhus väljs aldrig en punkt i väggen', () => {
    const vid = { ...kruka, x: 34, y: 60 }; // står mot vänster vägg
    const f = framforFran(vid, { x: 10, y: 70 }, true);
    expect(f.x).toBeGreaterThan(VAGG.sida);
  });
  it('i prologen nås krukorna, buskarna och lådan mitt på golvet från minst två håll', async () => {
    const { readFileSync } = await import('node:fs');
    const prolog = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8'));
    let antal = 0;
    for (const rum of prolog.rum) {
      const karta = lasKarta(JSON.parse(readFileSync(new URL(`../../kartor/den-gomda-dalen/${rum.id}.tmj`, import.meta.url), 'utf8')));
      const obj = rumsObjekt(rum.innehall, (rum.tillstand || [null]).at(-1), karta);
      const hh = skapaHinder([...hinderFran(obj), ...(karta.inomhus ? vaggar(karta.vagg) : [])]);
      const start = hh.narmasteFria(karta.start);
      for (const o of obj.filter((x) => x.sida === 'alla')) {
        antal++;
        const hall = [{ x: o.x + o.b / 2, y: o.y + o.h + 30 }, { x: o.x + o.b / 2, y: o.y - 30 }, { x: o.x - 30, y: o.y + o.h / 2 }, { x: o.x + o.b + 30, y: o.y + o.h / 2 }];
        const nas = hall.filter((h) => { const f = framforFran(o, h, karta.inomhus, karta.vagg); const v = hh.vag(start, f); return v.length > 0 && vidObjekt(v.at(-1), o); });
        expect(nas.length, `${rum.id}: ${o.id} nås bara från ${nas.length} håll`).toBeGreaterThanOrEqual(2);
      }
    }
    expect(antal).toBeGreaterThanOrEqual(3);
  });
});

describe('lampor', () => {
  it('en punkt som heter lampa lyser i mörkret, köket har en vid Farfars plats', async () => {
    const { readFileSync } = await import('node:fs');
    const k = lasKarta(JSON.parse(readFileSync(new URL('../../kartor/den-gomda-dalen/koket.tmj', import.meta.url), 'utf8')));
    expect(k.lampor.length).toBe(1);
    const farfar = k.objekt.find((o) => o.id === 'farfar_vid_bordet');
    expect(Math.hypot(k.lampor[0].x - (farfar.x + farfar.b / 2), k.lampor[0].y - (farfar.y + farfar.h / 2))).toBeLessThan(40);
  });
});

describe('vilken sak används (grind A)', () => {
  const sak = (id, x, y) => ({ id, x, y, b: 30, h: 18, sort: 'sak' });
  it('bara den närmaste saken inom räckvidden är aktiv', () => {
    const rod = sak('rod', 40, 60), bla = sak('bla', 40, 90);
    expect(aktivSak({ x: 80, y: 70 }, [rod, bla])?.id).toBe('rod');
    expect(aktivSak({ x: 80, y: 100 }, [rod, bla])?.id).toBe('bla');
    expect(aktivSak({ x: 200, y: 100 }, [rod, bla])).toBeNull();
  });
  it('står två saker lika nära vinner den han är vänd mot', () => {
    const vanster = sak('v', 20, 60), hoger = sak('h', 90, 60);
    const mitt = { x: 70, y: 69 }; // 20 px från båda
    expect(avstandTill(mitt, vanster)).toBeCloseTo(avstandTill(mitt, hoger), 0);
    expect(aktivSak(mitt, [vanster, hoger], { x: -1, y: 0 })?.id).toBe('v');
    expect(aktivSak(mitt, [vanster, hoger], { x: 1, y: 0 })?.id).toBe('h');
  });

  // prologens val i rummet: alternativen står minst 3 rutor isär, och från varje håll öppnas just den saken
  it('i prologen står alternativen i varje val minst 3 rutor isär, och varje låda nås och väljs från alla håll den går att stå på', async () => {
    const { readFileSync } = await import('node:fs');
    const prolog = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-00.json', import.meta.url), 'utf8'));
    let provat = 0;
    for (const p of prolog.pussel.filter((x) => x.i_rummet)) {
      // rummet där pusslet spelas
      const scen = prolog.scener.find((s) => s.steg.some((st) => st.pussel_id === p.id));
      const rum = prolog.rum.find((r) => r.id === scen.rum);
      const karta = lasKarta(JSON.parse(readFileSync(new URL(`../../kartor/den-gomda-dalen/${rum.id}.tmj`, import.meta.url), 'utf8')));
      const obj = rumsObjekt(rum.innehall, scen.tillstand ?? (rum.tillstand || [null])[0], karta);
      const hh = skapaHinder([...hinderFran(obj), ...(karta.inomhus ? vaggar(karta.vagg) : [])]);
      for (const [niva, v] of Object.entries(p.varianter)) {
        const alt = v.alternativ.map((a) => obj.find((o) => o.id === a.objekt)).filter((o) => o && o.sort !== 'utgang');
        for (let i = 0; i < alt.length; i++) for (let j = i + 1; j < alt.length; j++) {
          expect(glipa(alt[i], alt[j]), `${p.id} ${niva}: ${alt[i].id} och ${alt[j].id}`).toBeGreaterThanOrEqual(48); // 3 rutor
        }
        for (const o of alt) {
          let fran = 0;
          for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]]) {
            for (const avst of [4, 12, 20]) {
              const d = dx && dy ? avst / Math.SQRT2 : avst; // snett: lika långt från hörnet
              const pos = { x: (dx < 0 ? o.x : dx > 0 ? o.x + o.b : o.x + o.b / 2) + dx * d, y: (dy < 0 ? o.y : dy > 0 ? o.y + o.h : o.y + o.h / 2) + dy * d };
              if (!hh.fri(pos)) continue;
              fran++; provat++;
              expect(aktivSak(pos, alt, { x: -dx, y: -dy })?.id, `${p.id}: hjälten vid ${o.id} (${dx},${dy}) avstånd ${d}`).toBe(o.id);
            }
          }
          expect(fran, `${p.id}: ${o.id} går inte att stå vid`).toBeGreaterThan(0);
        }
      }
    }
    expect(provat).toBeGreaterThan(20);
  });
});
