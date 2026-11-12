// Stils mellanscener som regier i rummet (Teknik 31, beslut 68.5): varje regi går i sitt rum, med Stils bilder.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const kap2 = JSON.parse(readFileSync(new URL('../../content/den-gomda-dalen/kap-02.json', import.meta.url), 'utf8'));

const las = (k) => JSON.parse(readFileSync(new URL(`../../content/den-gomda-dalen/${k}.json`, import.meta.url), 'utf8'));

/** En sparning i en scen (namnen finns, kapitlen före spolas fram), och spelet startat där. */
async function sparadI(page, kap, scenId, steg = 0, extra = {}) {
  const k = las(kap);
  await page.goto(`./?snabb&ny&kapitel=${kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([kap, scenId, scen, steg, extra]) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: kap, scen, scenId, steg, startad: false }, extra);
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    t.spelare.hjalte.formler = [...new Set([...(t.spelare.hjalte.formler || []), 'LJUS', 'SVÄRD'])];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [kap, scenId, k.scener.findIndex((s) => s.id === scenId), steg, extra]);
  await page.goto(`./?snabb&kapitel=${kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe(scenId);
  await page.waitForTimeout(1200);
}
const regi = (page, bild) => page.evaluate((b) => window.__ORDSTAVEN.regi(b), bild);
/** Vänta på en regi medan repliker och rutor klickas bort (berättelsen går vidare som när han spelar). */
async function vantaPaRegi(page, namn) {
  for (let i = 0; i < 80; i++) {
    if ((await page.evaluate(() => window.__ORDSTAVEN.grafik())).regi.includes(namn)) return;
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  throw new Error(`ingen regi ${namn}`);
}
/** Gå till en plats: repliker och rutor på vägen klickas bort (berättelsen går vidare som när han spelar). */
async function gaTill(page, x, y, klar) {
  for (let i = 0; i < 80; i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.evaluate(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [x, y]);
    await page.waitForTimeout(250);
    if (klar(await page.evaluate(() => window.__ORDSTAVEN.position()))) return;
  }
  throw new Error(`kom inte fram till ${x}, ${y}`);
}

test('Stils mellanscener (Teknik 31): ungens lägen, ekorren, apan, Farfar och SVÄRD som ristas', async ({ page }) => {
  test.setTimeout(150000);
  // skogsbrynet (k1s02): ungen biter i lianen, lyssnar mot norr, ekorren skakar skal över ungen, och SVÄRD ristas
  await sparadI(page, 'kap-01', 'k1s02_lianerna');
  expect(await regi(page, 'unge_biter')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_biter_(hoger|vanster|upp)_0[12]$/);
  await page.waitForTimeout(1400);
  expect(await regi(page, 'unge_lyssnar_upp')).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_lyssnar_upp_0[12]$/);
  await page.waitForTimeout(1600);
  expect(await regi(page, 'ekorre_knacker')).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('ekorre_gren'))).toMatch(/^ekorre_skaka_(hoger|vanster)_0[12]$/);
  // som förut, och slingan går igen (spelets klocka går långsammare än väggklockan i canvas-läget, därför poll)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.bildFor('ekorre_gren')), { timeout: 10000 }).toMatch(/^ekorre_gren_0[12]$/);
  expect(await regi(page, 'stav_ristas')).toBeGreaterThan(2000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/regi-stav-ristas.png' });
  await page.waitForTimeout(1500);
  for (const l of ['unge_fnissar', 'unge_fnissar_mun', 'unge_kryper_ihop', 'unge_gaspar', 'unge_lyssnar']) { expect(await regi(page, l), l).toBeGreaterThan(0); await page.waitForTimeout(1800); }
  // gläntan (k1s05): apan i nätet suckar
  await sparadI(page, 'kap-01', 'k1s05_glantan');
  // kameran visar apan i nätet när gläntan börjar (kartans visas_forst, 76.5), inte bara hjälten vid ingången
  await expect.poll(() => page.evaluate(() => { const k = window.__ORDSTAVEN.kamera(), a = window.__ORDSTAVEN.ruta('apan_i_nat');
    return a.x >= k.x && a.x + a.b <= k.x + 320 && a.y >= k.y && a.y + a.h <= k.y + 192; }), { timeout: 8000 }).toBe(true);
  await page.screenshot({ path: 'test-results/glantan-apan-forst.png' });
  expect(await regi(page, 'apa_suckar')).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('apan_i_nat'))).toMatch(/^apa_sucka_0[12]$/);
  // kontoret (s09): Farfar skriver och gäspar
  await sparadI(page, 'kap-00', 's09_lappen');
  expect(await regi(page, 'farfar_skriver')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toMatch(/^farfar_fatolj_skriver_0[12]$/);
  await page.waitForTimeout(2600);
  expect(await regi(page, 'farfar_gaspar')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toBe('farfar_fatolj_gaspar_01');
  await page.screenshot({ path: 'test-results/regi-farfar-gaspar.png' });
  // en regi som inte finns gör ingenting (då visar spelet beskrivningen)
  expect(await regi(page, 'unge_finns_inte')).toBe(0);
});

test('kapitel 2:s mellanscener i gråboxen (Teknik 32, 69.1 och 75.4): ungen sjunker i leran och dras upp, och luftskeppet river brevet och fjädern landar vid hjälten', async ({ page }) => {
  test.setTimeout(120000);
  // träskkanten: ungen skuttar ut i leran och sjunker, och sitter fast tills den dras upp
  await sparadI(page, 'kap-02', 'k2s01_kanten');
  const O = (f, a) => page.evaluate(f, a);
  expect(await O(() => window.__ORDSTAVEN.regi('unge_sjunker', 'leran'))).toBeGreaterThan(1000);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeDjup()), { timeout: 8000 }).toBe(12);
  const [u, l] = await O(() => [window.__ORDSTAVEN.ungePos(), window.__ORDSTAVEN.ruta('leran')]);
  expect(u.x).toBeGreaterThanOrEqual(l.x); expect(u.x).toBeLessThanOrEqual(l.x + l.b);
  expect(u.y).toBeGreaterThanOrEqual(l.y); expect(u.y).toBeLessThanOrEqual(l.y + l.h);
  expect(await O(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_radd_ner_0[12]$/);
  await page.screenshot({ path: 'test-results/regi-unge-i-leran.png' });
  // utan unge_till gör regin ingenting (och då visar spelet beskrivningen)
  expect(await O(() => window.__ORDSTAVEN.regi('unge_sjunker'))).toBe(0);
  // hjälten går dit, och ungen står kvar i leran
  await O(() => { const u = window.__ORDSTAVEN.ungePos(); window.__ORDSTAVEN.gaMot(u.x, u.y - 20); });
  await page.waitForTimeout(1500);
  const u2 = await O(() => window.__ORDSTAVEN.ungePos());
  expect(Math.round(u2.x)).toBe(Math.round(u.x)); expect(Math.round(u2.y)).toBe(Math.round(u.y));
  expect(await O(() => window.__ORDSTAVEN.regi('unge_dras_upp'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeFast()), { timeout: 8000 }).toBe(false);
  expect(await O(() => window.__ORDSTAVEN.ungeDjup())).toBe(0);
  const [u3, l3] = await O(() => [window.__ORDSTAVEN.ungePos(), window.__ORDSTAVEN.ruta('leran')]);
  expect(u3.x >= l3.x && u3.x <= l3.x + l3.b && u3.y >= l3.y && u3.y <= l3.y + l3.h).toBe(false); // ute ur leran
  // byn: luftskeppet glider in, brevet rivs, och luftskeppet far mot bryggan
  await sparadI(page, 'kap-02', 'k2s02_byn');
  const hjalten = await O(() => window.__ORDSTAVEN.position());
  const kartan = JSON.parse(readFileSync(new URL('../../kartor/den-gomda-dalen/byn.tmj', import.meta.url), 'utf8')).layers.flatMap((l) => l.objects || []).find((o) => o.name === 'fjader');
  expect(await O(() => window.__ORDSTAVEN.regi('luftskepp_river_brevet'))).toBeGreaterThan(4000);
  // fjädern dalar ned nära hjälten där han står, inte där den står i kartan (75.4). Spelets klocka går
  // långsammare än väggklockan i canvas-läget (Safari, iPad), så testet väntar in den.
  await expect.poll(() => O(() => window.__ORDSTAVEN.flyttad('fjader')), { timeout: 15000 }).not.toBeNull();
  const fj = await O(() => window.__ORDSTAVEN.flyttad('fjader'));
  expect(Math.hypot(fj.x + kartan.width / 2 - hjalten.x, fj.y + kartan.height / 2 - hjalten.y)).toBeLessThan(40);
  expect(Math.hypot(kartan.x - fj.x, kartan.y - fj.y)).toBeGreaterThan(20);
  expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain('luftskeppet river brevet');
  await page.screenshot({ path: 'test-results/regi-luftskeppet-river-brevet.png' });
  expect(await O(() => window.__ORDSTAVEN.grafik().luftskepp)).toMatch(/^luftskepp_/);
});

test('vassen i gråboxen (Teknik 32 och 34, 71.3): bubblorna, halvan till handen, ungen på stocken, FLYG tar stocken i land', async ({ page }) => {
  test.setTimeout(120000);
  await sparadI(page, 'kap-02', 'k2s05_vassen');
  const O = (f, a) => page.evaluate(f, a);
  expect(await O(() => window.__ORDSTAVEN.regi('bubblor_fran_blommorna'))).toBeGreaterThan(0);
  expect(await O(() => window.__ORDSTAVEN.regi('halvan_flyger_till_handen'))).toBeGreaterThan(0);
  await page.waitForTimeout(2300);
  // han har gått till stranden efter halvan (ga_till brev_halva_vatten)
  await gaTill(page, 506, 96, (p) => p.x > 490);
  // jättehoppet: ungen landar på stocken, och stocken glider långt ut med den (72.5). Inget följer hjälten.
  const s0 = await O(() => window.__ORDSTAVEN.ruta('stock_vassen'));
  expect(await O(() => window.__ORDSTAVEN.regi('unge_hoppar_pa_stocken'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()), { timeout: 10000 }).toEqual({ foljer: false, r: 0, styrd: false });
  const u = await O(() => window.__ORDSTAVEN.ungePos());
  expect(Math.hypot(u.x - (s0.x + s0.b / 2), u.y - (s0.y + s0.h / 2))).toBeGreaterThan(60); // långt ute, mycket längre än ett hopp
  await page.screenshot({ path: 'test-results/regi-unge-pa-stocken.png' });
  expect(await O(() => window.__ORDSTAVEN.regi('unge_piper_pa_stocken'))).toBeGreaterThan(0);
  await page.waitForTimeout(2600);
  expect(await O(() => window.__ORDSTAVEN.regi('stocken_flyger_till_stranden'))).toBeGreaterThan(0);
  await page.waitForTimeout(1800);
  const u2 = await O(() => window.__ORDSTAVEN.ungePos());
  expect(Math.abs(u2.y - (s0.y + s0.h / 2 + 2))).toBeLessThan(4); // stocken är tillbaka vid stranden
  expect(await O(() => window.__ORDSTAVEN.regi('unge_hoppar_i_land'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()), { timeout: 8000 }).toBeNull();
  await page.screenshot({ path: 'test-results/regi-unge-i-land.png' });
  const regi = (await O(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['blommorna blåser bubblor', 'ungen jagar bubblor', 'halvan flyger till handen', 'ungen hoppar på stocken', 'ungen piper på stocken', 'stocken flyger till stranden', 'ungen hoppar i land']) expect(regi).toContain(r);
});

test('REP, BRO och STEGE tar också ungen i land (71.3), och SVÄRD gör staven till ett svärd (72.3)', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  for (const [ord, namn] of [['rep_till_ungen', 'repet drar in stocken'], ['bro_till_stocken', 'en bro till stocken'], ['stege_till_stocken', 'en stege till stocken']]) {
    await sparadI(page, 'kap-02', 'k2s05_vassen');
    await gaTill(page, 506, 96, (p) => p.x > 490);
    expect(await O(() => window.__ORDSTAVEN.regi('unge_hoppar_pa_stocken'))).toBeGreaterThan(0);
    await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()?.styrd), { timeout: 10000 }).toBe(false);
    expect(await O((r) => window.__ORDSTAVEN.regi(r), ord)).toBeGreaterThan(0);
    await expect.poll(() => O(() => window.__ORDSTAVEN.ungeSvavar()?.styrd), { timeout: 10000 }).toBe(false);
    if (ord !== 'rep_till_ungen') expect(await O(() => window.__ORDSTAVEN.ungeSvavar()?.foljer)).toBe(false);
    expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain(namn);
    await page.screenshot({ path: `test-results/regi-${ord}.png` });
  }
  await sparadI(page, 'kap-02', 'k2s01_kanten');
  expect(await O(() => window.__ORDSTAVEN.regi('litet_svard_kittlar_vassen'))).toBeGreaterThan(0);
  expect(await O(() => window.__ORDSTAVEN.regi('svard_hugger_genom_vassen'))).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain('staven blir ett svärd');
});

test('kvällen i byn (71.5, 71.6, 78.4): tre vedpinnar, LJUS tänder lyktorna, elden tänds, byborna står vid elden; Tant Rosa når inte tavlan (71.4)', async ({ page }) => {
  test.setTimeout(150000);
  const O = (f, a) => page.evaluate(f, a);
  const sc = las('kap-02').scener.find((s) => s.id === 'k2s10_elden');
  const vedSteg = (id) => sc.steg.findIndex((s) => s.typ === 'ga_till' && s.mal === id);
  // 78.4: en omstart efter två pinnar: de två han har plockat ligger inte kvar, den tredje gör det
  await sparadI(page, 'kap-02', 'k2s10_elden', vedSteg('ved_3'), { rumstillstand: { byn: 'kvall' } });
  await page.waitForTimeout(800);
  expect(await O(() => window.__ORDSTAVEN.rumsobjekt())).toEqual(expect.arrayContaining(['ved_3']));
  expect(await O(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => id === 'ved_1' || id === 'ved_2'))).toEqual([]);
  await sparadI(page, 'kap-02', 'k2s10_elden', 0, { visade: { byn: ['fjader', 'tant_rosa', 'brevram'] } });
  await page.waitForTimeout(800);
  const [eld, fisk] = await O(() => [window.__ORDSTAVEN.ruta('lagereld'), window.__ORDSTAVEN.ruta('fiskaren')]);
  expect(eld && fisk).toBeTruthy();
  expect(Math.hypot(fisk.x + fisk.b / 2 - (eld.x + eld.b / 2), fisk.y + fisk.h - (eld.y + eld.h / 2))).toBeLessThan(60);
  // 79.3, 80.2: kameran visar elden på udden när kvällen börjar, innan han ombeds hämta pinnar dit
  await expect.poll(async () => { const k = await O(() => window.__ORDSTAVEN.kamera()); return eld.x >= k.x && eld.x + eld.b <= k.x + 320 && eld.y >= k.y && eld.y + eld.h <= k.y + 192; }, { timeout: 5000 }).toBe(true);
  // de tre vedpinnarna syns på kvällen, inte där han står, och han plockar upp dem en i taget
  const start = await O(() => window.__ORDSTAVEN.position());
  for (const id of ['ved_1', 'ved_2', 'ved_3']) {
    const o = await O((id) => window.__ORDSTAVEN.ruta(id), id);
    expect(o).toBeTruthy();
    expect(Math.hypot(o.x + o.b / 2 - start.x, o.y + o.h / 2 - start.y)).toBeGreaterThan(40);
  }
  for (const id of ['ved_1', 'ved_2', 'ved_3']) {
    const o = await O((id) => window.__ORDSTAVEN.ruta(id), id);
    for (let i = 0; i < 80 && !(await O(() => window.__ORDSTAVEN.logg())).includes('[plockar upp] ' + id); i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await O(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [o.x + o.b / 2, o.y + o.h + 6]);
      if (i % 4 === 3 && (await O(() => window.__ORDSTAVEN.steg()))?.mal === id) await page.keyboard.press('Space');
      await page.waitForTimeout(250);
    }
    expect(await O(() => window.__ORDSTAVEN.logg())).toContain('[plockar upp] ' + id);
    // den han har plockat är borta, de andra ligger kvar
    if (id === 'ved_1') { await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/regi-vedpinnar.png' }); }
  }
  // LJUS skrivs som när han spelar: formelns effekt är regin (ljuset hoppar från staven till lyktorna)
  for (let i = 0; i < 60 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await expect(page.locator('#plattan .formel-skriv')).toBeVisible();
  // 79.3: Tant Rosa har gått till den första släckta lyktan, och kameran har glidit längs raden till honom
  expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain('Tant Rosa vid lyktorna');
  await page.keyboard.type('LJUS'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await O(() => window.__ORDSTAVEN.grafik())).regi, { timeout: 10000 }).toContain('ljuset hoppar mellan lyktorna');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'test-results/regi-lyktorna.png' }); // kameran följer ljuset ned mot udden
  // Gå till elden: han går dit, och Fiskaren tänder elden (mellanscenen elden_tands)
  await gaTill(page, 566, 312, (p) => p.y > 300 && p.x > 540);
  // repliken "Gå till elden" kan komma efter att han redan står vid elden (långsammare webbläsare i CI): då
  // väntar steget på ett tryck, som när han spelar. Testet trycker tills Fiskaren tänder elden
  for (let i = 0; i < 40 && !(await O(() => window.__ORDSTAVEN.grafik())).regi.includes('elden tänds'); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    if ((await O(() => window.__ORDSTAVEN.steg()))?.typ === 'ga_till') await page.keyboard.press('Space');
    await page.waitForTimeout(300);
  }
  await expect.poll(async () => (await O(() => window.__ORDSTAVEN.grafik())).regi, { timeout: 15000 }).toContain('elden tänds');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/regi-elden-tands.png' });
  const regi = (await O(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['ljuset hoppar mellan lyktorna', 'elden tänds']) expect(regi).toContain(r);
  await sparadI(page, 'kap-02', 'k2s08_huset');
  await page.waitForTimeout(800);
  const tavla = await O(() => window.__ORDSTAVEN.ruta(window.__ORDSTAVEN.rumsobjekt().find((id) => /tavla/.test(id))));
  if (tavla) expect(tavla.y).toBeLessThan(40); // högt uppe på väggen
  expect(await O(() => window.__ORDSTAVEN.regi('tant_rosa_nar_inte'))).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/regi-tant-rosa-nar-inte.png' });
});

test('lerpölen i vassen (72.8): han sjunker, ungen drar upp honom, och sedan går vägen runt pölen', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  await sparadI(page, 'kap-02', 'k2s05_vassen');
  const pol = await O(() => window.__ORDSTAVEN.ruta('lerpol_vassen'));
  expect(pol).toBeTruthy();
  // ungen jagar bubblorna medan han letar (72.5)
  await vantaPaRegi(page, 'ungen jagar bubblor');
  // rakt in i pölen
  for (let i = 0; i < 80 && !(await O(() => window.__ORDSTAVEN.logg())).includes('[zon]'); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await O(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [pol.x + pol.b / 2, pol.y + pol.h / 2]);
    await page.waitForTimeout(200);
  }
  await expect.poll(() => O(() => window.__ORDSTAVEN.hjalteFast()), { timeout: 5000 }).toBeGreaterThan(4);
  await page.screenshot({ path: 'test-results/regi-lerpolen.png' });
  await expect.poll(() => O(() => window.__ORDSTAVEN.hjalteFast()), { timeout: 10000 }).toBe(0);
  const ute = await O(() => window.__ORDSTAVEN.position());
  const i = (p) => p.x >= pol.x && p.x <= pol.x + pol.b && p.y >= pol.y && p.y <= pol.y + pol.h;
  expect(i(ute)).toBe(false);
  const regi = (await O(() => window.__ORDSTAVEN.grafik())).regi;
  for (const r of ['hjälten sjunker i leran', 'ungen drar upp hjälten']) expect(regi).toContain(r);
  // nu går vägen runt pölen, också när målet ligger på andra sidan
  await gaTill(page, pol.x + pol.b + 30, pol.y + pol.h / 2, (p) => p.x > pol.x + pol.b + 20);
  const zoner = (await O(() => window.__ORDSTAVEN.logg())).split('\n').filter((r) => r.includes('[zon]'));
  expect(zoner.length).toBe(1);
});

test('vassväggen (72.3, 75.3): ungen biter i vassen, och efter SVÄRD hugger han sig igenom ett fält av tussar, en gång igenom räcker', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  const vidare = async () => { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {}); };
  await sparadI(page, 'kap-02', 'k2s01_kanten');
  await vantaPaRegi(page, 'ungen biter i vass_tat');
  // SVÄRD med tangentbordet
  for (let i = 0; i < 60 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) { await vidare(); await page.waitForTimeout(250); }
  await page.keyboard.type('SV'); await O(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ä', bubbles: true }))); await page.keyboard.type('RD');
  await page.keyboard.press('Enter');
  // fältet: 15 tussar i tre rader från väster till öster, fem i varje (75.3)
  const tussar = () => O(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => id.startsWith('vass_tat_')));
  for (let i = 0; i < 60 && (await tussar()).length === 0; i++) { await vidare(); await page.waitForTimeout(250); }
  expect((await tussar()).length).toBe(15);
  const p = kap2.pussel.find((x) => x.id === 'k2_vassvaggen');
  // Stils tussar (del 3a): varje tuss har sin bild, och tussarna med ett bär har bilden med bäret
  const tussbilder = await O(() => window.__ORDSTAVEN.rumsobjekt().filter((id) => id.startsWith('vass_tat_')).map((id) => [id, window.__ORDSTAVEN.bildFor(id)]));
  for (const [id, bild] of tussbilder) expect(bild, id).toBe(p.innehall[Number(id.split('_').pop())] === 'bar' ? 'vasstuss_bar' : 'vasstuss_hel');
  await page.screenshot({ path: 'test-results/kap2-vassvaggen-tussar.png' });
  const gang = p.innehall.map((x, i) => (x === 'gang' ? `vass_tat_${i}` : null)).filter(Boolean);
  expect(gang.length).toBe(6);
  // knappen svingar alltid (76.5, B12): långt från vassen blir det ett sving i luften, och ingen tuss faller
  await O(() => window.__ORDSTAVEN.gaMot(30, 100));
  await page.waitForTimeout(1200);
  await page.keyboard.press('Space');
  await expect.poll(() => O(() => window.__ORDSTAVEN.logg()), { timeout: 3000 }).toContain('[hugg] i luften');
  expect((await tussar()).length).toBe(15);
  const hugg = async (id) => {
    const o = await O((id) => window.__ORDSTAVEN.ruta(id), id);
    if (!o) return;
    await O(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [o.x - 8, o.y + o.h / 2]);
    // vänta tills han står still där (vägen tillbaka genom gången är längre)
    let forra = null;
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); const p = await O(() => window.__ORDSTAVEN.position()); if (forra && Math.abs(p.x - forra.x) + Math.abs(p.y - forra.y) < 0.5) break; forra = p; }
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
  };
  // gången, från väster
  for (let i = 0; i < 30; i++) {
    const kvar = await O((g) => g.map((id) => window.__ORDSTAVEN.ruta(id)).filter(Boolean).sort((a, b) => a.x - b.x || a.y - b.y), gang);
    if (!kvar.length) break;
    if (i === 3) await page.screenshot({ path: 'test-results/regi-vassvaggen.png' });
    await hugg(kvar[0].id);
  }
  expect((await tussar()).length).toBe(9);
  // gången är öppen, men han kan hugga fler: en tuss med ett bär under (bar)
  const bar0 = await O(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].bar ?? 0);
  await hugg('vass_tat_1');
  expect((await tussar()).length).toBe(8);
  await expect.poll(() => O(() => window.__ORDSTAVEN.tillstand().aventyr['den-gomda-dalen'].bar ?? 0), { timeout: 3000 }).toBe(bar0 + 1);
  // han går genom gången, och berättelsen går vidare. Tussarna som står kvar står kvar
  // gången är de två mittersta raderna i söder (y ca 77–154), öster om fältet
  await O(() => window.__ORDSTAVEN.gaMot(150, 115));
  await expect.poll(() => O(() => window.__ORDSTAVEN.logg()), { timeout: 8000 }).toMatch(/gick vidare, 8 kvar/);
  await page.waitForTimeout(800);
  expect((await tussar()).length).toBe(8);
  await page.screenshot({ path: 'test-results/regi-vassvaggen-gangen.png' });
  const logg = await O(() => window.__ORDSTAVEN.logg());
  expect(logg.split('\n').filter((r) => r.includes('[hugga]') && r.includes('vass_tat_')).length).toBe(7);
});

test('leran i träskkanten (75.5): en pöl först när ungen är uppdragen, och ungen drar upp honom', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  // steget efter ga_till unge (ungen är uppdragen)
  const sc = kap2.scener.find((s) => s.id === 'k2s01_kanten');
  const efter = sc.steg.findIndex((s) => s.typ === 'ga_till' && s.mal === 'unge') + 1;
  await sparadI(page, 'kap-02', 'k2s01_kanten', efter, { rumstillstand: { trasket_kanten: 'oppen' } });
  const l = await O(() => window.__ORDSTAVEN.ruta('leran'));
  expect(l).toBeTruthy();
  for (let i = 0; i < 80 && !(await O(() => window.__ORDSTAVEN.logg())).includes('[zon] trasket_kanten/leran'); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await O(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [l.x + l.b / 2, l.y + l.h / 2]);
    await page.waitForTimeout(200);
  }
  await expect.poll(() => O(() => window.__ORDSTAVEN.hjalteFast()), { timeout: 5000 }).toBeGreaterThan(4);
  await page.screenshot({ path: 'test-results/regi-leran-kanten.png' });
  await expect.poll(() => O(() => window.__ORDSTAVEN.hjalteFast()), { timeout: 10000 }).toBe(0);
});

test('leran i träskkanten (75.5): före ungen är uppdragen är leran ingen pöl', async ({ page }) => {
  test.setTimeout(90000);
  const O = (f, a) => page.evaluate(f, a);
  const sc = kap2.scener.find((s) => s.id === 'k2s01_kanten');
  const gaTillUngen = sc.steg.findIndex((s) => s.typ === 'ga_till' && s.mal === 'unge');
  await sparadI(page, 'kap-02', 'k2s01_kanten', gaTillUngen, { rumstillstand: { trasket_kanten: 'oppen' } });
  const l = await O(() => window.__ORDSTAVEN.ruta('leran'));
  for (let i = 0; i < 12; i++) { await O(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [l.x + l.b / 2, l.y + l.h / 2]); await page.waitForTimeout(250); }
  expect(await O(() => window.__ORDSTAVEN.logg())).not.toContain('[zon] trasket_kanten/leran');
});

test('draken på taket (76.4): frivilligt efter FLYG, draken flyger ned till barnet, och vimpeln sitter på hjälmen', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  await sparadI(page, 'kap-02', 'k2s07_hela_brevet');
  await O(() => { const t = window.__ORDSTAVEN.tillstand(); t.spelare.hjalte.formler = [...new Set([...(t.spelare.hjalte.formler || []), 'FLYG'])]; });
  const d = await O(() => window.__ORDSTAVEN.ruta('drake_tak'));
  expect(d).toBeTruthy();
  for (let i = 0; i < 80 && !(await page.locator('#plattan .formel-skriv').isVisible()); i++) {
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await O(([x, y]) => window.__ORDSTAVEN.gaMot(x, y), [d.x + d.b / 2, d.y + d.h + 48]);
    await page.waitForTimeout(300);
    if (i % 3 === 2) await page.keyboard.press('Space');
  }
  await expect(page.locator('#plattan .formel-skriv')).toBeVisible();
  await page.screenshot({ path: 'test-results/regi-draken-formel.png' });
  await page.keyboard.type('FLYG'); await page.keyboard.press('Enter');
  await vantaPaRegi(page, 'draken flyger ned till barnet');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/regi-draken-nere.png' });
  await expect.poll(() => O(() => window.__ORDSTAVEN.tillstand().spelare.hjalte.lager?.hjalmdekor), { timeout: 15000 }).toBe('drakvimpel');
  await expect.poll(() => O(() => window.__ORDSTAVEN.rumsobjekt()), { timeout: 10000 }).not.toContain('drake_tak');
});


test('husen på torget (77.4): fyra dörrar, fel dörr öppnas aldrig, och vid den rosa dörren på det lilla huset kommer Tant Rosa ut', async ({ page }) => {
  test.setTimeout(120000);
  const O = (f, a) => page.evaluate(f, a);
  const sc = kap2.scener.find((s) => s.id === 'k2s02_byn');
  const steg = sc.steg.findIndex((s) => s.typ === 'pussel' && s.pussel_id === 'k2_husen');
  await sparadI(page, 'kap-02', 'k2s02_byn', steg, { visade: { byn: ['fjader'] } });
  // 80.4: alla fyra dörrarna står i fasaden mot söder, och kameran visar dem innan Farfars lapp öppnas
  const dorrar = ['dorr_rosa', 'dorr_litet_bla', 'dorr_stort_rosa', 'dorr_stort_bla'];
  const dorrarSyns = () => O((ids) => { const c = document.querySelector('canvas').getBoundingClientRect(); return ids.filter((id) => { const r = window.__ORDSTAVEN.rutaPaSkarm(id); return r && r.x >= c.left - 1 && r.y >= c.top - 1 && r.x + r.b <= c.right + 1 && r.y + r.h <= c.bottom + 1; }); }, dorrar);
  let vidLappen = null;
  for (let i = 0; i < 60 && !(await O(() => window.__ORDSTAVEN.variant())); i++) {
    if (!vidLappen && (await page.locator('#plattan:not([hidden]) .lapp, #tanke:not([hidden]) .moln-text').count())) vidLappen = await dorrarSyns();
    for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  // på iPad i CI går spelets klocka långsammare, och kameran glider längre: vänta på lappen i upp till 15 s
  for (let i = 0; i < 100 && !vidLappen; i++) { if (await page.locator('#plattan:not([hidden]) .lapp, #tanke:not([hidden]) .moln-text').count()) vidLappen = await dorrarSyns(); else await page.waitForTimeout(150); }
  expect(vidLappen?.sort()).toEqual([...dorrar].sort());
  for (const d of dorrar) { const o = await O((id) => window.__ORDSTAVEN.ruta(id), d); expect(o.riktning, d).toBe('upp'); }
  expect(await O(() => window.__ORDSTAVEN.variant())).toBe('L3');
  for (let i = 0; i < 10; i++) { for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(150); }
  const ids = await O(() => window.__ORDSTAVEN.rumsobjekt());
  for (const d of ['dorr_rosa', 'dorr_litet_bla', 'dorr_stort_rosa', 'dorr_stort_bla']) expect(ids).toContain(d);
  expect(ids).not.toContain('tant_rosa'); // hon syns först när dörren går upp (63.6)
  const genom = async (id) => {
    for (let i = 0; i < 20; i++) {
      for (const v of await page.locator('#plattan:not([hidden]) :is(.vidare, .replik-ruta)').all()) await v.click({ timeout: 300 }).catch(() => {});
      await O((id) => { const o = window.__ORDSTAVEN.ruta(id); window.__ORDSTAVEN.gaMot(o.x + o.b / 2, o.y + o.h / 2); }, id);
      await page.waitForTimeout(300);
      if ((await O(() => window.__ORDSTAVEN.logg())).includes(`[val] k2_husen: ${id === 'dorr_rosa' ? 'litet_rosa' : id === 'dorr_stort_bla' ? 'stort_bla' : ''}`)) return;
    }
  };
  await page.screenshot({ path: 'test-results/regi-husen.png' });
  await genom('dorr_stort_bla');
  await expect.poll(() => O(() => window.__ORDSTAVEN.logg()), { timeout: 10000 }).toMatch(/k2_husen: stort_bla/);
  await genom('dorr_rosa');
  await expect.poll(() => O(() => window.__ORDSTAVEN.rumsobjekt()), { timeout: 15000 }).toContain('tant_rosa');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/regi-husen-tant-rosa.png' });
});
