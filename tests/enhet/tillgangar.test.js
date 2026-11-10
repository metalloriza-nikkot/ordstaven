// Grafiken och ljuden i assets/ (dokument 02 §7): licensraden, ingen metadata (repot är publikt), masterpaletten
// och figurernas storlek. Filerna skrivs av verktyg/grafik/inkorg.py.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { synligaEgenskaper, egetForemal, foremaletsBild } from '../../src/karna/egenskaper.js';
import { valjVariant } from '../../src/karna/lasmotor.js';

const rot = new URL('../../', import.meta.url);
const las = (p) => readFileSync(new URL(p, rot));
const filer = (mapp, slut) => (existsSync(new URL(mapp, rot)) ? readdirSync(new URL(mapp, rot), { recursive: true }).filter((f) => String(f).endsWith(slut)).map((f) => `${mapp}${String(f).replace(/\\/g, '/')}`) : []);
const bilder = [...filer('assets/sprites/', '.png'), ...filer('assets/foremal/', '.png'), ...filer('assets/rum/', '.png'), ...filer('assets/tiles/', '.png'),
  ...filer('assets/bildkort/', '.png'), ...filer('assets/sidovyer/', '.png'), ...filer('assets/portratt/', '.png')];
const ljud = filer('assets/ljud/', '.wav');

/** PNG-filens bitar (chunks), i ordning. */
function pngBitar(buf) {
  const ut = []; let i = 8;
  while (i < buf.length) { const n = buf.readUInt32BE(i); ut.push(buf.toString('latin1', i + 4, i + 8)); i += 12 + n; }
  return ut;
}
/** WAV-filens bitar. */
function wavBitar(buf) {
  const ut = []; let i = 12;
  while (i + 8 <= buf.length) { const n = buf.readUInt32LE(i + 4); ut.push(buf.toString('latin1', i, i + 4)); i += 8 + n + (n & 1); }
  return ut;
}

describe('grafiken och ljuden', () => {
  it('det finns figurer och ljud', () => {
    expect(bilder.length).toBeGreaterThan(0);
    expect(ljud.length).toBeGreaterThan(0);
  });
  it('varje fil står i assets/LICENSER.md (filen eller dess mapp)', () => {
    const licenser = las('assets/LICENSER.md').toString();
    const finns = (f) => licenser.includes(f) || f.split('/').slice(0, -1).some((_, i, d) => licenser.includes('`' + d.slice(0, i + 1).join('/') + '/'));
    expect([...bilder, ...ljud].filter((f) => !finns(f))).toEqual([]);
  });
  it('ingen metadata följer med: bilderna har bara pixlar, ljuden bara format och data', () => {
    const tillatet = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    for (const f of bilder) expect(pngBitar(las(f)).filter((b) => !tillatet.has(b)), f).toEqual([]);
    for (const f of ljud) expect(wavBitar(las(f)), f).toEqual(['fmt ', 'data']);
  });
  it('färgförteckningen finns, och hjältens hud och dräkt finns i bilderna (palettbytet hittar dem)', () => {
    const p = JSON.parse(las('assets/palett.json').toString()).farger;
    expect(new Set(p).size).toBe(p.length);
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    for (const t of [...HUD_A.toner, ...DRAKT_A.toner]) expect(p, hex(t)).toContain(hex(t));
  });
  it('paletten är Stils masterpalett (beslut 28.4): samma färger, och taket per zon står med', () => {
    const stil = JSON.parse(las('verktyg/stil/palett/palett.json').toString());
    const vara = JSON.parse(las('assets/palett.json').toString());
    const hexar = [...stil.farger, ...(stil.tillagg || []).filter((t) => t && t.hex)].map((f) => f.hex.toLowerCase()).sort();
    expect(vara.farger).toEqual(hexar);
    expect(vara.tak_per_zon).toBe(stil.tak_per_zon);
  });
  it('hjälten och staven är 16 × 24 i fyra riktningar, gången har fyra bilder', () => {
    for (const figur of ['hjalte', 'stav']) {
      const ramar = JSON.parse(las(`assets/sprites/${figur}/${figur}.json`).toString()).frames;
      const prefix = figur === 'hjalte' ? 'hjalte_ga_' : 'stav_hand_';
      for (const [k, r] of Object.entries(ramar)) if (k.startsWith(prefix)) expect([r.frame.w, r.frame.h]).toEqual([16, 24]);
      for (const riktning of ['ner', 'upp', 'hoger', 'vanster']) {
        const n = Object.keys(ramar).filter((k) => k.startsWith(`${prefix}${riktning}_`)).length;
        expect(n, `${figur} ${riktning}`).toBe(figur === 'hjalte' ? 4 : 1);
      }
    }
  });
  it('Herr Skata kan flyga åt båda hållen', () => {
    const ramar = Object.keys(JSON.parse(las('assets/sprites/herr_skata/herr_skata.json').toString()).frames);
    for (const r of ['herr_skata_flyga_hoger_01', 'herr_skata_flyga_hoger_02', 'herr_skata_flyga_vanster_01', 'herr_skata_flyga_vanster_02']) expect(ramar).toContain(r);
  });
});

import { hjaltensByten, flyttaTon, tillHsl, franHsl, HUD_A, DRAKT_A } from '../../src/karna/fargbyte.js';
describe('hjältens palettbyten', () => {
  it('förvalet byter ingenting', () => {
    expect(hjaltensByten(HUD_A.mitt, DRAKT_A.mitt).size).toBe(0);
  });
  it('färgen går fram och tillbaka genom HSL', () => {
    for (const c of [0x2e8bd8, 0x4fae6a, 0xd8a24a, 0x9a6ad8, 0x3a3e48]) {
      const [h, s, l] = tillHsl(c); const d = franHsl(h, s, l);
      for (const sk of [16, 8, 0]) expect(Math.abs(((d >> sk) & 255) - ((c >> sk) & 255))).toBeLessThanOrEqual(1);
    }
  });
  it('en annan hud: skuggan mörkare och ljuset ljusare än mitten, som i förlagan', () => {
    const m = hjaltensByten(0xd8a24a, 0x6e3a3a);
    expect(m.get(HUD_A.mitt)).toBe(0xd8a24a);
    expect(m.get(DRAKT_A.mitt)).toBe(0x6e3a3a);
    const l = (c) => tillHsl(c)[2];
    expect(l(m.get(HUD_A.toner[1]))).toBeLessThan(l(0xd8a24a));
    expect(l(m.get(HUD_A.toner[3]))).toBeGreaterThan(l(0xd8a24a));
    expect(m.size).toBe(HUD_A.toner.length + DRAKT_A.toner.length);
    expect(flyttaTon(HUD_A.mitt, HUD_A.mitt, 0x4fae6a)).toBe(0x4fae6a);
  });
});

describe('kartornas grafik', () => {
  const kartmapp = 'kartor/den-gomda-dalen/';
  const kartor = readdirSync(new URL(kartmapp, rot)).filter((f) => f.endsWith('.tmj')).map((f) => [f, JSON.parse(las(kartmapp + f).toString())]);
  const egen = (o) => Object.fromEntries((o.properties || []).map((p) => [p.name, p.value]));
  const ramar = new Set([...filer('assets/foremal/', '.json'), ...filer('assets/sprites/', '.json')].flatMap((f) => Object.keys(JSON.parse(las(f).toString()).frames)));
  it('varje bild som en karta pekar på finns (föremål, figurer, rummens bilder och marken)', () => {
    const saknas = [];
    for (const [f, k] of kartor) {
      const ke = egen(k);
      if (ke.bild && !existsSync(new URL(`assets/rum/hus/${ke.bild}.png`, rot))) saknas.push(`${f}: rummet ${ke.bild}`);
      if (ke.mark && !existsSync(new URL(`assets/tiles/${ke.mark}/${ke.mark}.json`, rot))) saknas.push(`${f}: marken ${ke.mark}`);
      for (const l of k.layers) for (const o of l.objects || []) {
        const e = egen(o);
        for (const b of [e.bild, e.bild_natt, e.bild_del, e.bild_kvar, e.bild_sedan, e.bild_sitter, ...String(e.bild_rad || "").split(","), ...String(e.bild_hugg || "").split(","), ...String(e.bild_anim || "").split(",")].map((x) => String(x || "").trim()).filter(Boolean)) if (!ramar.has(b)) saknas.push(`${f} ${o.name}: ${b}`);
      }
    }
    expect(saknas).toEqual([]);
  });
  it('varje föremål i varje nivåvariant har en bild (beslut 66.3): i ett kapitel med grafik ritas inget läsval som gråbox', () => {
    // samma val som motorn (Rum.ritaObjekt): alternativets bild när den finns, annars kartans när föremålet är
    // alternativets eget. En variant som bara får gråboxens rutor är ett fel i ett kapitel där rummen har grafik.
    const kartaFor = new Map(kartor.map(([f, k]) => [f.replace(/\.tmj$/, ''), k]));
    const kapitelmapp = 'content/den-gomda-dalen/';
    const fel = [];
    let provade = 0;
    for (const fil of readdirSync(new URL(kapitelmapp, rot)).filter((f) => /^kap-\d+\.json$/.test(f))) {
      const kap = JSON.parse(las(kapitelmapp + fil).toString());
      const kartorna = (kap.rum || []).map((r) => kartaFor.get(r.id)).filter(Boolean);
      const medGrafik = kartorna.some((k) => egen(k).bild || egen(k).mark);
      if (!medGrafik) continue;
      const objektI = new Map(kartorna.flatMap((k) => k.layers.flatMap((l) => l.objects || [])).map((o) => [o.name, egen(o)]));
      for (const p of kap.pussel.filter((x) => x.i_rummet && x.varianter)) {
        for (const tal of [1, 2, 3, 4]) {
          const [vn, v] = valjVariant(p.varianter, tal);
          for (const a of v.alternativ.filter((x) => x.objekt && objektI.has(x.objekt))) {
            const delar = synligaEgenskaper(a.bild || a.id) ? [{ bild: a.bild ?? null, egen: egetForemal(p, a.objekt) }] : null;
            const kart = objektI.get(a.objekt);
            // det som inte ritas som bild i världen: stigar och dörrar i marken eller rummets bild, skyltar i textlagret
            if (!kart.bild && !delar) continue;
            provade++;
            if (!foremaletsBild({ kartbild: kart.bild ?? null, delar }, (n) => ramar.has(n))) fel.push(`${fil} ${p.id} ${vn} (L${tal}): ${a.objekt} har ingen bild (${a.bild || a.id}${kart.bild ? ', kartans ' + kart.bild : ''})`);
          }
        }
      }
    }
    expect(provade).toBeGreaterThan(20);
    expect([...new Set(fel)]).toEqual([]);
  });
  it('alternativets eget föremål: kartans bild visar det, men lådorna som delas av två varianter visar sin färg (66.2)', () => {
    const finns = (n) => ['trad_stort_gammalt', 'lada_lang', 'lada_rod'].includes(n);
    const p = { varianter: { L2: { alternativ: [{ objekt: 'lada_1' }, { objekt: 'gammalt_trad' }] }, L3: { alternativ: [{ objekt: 'lada_1' }, { objekt: 'stort_gammalt_trad' }] } } };
    expect(egetForemal(p, 'stort_gammalt_trad')).toBe(true);
    expect(egetForemal(p, 'lada_1')).toBe(false);
    expect(foremaletsBild({ kartbild: 'trad_stort_gammalt', delar: [{ bild: 'stort_gammalt_trad', egen: true }] }, finns)).toBe('trad_stort_gammalt');
    expect(foremaletsBild({ kartbild: 'lada_lang', delar: [{ bild: 'lada_rod', egen: false }] }, finns)).toBe('lada_rod');
    expect(foremaletsBild({ kartbild: 'lada_lang', delar: [{ bild: 'lada_gron', egen: false }] }, finns)).toBe(null);
    expect(foremaletsBild({ kartbild: 'lada_lang', delar: null }, finns)).toBe('lada_lang');
  });
  it('skogens rutlager (Teknik 3): rätt storlek, bara rutor som finns i rutsetet, och lagret med den hemliga stigen hör till ett föremål', () => {
    const ts = JSON.parse(las('assets/tiles/skog/skog.json').toString());
    for (const rum of ['skogsbrynet', 'buskarna', 'glantan']) {
      const [, k] = kartor.find(([f]) => f === `${rum}.tmj`);
      const namn = k.layers.filter((l) => l.type === 'tilelayer').map((l) => l.name);
      expect(namn.slice(0, 2), rum).toEqual(['golv', 'over']);
      const objekt = new Set(k.layers.flatMap((l) => l.objects || []).map((o) => o.name));
      for (const l of k.layers.filter((x) => x.type === 'tilelayer')) {
        expect(l.data.length, `${rum} ${l.name}`).toBe(k.width * k.height);
        expect(l.data.every((g) => g === 0 || (g >= 1 && g <= ts.tilecount)), `${rum} ${l.name}`).toBe(true);
        const vm = egen(l).visas_med; if (vm) expect(objekt.has(vm), `${rum} ${l.name}`).toBe(true);
      }
      expect(k.layers.find((l) => l.name === 'golv').data.every((g) => g > 0), `${rum}: golvet har en ruta överallt`).toBe(true);
    }
  });
  it('skogens figurer i tomgång byter bild högst fyra gånger per sekund (golvets gräns, 45)', () => {
    for (const [f, k] of kartor) for (const l of k.layers) for (const o of l.objects || []) { const e = egen(o); if (e.bild_anim) expect(Number(e.anim_ms), `${f} ${o.name}`).toBeGreaterThanOrEqual(250); }
  });
  it('rummets bild har kartans storlek', () => {
    for (const [f, k] of kartor) {
      const b = egen(k).bild; if (!b) continue;
      const png = las(`assets/rum/hus/${b}.png`);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], f).toEqual([k.width * k.tilewidth, k.height * k.tileheight]);
    }
  });
});

describe('mellanscenernas bilder och bildkorten', () => {
  const kapitel = readdirSync(new URL('content/den-gomda-dalen/', rot)).filter((f) => /^kap-\d+\.json$/.test(f)).map((f) => JSON.parse(las('content/den-gomda-dalen/' + f).toString()));
  const ramar = new Set([...filer('assets/sprites/', '.json'), ...filer('assets/foremal/', '.json')].flatMap((f) => Object.keys(JSON.parse(las(f).toString()).frames)));
  // äggets regi (Rum.js AGGET, 36.7): bilderna som varje läge använder
  const AGGET = {
    agg_frost: ['agg_01'], agg_filt: ['agg_filt_frost', 'agg_filt'], agg_lyser: ['agg_lyser_01', 'agg_lyser_02', 'agg_lyser_03'],
    agg_klackning: ['agg_knack_01', 'agg_knack_02', 'agg_kras_01', 'agg_nos_01', 'agg_ute_01', 'agg_ute_02', 'agg_hopp_01', 'agg_skal', 'agg_frys_01', 'agg_frys_02', 'agg_gungar_hoger', 'agg_gungar_vanster'],
  };
  /** Har rummets karta punkten regi_<namn>? */
  const regiPunkt = (rumId, namn) => existsSync(new URL(`kartor/den-gomda-dalen/${rumId}.tmj`, rot))
    && JSON.parse(las(`kartor/den-gomda-dalen/${rumId}.tmj`).toString()).layers.some((l) => (l.objects || []).some((o) => o.name === `regi_${namn}`));
  it('Farfar i dörren (67.2): sovrummet har punkten där han står, och hans bilder finns på natten och på morgonen', () => {
    expect(regiPunkt('sovrummet', 'farfar')).toBe(true);
    for (const b of ['natt', 'morgon']) for (const h of ['ner', 'upp']) expect(ramar.has(`farfar_${b}_${h}_01`), `${b} ${h}`).toBe(true);
  });
  const STILS_REGI = /** @type {Record<string, string[]>} */ ({
    farfar_skriver: ['farfar_fatolj_skriver_01'], farfar_gaspar: ['farfar_fatolj_gaspar_01'], apa_suckar: ['apa_sucka_01'],
    ekorre_knacker: ['ekorre_skaka_hoger_01', 'ekorre_skaka_vanster_01'], ugglor_vrider: ['uggla_vrid_01'], stav_ristas: ['efx_stav_ristas_08'],
    buske_prasslar: [...ramar].filter((r) => r.endsWith('_prassel_01')).slice(0, 1),
  });
  const GRABOX_REGI = new Set(['unge_sjunker', 'unge_dras_upp', 'bubblor_fran_blommorna', 'halvan_flyger_till_handen',
    // beslut 71 (Teknik 34): stocken, Tant Rosa, lyktorna och elden
    'unge_hoppar_pa_stocken', 'unge_piper_pa_stocken', 'unge_hoppar_i_land', 'tant_rosa_nar_inte', 'byborna_jublar', 'elden_tands']);
  it('varje mellanscen med bild har grafik (morgonen i sängen, luftskeppets lägen, sidovyerna, ungen på kartbiten, ägget)', () => {
    const saknas = [];
    for (const k of kapitel) for (const sc of k.scener) for (const st of sc.steg) {
      if (st.typ !== 'mellanscen' || !st.bild) continue;
      const finns = st.bild === 'hjalte_sang_morgon' ? ramar.has('hjalte_sang_morgon_01') && ramar.has('hjalte_sang_morgon_02')
        : st.bild === 'luftskepp_river_brevet' ? ramar.has('luftskepp_glider_01')
        : st.bild.startsWith('luftskepp_') ? ramar.has(st.bild) || ramar.has(st.bild + '_01')
          : st.bild === 'kartbit_unge' ? existsSync(new URL('assets/sidovyer/kartbit_unge_01.png', rot)) && existsSync(new URL('assets/sidovyer/kartbit_unge_02.png', rot))
          : AGGET[st.bild] ? AGGET[st.bild].every((r) => ramar.has(r))
          // Farfar i dörren (67.2): hans bilder, och punkten regi_farfar i rummets karta
          : /^farfar_(i_dorren|gar_ut)$/.test(st.bild) ? ['natt', 'morgon'].every((b) => ramar.has(`farfar_${b}_ner_01`) && ramar.has(`farfar_${b}_upp_01`)) && regiPunkt(sc.rum, 'farfar')
          // Stils regier (Teknik 31): ungens lägen och figurernas bilder
          : /^unge_(gaspar|fnissar_mun|fnissar|kryper_ihop|lyssnar|biter)/.test(st.bild) ? [...ramar].some((r) => r.startsWith(`unge1_${st.bild.replace(/^unge_/, '').replace(/_(upp|ner|hoger|vanster)$/, '')}_`))
          : STILS_REGI[st.bild] ? STILS_REGI[st.bild].every((r) => ramar.has(r))
          // kapitel 2:s gråbox (69.1): ritas med figurerna som finns och gråboxens former
          : GRABOX_REGI.has(st.bild) ? true
          : existsSync(new URL(`assets/sidovyer/${st.bild}_bakgrund.png`, rot));
      if (!finns) saknas.push(`${k.id} ${sc.id}: ${st.bild}`);
    }
    expect(saknas).toEqual([]);
  });
  it('ett mål med egen bild i molnet (ga_till med bild) har sitt bildkort (krönet, 42.4)', () => {
    const saknas = [];
    for (const k of kapitel) for (const sc of k.scener) for (const st of sc.steg) {
      if (st.typ === 'ga_till' && st.bild && !existsSync(new URL(`assets/bildkort/${st.bild}.png`, rot))) saknas.push(`${k.id} ${sc.id}: ${st.bild}`);
    }
    expect(saknas).toEqual([]);
    expect(kapitel.find((k) => k.id === 'kap-01').scener.find((sc) => sc.id === 'k1s08_loven').steg.find((st) => st.mal === 'kronet').bild).toBe('uppdrag_kullen');
  });
  it('uppdragslappen (2d): varje uppdrag har sitt bildkort, och lappens papper, kompassros och stämpel finns', () => {
    const saknas = [];
    for (const k of kapitel) for (const u of k.uppdrag || []) if (!existsSync(new URL(`assets/bildkort/${u.bild}.png`, rot))) saknas.push(`${k.id} ${u.id}: ${u.bild}`);
    expect(saknas).toEqual([]);
    for (const f of ['lapp_uppdrag', 'lapp_kompassros', 'stampel', 'ikon_uppdrag', 'ikon_klar', 'ikon_fram']) expect(existsSync(new URL(`assets/ui/${f}.png`, rot)), f).toBe(true);
  });
  it('ordkraftens ljus har fyra bilder (39.2)', () => {
    for (const i of [1, 2, 3, 4]) expect(ramar.has(`efx_ordkraft_0${i}`)).toBe(true);
  });
  it('luftskeppet har alla bilder som regin använder, och hjälmen som trillar', () => {
    for (const r of ['glider_01', 'glider_02', 'skata_landar', 'ser_hjalten', 'ser_kartan', 'talar_01', 'talar_02', 'skata_putsar_01', 'skata_putsar_02', 'skata_snor', 'trasslar_01', 'trasslar_02',
      'laser_skyltarna', 'laser_skyltarna_talar', 'flyger_fel_01', 'flyger_fel_02']) expect(ramar.has('luftskepp_' + r), r).toBe(true);
    expect(ramar.has('baronen_hjalm')).toBe(true);
    expect(ramar.has('hjalte_kartbit_upp_01')).toBe(true); // hjälten håller upp kartbiten (s22)
  });
  it('Farfars porträtt har radiomärket, och kartbit 1 och 2 finns med sitt läge i kartan', () => {
    for (const m of ['glad', 'fundersam']) expect(existsSync(new URL(`assets/portratt/farfar_portratt_${m}_radio.png`, rot)), m).toBe(true);
    const karta = JSON.parse(las('assets/karta/karta.json').toString());
    expect(karta.storlek).toEqual([224, 144]);
    const storlek = (f) => { const png = las(f); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
    for (const n of [1, 2]) {
      const f = `assets/karta/kartbit_${n}.png`, [b, h] = storlek(f), l = karta.bitar[`kartbit_${n}`];
      expect(l, f).toBeTruthy();
      // biten ligger inne i kartan
      expect(l.x + b <= 224 && l.y + h <= 144, f).toBe(true);
    }
  });
  it('bildkorten är 48 × 48, och sidovyns bakgrund fyller skärmen (320 × 192)', () => {
    const storlek = (f) => { const png = las(f); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
    // expeditionsbokens bilder är 110 × 70 (bokbildens ruta i halva storleken, 10f), alla andra 48 × 48
    const BOKBILDER = ['dal_i_moln', 'ordtradet', 'unge_farfar_med_dino', 'unge_farfar_far_agg'];
    for (const f of filer('assets/bildkort/', '.png')) expect(storlek(f), f).toEqual(BOKBILDER.some((b) => f.endsWith(`/${b}.png`)) ? [110, 70] : [48, 48]);
    for (const b of BOKBILDER) expect(existsSync(new URL(`assets/bildkort/${b}.png`, rot)), b).toBe(true);
    for (const f of filer('assets/sidovyer/', '_bakgrund.png')) expect(storlek(f), f).toEqual([320, 192]);
    expect(existsSync(new URL('assets/bildkort/filt_rod.png', rot))).toBe(true);
  });
  it('baronens porträtt finns i alla tre minerna', () => {
    for (const m of ['stolt', 'forvanad', 'sur']) expect(existsSync(new URL(`assets/portratt/baronen_portratt_${m}.png`, rot)), m).toBe(true);
  });
});
