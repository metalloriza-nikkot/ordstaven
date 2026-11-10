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
    expect(medFel((k) => { k.scener[7].steg[2].text = 'Hej, {UNGE}!'; })).toMatch(/små bokstäver/);
    expect(medFel((k) => { k.scener[7].steg[2].text = 'Hej, {katt}!'; })).toMatch(/okänd platshållare/);
  });
  it('fångar okänd talare, saknat rum, saknat mål och saknat pussel', () => {
    expect(medFel((k) => { k.scener[1].steg[1].talare = 'tomten'; })).toMatch(/okänd talare/);
    expect(medFel((k) => { k.scener[3].rum = 'kallaren'; })).toMatch(/rummet kallaren finns inte/);
    expect(medFel((k) => { k.scener[3].steg[2].mal = 'garderob'; })).toMatch(/garderob finns inte i rummet/);
    expect(medFel((k) => { k.scener[4].steg[2].pussel_id = 'p0_finns_inte'; })).toMatch(/pusslet p0_finns_inte finns inte/);
  });
  it('fångar ett tillstånd som aldrig kan uppstå', () => {
    expect(medFel((k) => { k.scener[5].tillstand = 'kvall'; })).toMatch(/tillståndet kvall/);
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
  it('fångar ett uppdrag på lappen vars steg, stämpel eller ersatta replik inte finns (2d)', () => {
    const f = medFel((k) => {
      const u = k.uppdrag[0];
      u.steg[0].klart = { scen: u.steg[0].klart.scen, ga_till: 'finns_inte' };
      u.steg[1].ersatter = [{ scen: k.scener[0].id, text: 'Ingen sådan replik.' }];
    });
    expect(f).toMatch(/uppdrag u0_vinden: stegen GÅ UT I HALLEN finns inte/);
    expect(f).toMatch(/repliken "Ingen sådan replik\." i .*, som lappen ersätter, finns inte/);
  });
  it('Var var vi (2.27): godkänd post, och fel pass, dubbla poster, flera ord och upplast false fångas', () => {
    const post = (pass, x = {}) => ({ pass, ord: { ord: 'mat', bild: 'dinomat' }, kort: [{ talare: 'farfar', text: 'Var var vi? {unge} är hungrig.' }], lang: [{ talare: 'farfar', text: 'Var var vi? Staven vaknade i natt.' }, { talare: 'farfar', text: 'Nu är {unge} hungrig.' }], ...x });
    const d = riktigt(); d.kapitel[0].var_var_vi = [post(2)];
    expect(kontrollera(d).fel).toEqual([]);
    const f = medFel((k) => { k.var_var_vi = [post(9), post(2), post(2, { ord: { ord: 'mat och bär' } }), post(3, { kort: [{ talare: 'farfar', text: 'Hej.', upplast: false }] })]; });
    expect(f).toContain('kapitlet har inget pass 9');
    expect(f).toContain('pass 2 har två poster');
    expect(f).toContain('ordet att läsa är ett enda ord');
    expect(f).toContain('upplast: false går inte här');
    expect(medFel((k) => { k.var_var_vi = [post(2, { lang: [] })]; })).toMatch(/lang/);
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
    const hallen = ['stege_upp', 'dorr_farfar', 'dorr_bok', 'dorr_mat', 'dorr_sov', 'dorr_bad', 'dorr_ut', 'farfar_vid_dorren'].map((id, i) => ({ id, x: 10 + i * 36, y: 4, b: 20, h: 20 }));
    expect(medFel(() => {}, karta(hallen))).toBe('');
    expect(medFel(() => {}, karta(hallen.slice(1)))).toMatch(/stege_upp saknas i kartan/);
    expect(medFel(() => {}, karta([...hallen, { id: 'pianot', x: 0, y: 0, b: 10, h: 10 }]))).toMatch(/pianot finns inte/);
    expect(medFel(() => {}, karta([...hallen.slice(1), { ...hallen[0], till: 'kallaren' }]))).toMatch(/leder till kallaren/);
  });
});

import { PALETT, ljushet, egenskaper } from '../../src/karna/egenskaper.js';

describe('bilden stämmer med texten', () => {
  it('gråboxens färger skiljer sig i ljushet (minst 10 L* mellan alla par)', () => {
    const e = Object.entries(PALETT);
    for (const [a, x] of e) for (const [b, y] of e) if (a < b) expect(Math.abs(ljushet(x) - ljushet(y)), `${a}–${b}`).toBeGreaterThanOrEqual(10);
  });
  it('egenskaperna i ett bild-id läses ut', () => {
    expect(egenskaper('lada_rod_stor')).toEqual({ farg: 'rod', storlek: 'stor' });
    expect(egenskaper('liten_rod')).toEqual({ farg: 'rod', storlek: 'liten' });
    expect(egenskaper('filt')).toEqual({ farg: null, storlek: null });
  });
  it('varje alternativ vars färg eller storlek läses i texten har den egenskapen i sitt id eller sin bild', () => {
    const ORD = { röd: ['farg', 'rod'], röda: ['farg', 'rod'], blå: ['farg', 'bla'], gul: ['farg', 'gul'], gula: ['farg', 'gul'], stor: ['storlek', 'stor'], stora: ['storlek', 'stor'], stort: ['storlek', 'stor'], litet: ['storlek', 'liten'], liten: ['storlek', 'liten'], lilla: ['storlek', 'liten'] };
    const d = riktigt();
    for (const k of d.kapitel) for (const p of k.pussel) for (const [niva, v] of Object.entries(p.varianter || {})) {
      // en rad i taget: egenskapen gäller saken på samma rad ("En röd filt."), eller alla rätta om de saknar ord
      const har = (rad, o) => new RegExp(`(^|[^a-zåäö])${o}([^a-zåäö]|$)`).test(rad);
      for (const rad of [v.text].flat().filter(Boolean).map((x) => x.toLocaleLowerCase('sv-SE'))) {
        const lasta = Object.entries(ORD).filter(([o]) => har(rad, o));
        // ett kort som bara är en bild (packlistan v0.11.3) hör till raden som nämner saken i dess bild-id (filt_rod → filt)
        const vik = (x) => x.replace(/[åä]/g, 'a').replace(/ö/g, 'o');
        const saken = (a) => (a.bild || a.id).split('_').filter((d) => !Object.values(ORD).some(([, v]) => v === d));
        const galler = v.alternativ.filter((a) => a.ratt && (a.ord ? har(rad, a.ord.toLocaleLowerCase('sv-SE')) : saken(a).some((d) => har(vik(rad), d))));
        for (const r of galler) for (const [, [slag, varde]] of lasta) {
          expect(egenskaper(r.bild || r.id)[slag], `${k.id} ${p.id} ${niva}: ${r.id} syns inte som ${varde}`).toBe(varde);
        }
      }
    }
  });
});

describe('kontrollen: enhet, alias, nivåer', () => {
  const medVarning = (andra) => { const d = riktigt(); andra(d.kapitel[0]); return kontrollera(d).varningar.join('\n'); };
  const medFel = (andra) => { const d = riktigt(); andra(d.kapitel[0]); return kontrollera(d).fel.join('\n'); };
  it('varnar för instruktioner som nämner en enhet', () => {
    expect(medVarning((k) => { k.scener[3].steg[0].text = 'Använd piltangenterna.'; })).toMatch(/nämner en enhet \(piltangenterna\)/);
    expect(medVarning((k) => { k.scener[3].steg[0].text = 'Klicka på lådan.'; })).toMatch(/nämner en enhet/);
    expect(medVarning((k) => { k.scener[3].steg[0].text = 'Tryck på lådan.'; })).not.toMatch(/nämner en enhet/);
  });
  it('alias pekar på id:n som finns, och golvet ligger under taket', () => {
    expect(medFel((k) => { k.alias = { scener: { s99_gammal: 's99_finnsinte' } }; })).toMatch(/pekar på s99_finnsinte/);
    expect(medFel((k) => { k.alias = { scener: { s02_glimten: 's03_staven' } }; })).toMatch(/finns fortfarande/);
    expect(medFel((k) => { k.alias = { scener: { s99_gammal: 's03_staven' } }; })).toBe('');
    expect(medFel((k) => { k.nivaer = { lasning: ['L3', 'L1'] }; })).toMatch(/golvet L3/);
  });
  it('varnar en gång per ord i en lästext som saknas i ordlistorna, också böjda former (granskningen A 25)', () => {
    const lapp = (k) => k.pussel.find((p) => p.id === 'p0_dinomat');
    const v = medVarning((k) => { lapp(k).varianter.L2.text = ['Följ mina skyltar.', 'Följ mina skyltar igen.']; });
    expect(v).toMatch(/ordet skyltar i en lästext finns inte i ordlistorna \(pussel p0_dinomat L2 text och ett ställe till\)/);
    expect(v.match(/ordet skyltar/g)).toHaveLength(1);
    // det som läses upp (en replik) är ingen lästext
    expect(medVarning((k) => { k.scener[3].steg[0].text = 'Följ mina skyltar.'; })).not.toMatch(/ordet skyltar/);
  });
  it('ljud från ett föremål: föremålet ska finnas i rummet', () => {
    expect(medFel((k) => { k.scener.find((s) => s.id === 's04_agget').steg.unshift({ typ: 'ljud', id: 'dunk', foremal: 'lada_med_agg' }); })).toBe('');
    expect(medFel((k) => { k.scener.find((s) => s.id === 's04_agget').steg.unshift({ typ: 'ljud', id: 'dunk', foremal: 'pianot' }); })).toMatch(/pianot finns inte/);
  });
});

describe('kapitel 1: rummens text, frivilligt och nya steg (schema 2.8)', () => {
  const medFel = (andra) => { const d = riktigt(); andra(d.kapitel[1], d); return kontrollera(d).fel.join('\n'); };
  const rum = (k, id) => k.rum.find((r) => r.id === id);
  const scen = (k, id) => k.scener.find((s) => s.id === id);
  it('skyltarna hör till rummet: föremålet ska finnas, och texten kontrolleras som lästext', () => {
    expect(medFel(() => {})).toBe('');
    expect(medFel((k) => { rum(k, 'skogsbrynet').skyltar.skylt_saknas = { text: 'bär' }; })).toMatch(/skylten skylt_saknas finns inte/);
    expect(medFel((k) => { rum(k, 'skogsbrynet').skyltar.skylt_bar.text = 'BÄR'; })).toMatch(/vanlig skrift/);
    expect(medFel((k) => { rum(k, 'skogsbrynet').skyltar.skylt_ingang.text = 'Gå till berget.'; })).toMatch(/berget är spärrat/);
  });
  it('las_skylt pekar på en skylt i rummet', () => {
    expect(medFel((k) => { scen(k, 'k1s01_brynet').steg.find((s) => s.typ === 'las_skylt').foremal = 'skylt_farfar_1'; })).toMatch(/har ingen skylt/);
  });
  it('frivilligt: föremålet ska finnas, stegen kontrolleras, och pusslet räknas som använt', () => {
    const d = riktigt();
    expect(kontrollera(d).varningar.join('\n')).not.toMatch(/k1_svard_igen används inte/);
    expect(medFel((k) => { rum(k, 'skogsbrynet').frivilligt[0].foremal = 'stubbe_borta'; })).toMatch(/stubbe_borta finns inte/);
    expect(medFel((k) => { rum(k, 'skogsbrynet').frivilligt[1].steg[0].pussel_id = 'k1_finns_inte'; })).toMatch(/pusslet k1_finns_inte finns inte/);
    expect(medFel((k) => { rum(k, 'glantan').frivilligt[0].steg.push({ typ: 'sparpunkt', pass_slut: true }); })).toMatch(/hör inte hemma i ett frivilligt/);
  });
  it('en frivillig scen behöver ett rum att starta i, och räknas inte in i passets tid', () => {
    expect(medFel((k) => { delete scen(k, 'k1s03_buskarna').startar_i_rum; })).toMatch(/startar_i_rum/);
    const d = riktigt();
    const fore = kontrollera(d).pass.find((p) => p.kapitel === 'kap-01' && p.pass === 1).minuter;
    scen(d.kapitel[1], 'k1s03_buskarna').steg.push(...Array(20).fill({ typ: 'mellanscen', beskrivning: 'Ungen nosar.' }));
    expect(kontrollera(d).pass.find((p) => p.kapitel === 'kap-01' && p.pass === 1).minuter).toBe(fore);
  });
  it('visa_foremal, paminnelse och skylt på pusslet kontrolleras', () => {
    expect(medFel((k) => { scen(k, 'k1s08_loven').steg.find((s) => s.typ === 'visa_foremal').foremal = 'lada_borta'; })).toMatch(/lada_borta finns inte/);
    expect(medFel((k) => { const r = scen(k, 'k1s13_slutet').steg.find((s) => s.paminnelse); delete r.vantar_pa; })).toMatch(/paminnelse gäller bara/);
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'k1_stenen').skylt = 'skylt_borta'; })).toMatch(/skylten skylt_borta, som inte finns/);
  });
  it('räddningens brickor räcker till ordet, och lövhögarnas sista sak finns', () => {
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'k1_apan').brickor = ['A', 'E', 'G', 'O', 'R', 'T']; })).toMatch(/saknar S till STEGE/);
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'k1_loven').sak_i_sista = 'kartbit_2'; })).toMatch(/sak_i_sista kartbit_2/);
    expect(medFel((k) => { k.pussel.find((p) => p.id === 'k1_loven').foremal.pop(); })).toMatch(/3 föremål men 4 poster/);
  });
});

/** Varje reaktion och knuff i ett kapitel (objekt med handling eller reaktion), utom efter_3_fel och förenklingen. */
function allaReaktioner(k) {
  const ut = [];
  const ga = (x, nyckel) => {
    if (Array.isArray(x)) { x.forEach((y) => ga(y, nyckel)); return; }
    if (!x || typeof x !== 'object' || nyckel === 'efter_3_fel' || nyckel === 'forenkla') return;
    if (typeof x.handling === 'string' || typeof x.reaktion === 'string') ut.push(x);
    for (const [n, v] of Object.entries(x)) if (n !== 'replik') ga(v, Array.isArray(v) ? nyckel : n);
  };
  ga(k.pussel, ''); ga(k.scener, ''); ga(k.rum, '');
  return ut;
}

describe('mellanscenernas text för den vuxne (beslut 65)', () => {
  const scen = (k, id) => k.scener.find((s) => s.id === id);
  it('regeln: en beskrivning visas bara utan bild och utan syns_redan', async () => {
    const { visarBeskrivning } = await import('../../src/karna/mellanscen.js');
    expect(visarBeskrivning({ typ: 'mellanscen', beskrivning: 'Ungen gäspar.' })).toBe(true);
    expect(visarBeskrivning({ typ: 'mellanscen', beskrivning: 'Ungen gäspar.', bild: 'agg_frost' })).toBe(false);
    expect(visarBeskrivning({ typ: 'mellanscen', beskrivning: 'Ungen gäspar.', syns_redan: true })).toBe(false);
    expect(visarBeskrivning({ typ: 'replik', text: 'Hej.' })).toBe(false);
    expect(visarBeskrivning({ typ: 'mellanscen', beskrivning: 'Ungen springer till grinden.', unge_till: 'grind' })).toBe(false); // 67.2
  });
  it('ungen springer till något i rummet (unge_till, 67.2): det ska finnas där', () => {
    const d = riktigt();
    const st = scen(d.kapitel[0], 's22_tradgarden').steg[1];
    st.unge_till = 'grind';
    expect(kontrollera(d).fel).toEqual([]);
    st.unge_till = 'brevlada';
    expect(kontrollera(d).fel.join('\n')).toMatch(/s22_tradgarden.*ungen springer till brevlada, men det finns inte i rummet tradgarden/);
  });
  it('kontrollen räknar dem i varje kapitel och i aventyr.json, men säger inget fel förrän kapitlet är klart', () => {
    const r = kontrollera(riktigt());
    expect(r.fel).toEqual([]);
    const antal = Object.fromEntries(r.beskrivningar.map((b) => [b.kapitel, b.platser.length]));
    expect(antal['kap-00']).toBeGreaterThan(0);
    expect(antal['kap-01']).toBeGreaterThan(0);
    expect(r.beskrivningar.find((b) => b.kapitel === 'kap-01').platser.map((p) => p.plats)).toContain('rum glantan frivilligt ugglor steg 1');
  });
  it('ett klart kapitel som visar en beskrivning är fel, och syns_redan eller en bild gör det rätt', () => {
    const d = riktigt();
    const k = d.kapitel[1];
    k.meta.klart = true;
    const fel = kontrollera(d).fel.join('\n');
    expect(fel).toMatch(/kap-01 k1s06_present steg 9: kapitlet är klart, men mellanscenen visar texten för den vuxne \("Ungen gäspar\."\)/);
    expect(fel).not.toMatch(/^kap-00/m);
    // varje mellanscen får syns_redan: inget fel kvar
    const allaSteg = [...k.scener.flatMap((s) => s.steg), ...k.rum.flatMap((r) => (r.frivilligt || []).flatMap((f) => f.steg))];
    for (const st of allaSteg) if (st.typ === 'mellanscen' && !st.bild) st.syns_redan = true;
    expect(kontrollera(d).fel.join('\n')).not.toMatch(/mellanscenen visar/);
    // reaktionerna och knuffarna har samma regel (67.3)
    allaReaktioner(k).forEach((h) => { h.syns_redan = true; });
    expect(kontrollera(d).fel).toEqual([]);
    // en bild räcker också
    const st = scen(k, 'k1s06_present').steg[9];
    delete st.syns_redan; st.bild = 'vid_bron';
    expect(kontrollera(d).fel).toEqual([]);
  });
  it('aventyr.json: SLUTA FÖR IDAG och slutrutan prövas när äventyret är klart', () => {
    const d = riktigt();
    d.aventyr.meta = { ...(d.aventyr.meta || {}), klart: true };
    // SLUTA FÖR IDAG har syns_redan (Innehåll, 67.9), och slutrutans mellanscen är kvar
    expect(kontrollera(d).fel.join('\n')).toMatch(/aventyr\.json kapitel_last steg 0: äventyret är klart/);
    for (const st of [...d.aventyr.sluta_for_idag.fore_ungen, ...d.aventyr.sluta_for_idag.med_ungen, ...d.aventyr.kapitel_last.steg]) if (st.typ === 'mellanscen') st.syns_redan = true;
    expect(kontrollera(d).fel).toEqual([]);
  });
});

describe('reaktionernas och knuffarnas text för den vuxne (beslut 67.3)', () => {
  it('regeln: en reaktion eller knuff visar sin text bara utan syns_redan, och krukornas knuff aldrig', async () => {
    const { visarRegi, reaktionerSomVisas } = await import('../../src/karna/mellanscen.js');
    expect(visarRegi({ reaktion: 'en kotte trillar ner på hjälmen' })).toBe(true);
    expect(visarRegi({ handling: 'skylten glimtar', syns_redan: true })).toBe(false);
    expect(visarRegi({ replik: { talare: 'berattare', text: 'Hoppsan!' } })).toBe(false);
    const k = riktigt().kapitel[0];
    const platser = reaktionerSomVisas(k).map((r) => r.plats);
    expect(platser).toContain('pussel p0_dorrar varianter L1 alternativ mat vid_valj');
    expect(platser).toContain('s02_glimten steg 2 knuff');
    expect(platser.filter((p) => p.startsWith('pussel p0_krukor'))).toEqual([]); // krukornas knuff pekar i världen
    expect(platser.some((p) => / efter_3_fel/.test(p))).toBe(false);
  });
  it('kontrollen räknar dem, och ett klart kapitel med en reaktion som visar texten är fel', () => {
    const d = riktigt();
    const r = kontrollera(d);
    expect(Object.fromEntries(r.beskrivningar.map((b) => [b.kapitel, b.reaktioner.length]))).toMatchObject({ 'kap-00': 34, 'kap-01': 38 });
    const k = d.kapitel[1];
    k.meta.klart = true;
    for (const st of [...k.scener.flatMap((s) => s.steg), ...k.rum.flatMap((x) => (x.frivilligt || []).flatMap((f) => f.steg))]) if (st.typ === 'mellanscen' && !st.bild) st.syns_redan = true;
    const fel = kontrollera(d).fel.join('\n');
    expect(fel).toMatch(/kap-01 pussel k1_tradet varianter L2 alternativ ungt_trad vid_valj: kapitlet är klart, men reaktionen visar texten för den vuxne \("en kotte trillar ner på hjälmen"\)/);
    expect(fel).toMatch(/kap-01 pussel k1_stenen knuff: kapitlet är klart, men knuffen visar texten för den vuxne \("skylten glimtar"\)/);
    allaReaktioner(k).forEach((h) => { h.syns_redan = true; });
    expect(kontrollera(d).fel).toEqual([]);
  });
});

describe('kapitel 2 i schema 2.31 (Teknik 20, beslut 64.2)', () => {
  const med2 = () => { const d = riktigt(); d.kapitel.push(las('den-gomda-dalen/kap-02.json')); return d; };
  const k2 = (d) => d.kapitel[2];
  const scen = (k, id) => k.scener.find((s) => s.id === id);
  it('Innehålls data för kapitel 2 går igenom utan fel', () => {
    const r = kontrollera(med2());
    expect(r.fel).toEqual([]);
    expect(r.pass.filter((p) => p.kapitel === 'kap-02').map((p) => p.pass)).toEqual([1, 2, 3]);
    // navets sparpunkt i mellan_grenar slutar pass 2
    expect(r.varningar.join('\n')).not.toMatch(/kap-02 pass 2 slutar inte med en sparpunkt/);
  });
  it('ga_till unge, bära till ett annat rum och lockar vid en utgång i ett annat rum', () => {
    const d = med2();
    expect(kontrollera(d).fel).toEqual([]);
    scen(k2(d), 'k2s04_bryggan').steg.find((s) => s.typ === 'bara').till = 'finns_inte';
    scen(k2(d), 'k2s06_dammen').lockar.vid = 'ingenstans';
    const f = kontrollera(d).fel.join('\n');
    expect(f).toMatch(/finns_inte finns inte i något rum i kapitlet/);
    expect(f).toMatch(/lockar vid ingenstans, som inte finns i något rum/);
  });
  it('navet: grenarnas scener och mål, och stegen mellan grenarna', () => {
    const d = med2();
    const nav = scen(k2(d), 'k2s03_torget').steg.find((s) => s.typ === 'nav');
    nav.grenar[0].scen = 'k2s99_finns_inte';
    nav.grenar[1].mal = 'stig_ingenstans';
    nav.mellan_grenar.push({ typ: 'ga_till', mal: 'brunn_saknas' });
    const f = kontrollera(d).fel.join('\n');
    expect(f).toMatch(/grenens scen k2s99_finns_inte finns inte/);
    expect(f).toMatch(/grenens mål stig_ingenstans finns inte i rummet byn/);
    expect(f).toMatch(/mellan_grenar 4 \(ga_till\): brunn_saknas finns inte i rummet byn/);
  });
  it('{ord:<pussel>} pekar på ett P11, oppna_lasplatta med skylt och lys_ord, och villkoren i "Var var vi?"', () => {
    const d = med2();
    scen(k2(d), 'k2s10_elden').steg.find((s) => s.typ === 'replik' && s.text.includes('{ord:')).text = 'Du skrev {ord:k2_grodan}.';
    scen(k2(d), 'k2s04_bryggan').steg.find((s) => s.typ === 'oppna_lasplatta').lys_ord = 'over';
    k2(d).var_var_vi[2].lang[2].villkor.gren_kvar = 'k2s77';
    delete k2(d).var_var_vi[2].lang[3].villkor; // tre utan villkor och en med: fyra hörs
    const f = kontrollera(d).fel.join('\n');
    expect(f).toMatch(/\{ord:k2_grodan\} pekar inte på ett P11/);
    expect(f).toMatch(/ordet over står inte i skylten brev_halva_1/);
    expect(f).toMatch(/villkoret gren_kvar pekar på k2s77/);
    expect(f).toMatch(/lang har 4 repliker som hörs, högst tre/);
  });
});
